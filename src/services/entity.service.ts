import axios from 'axios';
import { EntitySchema, JsonSchema, StructureAnalysis, Mapping, OutputConfiguration, UpsertConfiguration, ChangeEventConfiguration, OutputSchemaSource, SchemaVersion, UniquenessConstraint } from '../types';
import { JsonSchemaGenerator } from '../utils/json-schema-generator';
import { DataStore } from '../storage/data-store';
import { MappingService } from './mapping.service';

export class EntityService {
  private schemaGenerator: JsonSchemaGenerator;
  private dataStore: DataStore;
  private mappingService: MappingService;

  constructor() {
    this.schemaGenerator = new JsonSchemaGenerator();
    this.dataStore = new DataStore('./data/entities');
    this.mappingService = new MappingService();
  }

  async generateFromSample(
    samplePayload: any, 
    entityName: string, 
    description?: string, 
    outputSchema?: any, 
    outputConfig?: any, 
    options?: {
      abstracted?: boolean, 
      schemaFormat?: 'json' | 'yaml',
      inboundAbstracted?: boolean,
      outboundAbstracted?: boolean
    }
  ): Promise<EntitySchema> {
    // Analyze payload structure
    const structure = this.analyzeStructure(samplePayload);
    
    // Generate JSON Schema
    const jsonSchema = this.schemaGenerator.generate(samplePayload);
    
    // Create entity schema
    const entitySchema: EntitySchema = {
      id: this.generateId(),
      name: entityName,
      description,
      abstracted: options?.abstracted,
      schemaFormat: options?.schemaFormat || 'json',
      inboundAbstracted: options?.inboundAbstracted || false,
      outboundAbstracted: options?.outboundAbstracted || false,
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      inboundSchema: jsonSchema,
      outboundSchema: outputSchema || this.generateDefaultOutboundSchema(entityName),
      outputConfig: outputConfig || this.generateDefaultOutputConfig(entityName),
      metadata: {
        source: 'sample_payload',
        sampleData: samplePayload,
        structureAnalysis: structure
      }
    };

    return entitySchema;
  }

  async generateFromAPIResponse(
    response: any, 
    entityName: string, 
    options?: {
      schemaFormat?: 'json' | 'yaml',
      inboundAbstracted?: boolean,
      outboundAbstracted?: boolean
    }
  ): Promise<EntitySchema> {
    // Extract schema from API response
    const responseSchema = this.schemaGenerator.generate(response);
    
    return {
      id: this.generateId(),
      name: entityName,
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      inboundSchema: responseSchema,
      outboundSchema: this.generateDefaultOutboundSchema(entityName),
      schemaFormat: options?.schemaFormat || 'json',
      inboundAbstracted: options?.inboundAbstracted || false,
      outboundAbstracted: options?.outboundAbstracted || false,
      metadata: {
        source: 'api_import',
        sampleData: response
      }
    };
  }

  async callExternalAPI(config: {
    endpoint: string;
    method: string;
    headers?: any;
    body?: any;
  }): Promise<any> {
    try {
      const response = await axios({
        url: config.endpoint,
        method: config.method || 'GET',
        headers: config.headers || {},
        data: config.body
      });

      return response;
    } catch (error) {
      console.error('Error calling external API:', error);
      throw error;
    }
  }

  async save(entity: EntitySchema): Promise<EntitySchema> {
    // Validate abstracted model constraints
    if (entity.isAbstractedModel) {
      const validation = await this.validateAbstractedModel(entity);
      if (!validation.valid) {
        throw new Error(`Abstracted model validation failed: ${validation.errors.join(', ')}`);
      }
    }
    
    return this.dataStore.save(entity);
  }

  async update(id: string, updates: Partial<EntitySchema>): Promise<EntitySchema> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Entity ${id} not found`);
    }

    const updated: EntitySchema = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };

    // Validate abstracted model constraints if applicable
    if (updated.isAbstractedModel) {
      const validation = await this.validateAbstractedModel(updated);
      if (!validation.valid) {
        throw new Error(`Abstracted model validation failed: ${validation.errors.join(', ')}`);
      }
    }

    return this.dataStore.save(updated);
  }

  async getById(id: string): Promise<EntitySchema | null> {
    return this.dataStore.get<EntitySchema>(id);
  }

  async list(): Promise<EntitySchema[]> {
    return this.dataStore.list<EntitySchema>();
  }

  async delete(id: string): Promise<boolean> {
    return this.dataStore.delete(id);
  }

  async testTransformation(
    entity: EntitySchema,
    mappings: Mapping[],
    inputData: any
  ): Promise<any> {
    const output: any = {};

    // Apply each mapping
    for (const mapping of mappings) {
      if (mapping.active) {
        try {
          const value = await this.mappingService.applyMapping(inputData, mapping);
          this.setNestedValue(output, mapping.target, value);
        } catch (error) {
          console.error(`Error applying mapping ${mapping.id}:`, error);
        }
      }
    }

    return {
      input: inputData,
      output,
      appliedMappings: mappings.filter(m => m.active).length,
      entity: entity.name
    };
  }

  private analyzeStructure(data: any, depth: number = 0): StructureAnalysis {
    const analysis: StructureAnalysis = {
      depth: 0,
      fieldCount: 0,
      arrayFields: [],
      nestedObjects: [],
      dataTypes: {}
    };

    const analyze = (obj: any, path: string = '', currentDepth: number = 0) => {
      if (currentDepth > analysis.depth) {
        analysis.depth = currentDepth;
      }

      for (const [key, value] of Object.entries(obj)) {
        const fullPath = path ? `${path}.${key}` : key;
        analysis.fieldCount++;
        analysis.dataTypes[fullPath] = this.getType(value);

        if (Array.isArray(value)) {
          analysis.arrayFields.push(fullPath);
          if (value.length > 0) {
            analyze(value[0], fullPath, currentDepth + 1);
          }
        } else if (typeof value === 'object' && value !== null) {
          analysis.nestedObjects.push(fullPath);
          analyze(value, fullPath, currentDepth + 1);
        }
      }
    };

    analyze(data);
    return analysis;
  }

  private generateDefaultOutboundSchema(entityName: string): JsonSchema {
    return {
      type: 'object',
      properties: {
        id: { type: 'string' },
        entityType: { type: 'string', enum: [entityName] },
        processedAt: { type: 'string', format: 'date-time' },
        correlationId: { type: 'string' },
        data: { type: 'object' }
      },
      required: ['id', 'entityType', 'processedAt', 'data']
    };
  }

  private generateDefaultOutputConfig(entityName: string): OutputConfiguration {
    return {
      upsertConfig: {
        enabled: false,
        uniqueFields: [],
        conflictResolution: 'update'
      },
      changeEventConfig: {
        enabled: false,
        eventType: `${entityName}Changed`,
        includeOldValues: true,
        includeMetadata: true
      }
    };
  }

  private getType(value: any): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  private generateId(): string {
    return `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  // Bulk operations
  async importOutputSchema(config: {
    endpoint: string;
    method: string;
    headers?: any;
    body?: any;
  }): Promise<{ schema: JsonSchema }> {
    try {
      const response = await this.callExternalAPI(config);
      
      // Analyze response to generate schema
      const schema = this.schemaGenerator.generate(response.data);
      
      return { schema };
    } catch (error) {
      console.error('Error importing output schema:', error);
      throw error;
    }
  }

  async generateWithUpsert(
    entity: EntitySchema,
    mappings: Mapping[],
    inputData: any,
    existingData?: any
  ): Promise<any> {
    const output = await this.testTransformation(entity, mappings, inputData);
    
    if (entity.outputConfig?.upsertConfig?.enabled && existingData) {
      const upsertConfig = entity.outputConfig.upsertConfig;
      
      // Process uniqueFields to handle array items
      // If a field uses the [] notation to reference array items,
      // we need to handle it specially for record existence check
      console.log('Checking record existence with unique fields:', upsertConfig.uniqueFields);
      
      // Check if record exists based on unique fields
      const exists = this.checkRecordExists(output.output, existingData, upsertConfig.uniqueFields);
      
      if (exists) {
        // When conflict is found, handle according to configuration
        switch (upsertConfig.conflictResolution) {
          case 'update':
            return { ...existingData, ...output.output, _operation: 'update' };
          case 'merge':
            // Deep merge for nested structures including arrays
            return { 
              ...this.deepMerge(existingData, output.output, upsertConfig.mergeStrategy || 'shallow'),
              _operation: 'merge' 
            };
          case 'skip':
            return { ...existingData, _operation: 'skip' };
          case 'error':
            throw new Error('Record already exists');
          default:
            return output.output;
        }
      }
    }
    
    return { ...output.output, _operation: 'insert' };
  }
  
  // Helper for merging objects during upsert
  private deepMerge(target: any, source: any, strategy: 'shallow' | 'deep' = 'shallow'): any {
    // For shallow merge, just combine top-level properties
    if (strategy === 'shallow') {
      return { ...target, ...source };
    }
    
    // For deep merge, recursively combine nested objects and arrays
    const output = { ...target };
    
    if (source && typeof source === 'object' && !Array.isArray(source)) {
      Object.keys(source).forEach(key => {
        if (source[key] && typeof source[key] === 'object') {
          if (key in target) {
            output[key] = this.deepMerge(target[key], source[key], strategy);
          } else {
            output[key] = source[key];
          }
        } else {
          output[key] = source[key];
        }
      });
    }
    
    return output;
  }

  async generateChangeEvent(
    entity: EntitySchema,
    oldData: any,
    newData: any,
    operation: string
  ): Promise<any> {
    if (!entity.outputConfig?.changeEventConfig?.enabled) {
      return null;
    }
    
    const config = entity.outputConfig.changeEventConfig;
    
    const event: any = {
      eventType: config.eventType,
      timestamp: new Date().toISOString(),
      operation,
      entityId: entity.id,
      entityName: entity.name
    };
    
    if (config.includeOldValues && oldData) {
      event.oldValues = oldData;
    }
    
    event.newValues = newData;
    
    if (config.includeMetadata) {
      event.metadata = {
        correlationId: newData.correlationId || this.generateId(),
        version: entity.version,
        source: 'json-mapper'
      };
    }
    
    if (config.customProperties) {
      event.customProperties = config.customProperties;
    }
    
    return event;
  }

  private checkRecordExists(newData: any, existingData: any[], uniqueFields: string[]): boolean {
    if (!existingData || existingData.length === 0) {
      return false;
    }
    
    return existingData.some(record => {
      return uniqueFields.every(field => {
        const newValue = this.getNestedValue(newData, field);
        const existingValue = this.getNestedValue(record, field);
        
        // Handle array cases (could be array of objects with unique identifiers)
        if (Array.isArray(newValue) && Array.isArray(existingValue)) {
          // For arrays, we check if they contain matching items based on identifier fields
          // This handles the case where arrays might have the same items but in different order
          if (newValue.length !== existingValue.length) return false;
          
          // For arrays of objects, we need special handling
          if (newValue.length > 0 && typeof newValue[0] === 'object') {
            const isMatch = this.compareArraysOfObjects(newValue, existingValue);
            return isMatch;
          }
          
          // For arrays of primitives, simple check
          return JSON.stringify(newValue.sort()) === JSON.stringify(existingValue.sort());
        }
        
        // Handle object comparison
        if (typeof newValue === 'object' && typeof existingValue === 'object' &&
            newValue !== null && existingValue !== null &&
            !Array.isArray(newValue) && !Array.isArray(existingValue)) {
          return JSON.stringify(newValue) === JSON.stringify(existingValue);
        }
        
        // Handle primitive values
        return newValue === existingValue;
      });
    });
  }
  
  private compareArraysOfObjects(arr1: any[], arr2: any[]): boolean {
    // This is a simple implementation that might need to be extended
    // depending on the specific uniqueness requirements
    // Here we assume objects in arrays are considered equal if all their properties match
    
    if (arr1.length !== arr2.length) return false;
    
    // Sort arrays (non-mutating) to ensure order doesn't affect comparison
    const sorted1 = [...arr1].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    const sorted2 = [...arr2].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    
    for (let i = 0; i < sorted1.length; i++) {
      if (JSON.stringify(sorted1[i]) !== JSON.stringify(sorted2[i])) {
        return false;
      }
    }
    
    return true;
  }

  private getNestedValue(obj: any, path: string): any {
    if (!obj || !path) return undefined;
  
    // Handle array notation in path
    if (path.includes('[]')) {
      const [arrayPath, ...rest] = path.split('[]');
      const remainingPath = rest.join('[]');
      
      // Get the array
      let arrayValue;
      if (arrayPath === '') {
        // Root is array
        arrayValue = obj;
      } else {
        const keys = arrayPath.split('.');
        let current = obj;
        
        for (const key of keys) {
          if (current === null || current === undefined) return undefined;
          current = current[key];
        }
        
        arrayValue = current;
      }
      
      // Return the array itself if that's what we're looking for
      if (!remainingPath || remainingPath === '') return arrayValue;
      
      // Otherwise, we need to get a property from each array item
      if (Array.isArray(arrayValue)) {
        // For uniqueness checking, we return array of values from each item
        const itemPath = remainingPath.startsWith('.') ? 
          remainingPath.substring(1) : remainingPath;
          
        return arrayValue.map(item => this.getNestedValue(item, itemPath));
      }
      
      return undefined;
    }
    
    // Handle regular dot notation
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined) return undefined;
      current = current[key];
    }
    
    return current;
  }

  async fetchOutputSchemaFromAPI(entityId: string, config: OutputSchemaSource): Promise<JsonSchema> {
    try {
      const response = await axios({
        url: config.endpoint!,
        method: 'GET',
        headers: config.headers || {},
        timeout: 30000
      });

      let schemaData = response.data;
      
      // Extract schema from response if path is specified
      if (config.schemaPath) {
        const pathParts = config.schemaPath.split('.');
        for (const part of pathParts) {
          schemaData = schemaData[part];
          if (!schemaData) {
            throw new Error(`Schema path ${config.schemaPath} not found in response`);
          }
        }
      }

      // Generate schema if response is sample data
      const schema = schemaData.type ? schemaData : this.schemaGenerator.generate(schemaData);
      
      // Update entity with fetched schema
      const entity = await this.getById(entityId);
      if (entity) {
        await this.update(entityId, {
          outboundSchema: schema,
          outputConfig: {
            ...entity.outputConfig,
            schemaSource: {
              ...config,
              lastFetched: new Date().toISOString()
            }
          }
        });
      }

      return schema;
    } catch (error) {
      console.error('Error fetching output schema from API:', error);
      throw error;
    }
  }

  async refreshOutputSchema(entityId: string): Promise<JsonSchema> {
    const entity = await this.getById(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    const schemaSource = entity.outputConfig?.schemaSource;
    if (!schemaSource || schemaSource.type !== 'api') {
      throw new Error('Entity does not have an API schema source configured');
    }

    return this.fetchOutputSchemaFromAPI(entityId, schemaSource);
  }

  async updateOutputSchema(entityId: string, schema: JsonSchema): Promise<EntitySchema> {
    const entity = await this.getById(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    // Version the old schema
    const schemaHistory = entity.metadata?.schemaHistory || [];
    schemaHistory.push({
      schema: entity.outboundSchema,
      timestamp: new Date().toISOString(),
      version: entity.version
    });

    // Increment version
    const versionParts = entity.version.split('.');
    versionParts[2] = (parseInt(versionParts[2]) + 1).toString();
    const newVersion = versionParts.join('.');

    return this.update(entityId, {
      outboundSchema: schema,
      version: newVersion,
      metadata: {
        source: entity.metadata?.source || 'sample_payload',
        sampleData: entity.metadata?.sampleData,
        structureAnalysis: entity.metadata?.structureAnalysis,
        schemaHistory,
        outputSource: {
          type: 'manual'
        },
        uniquenessConstraints: entity.metadata?.uniquenessConstraints
      }
    });
  }

  async getSchemaVersions(entityId: string): Promise<any[]> {
    const entity = await this.getById(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    const versions = entity.metadata?.schemaHistory || [];
    
    // Add current version
    versions.push({
      schema: entity.outboundSchema,
      timestamp: entity.updatedAt || entity.createdAt,
      version: entity.version,
      current: true
    });

    return versions.sort((a: SchemaVersion, b: SchemaVersion) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async updateUpsertConfig(entityId: string, config: UpsertConfiguration): Promise<EntitySchema> {
    const entity = await this.getById(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    return this.update(entityId, {
      outputConfig: {
        ...entity.outputConfig,
        upsertConfig: config
      }
    });
  }

  async updateChangeEventConfig(entityId: string, config: ChangeEventConfiguration): Promise<EntitySchema> {
    const entity = await this.getById(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    return this.update(entityId, {
      outputConfig: {
        ...entity.outputConfig,
        changeEventConfig: config
      }
    });
  }

  async validateUpsertFields(entityId: string, fields: string[]): Promise<{ valid: boolean; errors: string[] }> {
    const entity = await this.getById(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    const errors: string[] = [];
    const schemaFields = this.extractSchemaFields(entity.outboundSchema);
    
    console.log('Available schema fields for upsert validation:', schemaFields);

    for (const field of fields) {
      // Check if this is a nested array path using our extended syntax
      // Allow fields that match array item paths (with [] notation)
      const isValid = schemaFields.some(schemaField => {
        // Direct match
        if (schemaField === field) return true;
        
        // Support for array items in unique fields
        // Example: if field is TradeLines[].LineID and schema has TradeLines[].LineID
        if (field.includes('[]') && schemaField.startsWith(field.split('[]')[0])) {
          return true;
        }
        
        return false;
      });
      
      if (!isValid) {
        errors.push(`Field '${field}' not found in output schema`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async validateAbstractedModel(entity: EntitySchema): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate isAbstractedModel
    if (entity.isAbstractedModel) {
      // Check if at least one uniqueness constraint is defined
      const constraints = entity.metadata?.uniquenessConstraints || [];
      if (constraints.length === 0) {
        errors.push('At least one uniqueness constraint must be defined for abstracted models');
      }

      // Validate each constraint
      for (const constraint of constraints) {
        if (!constraint.fields || constraint.fields.length === 0) {
          errors.push(`Uniqueness constraint '${constraint.name}' must have at least one field`);
        }

        // Verify fields exist in the schema
        const schemaFields = this.extractSchemaFields(entity.inboundSchema);
        for (const field of constraint.fields || []) {
          if (!schemaFields.includes(field)) {
            errors.push(`Field '${field}' in constraint '${constraint.name}' not found in schema`);
          }
        }
      }
    }

    // Validate inboundAbstracted flag
    if (entity.inboundAbstracted) {
      // Check if the inbound schema has proper identifiers or references
      if (!entity.inboundSchema.properties || Object.keys(entity.inboundSchema.properties).length === 0) {
        errors.push('Inbound schema must have properties defined when marked as abstracted');
      }
    }

    // Validate outboundAbstracted flag
    if (entity.outboundAbstracted) {
      // Check if the outbound schema has proper identifiers or references
      if (!entity.outboundSchema.properties || Object.keys(entity.outboundSchema.properties).length === 0) {
        errors.push('Outbound schema must have properties defined when marked as abstracted');
      }
      
      // Ensure there's at least one identifier field
      const hasIdentifierField = entity.outboundSchema.properties && 
        (entity.outboundSchema.properties.id || entity.outboundSchema.properties.entityId);
      
      if (!hasIdentifierField) {
        errors.push('Outbound schema must have an identifier field (id or entityId) when marked as abstracted');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async addUniquenessConstraint(entityId: string, constraint: Omit<UniquenessConstraint, 'id' | 'createdAt' | 'updatedAt'>): Promise<EntitySchema> {
    const entity = await this.getById(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    const newConstraint: UniquenessConstraint = {
      ...constraint,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const constraints = entity.metadata?.uniquenessConstraints || [];
    constraints.push(newConstraint);

    return this.update(entityId, {
      metadata: {
        source: entity.metadata?.source || 'sample_payload',
        sampleData: entity.metadata?.sampleData,
        structureAnalysis: entity.metadata?.structureAnalysis,
        schemaHistory: entity.metadata?.schemaHistory,
        outputSource: entity.metadata?.outputSource,
        uniquenessConstraints: constraints
      }
    });
  }

  async removeUniquenessConstraint(entityId: string, constraintId: string): Promise<EntitySchema> {
    const entity = await this.getById(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    const constraints = entity.metadata?.uniquenessConstraints || [];
    const filtered = constraints.filter(c => c.id !== constraintId);

    // Ensure at least one constraint remains for abstracted models
    if (entity.isAbstractedModel && filtered.length === 0) {
      throw new Error('Cannot remove last uniqueness constraint from abstracted model');
    }

    return this.update(entityId, {
      metadata: {
        source: entity.metadata?.source || 'sample_payload',
        sampleData: entity.metadata?.sampleData,
        structureAnalysis: entity.metadata?.structureAnalysis,
        schemaHistory: entity.metadata?.schemaHistory,
        outputSource: entity.metadata?.outputSource,
        uniquenessConstraints: filtered
      }
    });
  }

  async getAbstractedModels(): Promise<EntitySchema[]> {
    const allEntities = await this.list();
    return allEntities.filter(entity => entity.isAbstractedModel);
  }

  async setAsAbstractedModel(entityId: string, constraints: Omit<UniquenessConstraint, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<EntitySchema> {
    if (!constraints || constraints.length === 0) {
      throw new Error('At least one uniqueness constraint must be provided for abstracted models');
    }

    const entity = await this.getById(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    const newConstraints: UniquenessConstraint[] = constraints.map(c => ({
      ...c,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    return this.update(entityId, {
      isAbstractedModel: true,
      metadata: {
        source: entity.metadata?.source || 'sample_payload',
        sampleData: entity.metadata?.sampleData,
        structureAnalysis: entity.metadata?.structureAnalysis,
        schemaHistory: entity.metadata?.schemaHistory,
        outputSource: entity.metadata?.outputSource,
        uniquenessConstraints: newConstraints
      }
    });
  }

  private extractSchemaFields(schema: JsonSchema, prefix: string = ''): string[] {
    const fields: string[] = [];

    if (!schema || !schema.type) return fields;

    if (schema.type === 'object' && schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        fields.push(fullPath);

        if ((prop as JsonSchema).type === 'object') {
          fields.push(...this.extractSchemaFields(prop as JsonSchema, fullPath));
        } 
        else if ((prop as JsonSchema).type === 'array' && (prop as JsonSchema).items) {
          // Add the array itself
          // For array items, use the [] notation to indicate array elements
          const arrayItemPath = `${fullPath}[]`;
          
          // Extract schema fields from array items
          const itemSchemaFields = this.extractSchemaFields((prop as JsonSchema).items as JsonSchema, arrayItemPath);
          fields.push(...itemSchemaFields);
        }
      }
    } 
    else if (schema.type === 'array' && schema.items) {
      // For root array
      const arrayItemPath = prefix ? `${prefix}[]` : '[]';
      fields.push(...this.extractSchemaFields(schema.items as JsonSchema, arrayItemPath));
    }

    return fields;
  }

  async importEntities(data: any): Promise<EntitySchema[]> {
    const imported: EntitySchema[] = [];

    if (data.entities && Array.isArray(data.entities)) {
      for (const item of data.entities) {
        const entity = await this.save(item.entity);
        
        if (item.mappings) {
          for (const mapping of item.mappings) {
            await this.mappingService.create({
              ...mapping,
              entityId: entity.id
            });
          }
        }
        
        imported.push(entity);
      }
    }

    return imported;
  }

  /**
   * Link entities together using abstracted schemas
   * @param sourceEntityId The source entity ID
   * @param targetEntityId The target entity ID
   * @param direction Whether to link inbound or outbound schema
   * @param linkType Type of link (reference or inheritance)
   * @param mappingId Optional mapping ID for reference links
   */
  async linkEntities(
    sourceEntityId: string, 
    targetEntityId: string, 
    direction: 'inbound' | 'outbound',
    linkType: 'reference' | 'inheritance',
    mappingId?: string
  ): Promise<EntitySchema> {
    // Validate source entity
    const sourceEntity = await this.getById(sourceEntityId);
    if (!sourceEntity) {
      throw new Error(`Source entity ${sourceEntityId} not found`);
    }

    // Validate target entity
    const targetEntity = await this.getById(targetEntityId);
    if (!targetEntity) {
      throw new Error(`Target entity ${targetEntityId} not found`);
    }

    // Validate target is abstracted properly
    if (direction === 'inbound' && !targetEntity.inboundAbstracted) {
      throw new Error('Target entity inbound schema is not marked as abstracted');
    }
    if (direction === 'outbound' && !targetEntity.outboundAbstracted) {
      throw new Error('Target entity outbound schema is not marked as abstracted');
    }

    // Create or update linked entities array
    const linkedEntities = sourceEntity.metadata?.linkedEntities || [];
    
    // Check if link already exists
    const existingLinkIndex = linkedEntities.findIndex(
      link => link.entityId === targetEntityId && link.direction === direction
    );
    
    if (existingLinkIndex >= 0) {
      // Update existing link
      linkedEntities[existingLinkIndex] = {
        entityId: targetEntityId,
        direction,
        linkType,
        mappingId
      };
    } else {
      // Add new link
      linkedEntities.push({
        entityId: targetEntityId,
        direction,
        linkType,
        mappingId
      });
    }

    // Get existing metadata or create default
    const metadata = sourceEntity.metadata || {
      source: 'user_defined'
    };

    // Update source entity
    return this.update(sourceEntityId, {
      metadata: {
        ...metadata,
        linkedEntities
      }
    });
  }

  /**
   * Remove a link between entities
   * @param sourceEntityId The source entity ID
   * @param targetEntityId The target entity ID
   * @param direction The link direction
   */
  async unlinkEntities(
    sourceEntityId: string,
    targetEntityId: string,
    direction: 'inbound' | 'outbound'
  ): Promise<EntitySchema> {
    // Validate source entity
    const sourceEntity = await this.getById(sourceEntityId);
    if (!sourceEntity) {
      throw new Error(`Source entity ${sourceEntityId} not found`);
    }

    // Get linked entities
    const linkedEntities = sourceEntity.metadata?.linkedEntities || [];
    
    // Filter out the link to remove
    const updatedLinks = linkedEntities.filter(
      link => !(link.entityId === targetEntityId && link.direction === direction)
    );

    // Get existing metadata or create default
    const metadata = sourceEntity.metadata || {
      source: 'user_defined'
    };

    // Update source entity
    return this.update(sourceEntityId, {
      metadata: {
        ...metadata,
        linkedEntities: updatedLinks
      }
    });
  }

  /**
   * Get all entities that are linked to a specific entity
   * @param entityId The entity ID
   * @param direction Optional direction filter
   */
  async getLinkedEntities(
    entityId: string,
    direction?: 'inbound' | 'outbound'
  ): Promise<Array<{ entity: EntitySchema, linkInfo: any }>> {
    // Validate entity
    const entity = await this.getById(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    const linkedEntities = entity.metadata?.linkedEntities || [];
    const result = [];

    // Filter by direction if specified
    const filteredLinks = direction 
      ? linkedEntities.filter(link => link.direction === direction)
      : linkedEntities;

    // Get detailed info for each linked entity
    for (const link of filteredLinks) {
      const linkedEntity = await this.getById(link.entityId);
      if (linkedEntity) {
        result.push({
          entity: linkedEntity,
          linkInfo: link
        });
      }
    }

    return result;
  }
}
