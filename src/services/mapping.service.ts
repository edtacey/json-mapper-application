import { Mapping, EntitySchema, BrokenMapping, MappingChanges, TransformationType, Field, ChangeEvent } from '../types';
import { DataStore } from '../storage/data-store';
import { MappingValidator } from '../utils/mapping-validator';
import { ValueMappingService } from './value-mapping.service';
import { EventPublisherService } from './event-publisher.service';
import * as jsonpath from 'jsonpath';

export class MappingService {
  private dataStore: DataStore;
  private validator: MappingValidator;
  private valueMappingService: ValueMappingService;
  private eventPublisher: EventPublisherService;

  constructor() {
    this.dataStore = new DataStore('./data/mappings');
    this.validator = new MappingValidator();
    this.valueMappingService = new ValueMappingService();
    this.eventPublisher = new EventPublisherService();
  }

  async create(mapping: Omit<Mapping, 'id' | 'createdAt'>): Promise<Mapping> {
    const newMapping: Mapping = {
      ...mapping,
      id: this.generateId(),
      createdAt: new Date().toISOString()
    };

    await this.dataStore.save(newMapping);
    return newMapping;
  }

  async update(id: string, updates: Partial<Mapping>): Promise<Mapping> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Mapping ${id} not found`);
    }

    const updated: Mapping = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };

    await this.dataStore.save(updated);
    return updated;
  }

  async getById(id: string): Promise<Mapping | null> {
    return this.dataStore.get<Mapping>(id);
  }

  async getByEntityId(entityId: string): Promise<Mapping[]> {
    const all = await this.dataStore.list<Mapping>();
    return all.filter(m => m.entityId === entityId);
  }

  async delete(id: string): Promise<boolean> {
    return this.dataStore.delete(id);
  }

  async generateDefaultMappings(entity: EntitySchema): Promise<Mapping[]> {
    const mappings: Mapping[] = [];
    const inboundFields = this.extractFields(entity.inboundSchema);
    const outboundFields = this.extractFields(entity.outboundSchema);

    // Create default mappings for matching field names
    for (const inField of inboundFields) {
      const matchingOutField = outboundFields.find(
        f => this.isFieldMatch(inField, f)
      );

      if (matchingOutField) {
        mappings.push({
          id: this.generateId(),
          entityId: entity.id,
          source: inField.path,
          target: matchingOutField.path,
          transformation: 'direct',
          active: true,
          createdAt: new Date().toISOString()
        });
      }
    }

    // Add system fields
    mappings.push(
      {
        id: this.generateId(),
        entityId: entity.id,
        source: '_system.timestamp',
        target: 'processedAt',
        transformation: 'function',
        customFunction: '() => new Date().toISOString()',
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: this.generateId(),
        entityId: entity.id,
        source: '_system.entityName',
        target: 'eventType',
        transformation: 'template',
        template: '${entityName}Processed',
        active: true,
        createdAt: new Date().toISOString()
      }
    );

    return mappings;
  }

  async applyMapping(sourceData: any, mapping: Mapping): Promise<any> {
    try {
      let value = this.extractValue(sourceData, mapping.source);

      switch (mapping.transformation) {
        case 'direct':
          return value;
          
        case 'template':
          return this.applyTemplate(value, mapping.template || '', sourceData);
          
        case 'function':
          return this.applyCustomFunction(value, mapping.customFunction || '', sourceData);
          
        case 'lookup':
          return this.applyLookup(value, mapping);
          
        case 'aggregate':
          return this.applyAggregation(value, mapping);
          
        case 'conditional':
          return this.applyConditional(value, mapping);
          
        case 'value-mapping':
          if (mapping.valueMapId) {
            const result = await this.valueMappingService.mapValue(value, mapping.valueMapId);
            return result.value;
          }
          return value;
          
        default:
          return value;
      }
    } catch (error) {
      console.error(`Error applying mapping ${mapping.id}:`, error);
      throw error;
    }
  }

  async validateMappings(mappings: Mapping[], entity: EntitySchema): Promise<BrokenMapping[]> {
    const brokenMappings: BrokenMapping[] = [];

    for (const mapping of mappings) {
      const validation = await this.validator.validate(mapping, entity);
      
      if (!validation.isValid) {
        brokenMappings.push({
          mapping,
          errors: validation.errors,
          suggestions: validation.suggestions
        });
      }

      // Validate value mapping if present
      if (mapping.transformation === 'value-mapping' && mapping.valueMapId) {
        const valueMapping = await this.valueMappingService.getById(mapping.valueMapId);
        if (!valueMapping) {
          brokenMappings.push({
            mapping,
            errors: [`Value mapping ${mapping.valueMapId} not found`],
            suggestions: ['Create or update the value mapping reference']
          });
        }
      }
    }

    return brokenMappings;
  }

  diffMappings(current: Mapping[], updated: Mapping[]): MappingChanges {
    return {
      added: updated.filter(u => !current.find(c => c.id === u.id)),
      modified: updated.filter(u => {
        const currentMapping = current.find(c => c.id === u.id);
        return currentMapping && !this.isEqual(currentMapping, u);
      }),
      removed: current.filter(c => !updated.find(u => u.id === c.id))
    };
  }

  private extractValue(data: any, path: string): any {
    if (path.startsWith('_system.')) {
      // Handle system fields
      const systemField = path.replace('_system.', '');
      switch (systemField) {
        case 'timestamp':
          return new Date().toISOString();
        case 'entityName':
          return data._entityName || 'Unknown';
        default:
          return null;
      }
    }

    // Use JSONPath for field extraction
    const result = jsonpath.query(data, path);
    return result.length > 0 ? result[0] : null;
  }

  private applyTemplate(value: any, template: string, sourceData: any): string {
    let result = template;
    
    // Replace ${fieldName} with values from source data
    const fieldPattern = /\${([^}]+)}/g;
    result = result.replace(fieldPattern, (match, fieldPath) => {
      const fieldValue = this.extractValue(sourceData, fieldPath);
      return fieldValue !== null && fieldValue !== undefined ? String(fieldValue) : '';
    });

    // Replace ${value} with the current value
    result = result.replace('${value}', String(value || ''));
    
    return result;
  }

  private applyCustomFunction(value: any, functionBody: string, sourceData: any): any {
    try {
      // Create a sandboxed function evaluation
      const func = new Function('value', 'data', 'jsonpath', functionBody);
      return func(value, sourceData, jsonpath);
    } catch (error) {
      console.error('Error executing custom function:', error);
      return value;
    }
  }

  private applyLookup(value: any, mapping: Mapping): any {
    // Implement lookup logic
    // This could involve looking up values in a separate data store or configuration
    return value;
  }

  private applyAggregation(value: any, mapping: Mapping): any {
    if (!Array.isArray(value)) {
      return value;
    }

    // Basic aggregation functions
    switch (mapping.template) {
      case 'sum':
        return value.reduce((sum, item) => sum + (Number(item) || 0), 0);
      case 'count':
        return value.length;
      case 'avg':
        const sum = value.reduce((sum, item) => sum + (Number(item) || 0), 0);
        return value.length > 0 ? sum / value.length : 0;
      case 'min':
        return Math.min(...value.map(v => Number(v) || 0));
      case 'max':
        return Math.max(...value.map(v => Number(v) || 0));
      default:
        return value;
    }
  }

  private applyConditional(value: any, mapping: Mapping): any {
    // Implement conditional logic
    // This could use custom function or template for conditions
    return value;
  }

  private extractFields(schema: any, path: string = ''): Field[] {
    const fields: Field[] = [];

    if (schema.type === 'object' && schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        const fullPath = path ? `${path}.${key}` : key;
        fields.push({
          path: fullPath,
          type: (prop as any).type,
          required: schema.required?.includes(key) || false,
          description: (prop as any).description
        });

        // Recursively extract nested fields
        if ((prop as any).type === 'object') {
          fields.push(...this.extractFields(prop, fullPath));
        }
      }
    }

    return fields;
  }

  private isFieldMatch(field1: Field, field2: Field): boolean {
    // Simple field matching based on name similarity
    const name1 = field1.path.split('.').pop()?.toLowerCase() || '';
    const name2 = field2.path.split('.').pop()?.toLowerCase() || '';
    
    return name1 === name2 || 
           name1.includes(name2) || 
           name2.includes(name1);
  }

  private isEqual(mapping1: Mapping, mapping2: Mapping): boolean {
    return JSON.stringify(mapping1) === JSON.stringify(mapping2);
  }

  private generateId(): string {
    return `mapping_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Import/Export functionality
  async exportMappings(entityId: string): Promise<any> {
    const mappings = await this.getByEntityId(entityId);
    const valueMappings = await this.valueMappingService.getByEntityId(entityId);
    
    return {
      entityId,
      exportedAt: new Date().toISOString(),
      mappings,
      valueMappings
    };
  }

  async importMappings(data: any): Promise<Mapping[]> {
    const imported: Mapping[] = [];
    
    // Import value mappings first
    if (data.valueMappings) {
      await this.valueMappingService.importMappings(data.valueMappings);
    }
    
    // Import field mappings
    for (const mapping of data.mappings) {
      const created = await this.create({
        ...mapping,
        entityId: data.entityId
      });
      imported.push(created);
    }
    
    return imported;
  }

  // Apply mappings with event publishing
  async applyMappingsWithEventPublishing(
    entity: EntitySchema,
    mappings: Mapping[],
    inputData: any,
    existingData?: any
  ): Promise<{ output: any; event?: ChangeEvent }> {
    const output: any = {};

    // Apply each mapping
    for (const mapping of mappings) {
      if (mapping.active) {
        try {
          const value = await this.applyMapping(inputData, mapping);
          this.setNestedValue(output, mapping.target, value);
        } catch (error) {
          console.error(`Error applying mapping ${mapping.id}:`, error);
        }
      }
    }

    // Handle upsert logic
    let finalOutput = output;
    let operation = 'insert';

    if (entity.outputConfig?.upsertConfig?.enabled && existingData) {
      const upsertConfig = entity.outputConfig.upsertConfig;
      const shouldUpdate = await this.checkForUpdate(output, existingData, upsertConfig.uniqueFields);

      if (shouldUpdate) {
        operation = 'update';
        switch (upsertConfig.conflictResolution) {
          case 'update':
            finalOutput = { ...existingData, ...output };
            break;
          case 'merge':
            finalOutput = this.deepMerge(existingData, output);
            break;
          case 'skip':
            finalOutput = existingData;
            operation = 'skip';
            break;
          case 'error':
            throw new Error('Record already exists');
        }
      }
    }

    // Publish change event if enabled
    let event: ChangeEvent | undefined;
    if (entity.outputConfig?.changeEventConfig?.enabled && operation !== 'skip') {
      event = await this.eventPublisher.publishEvent(
        entity.id,
        finalOutput,
        existingData || null,
        entity.outputConfig.changeEventConfig
      );
    }

    return { output: finalOutput, event };
  }

  private async checkForUpdate(newData: any, existingData: any, uniqueFields: string[]): Promise<boolean> {
    if (!existingData || uniqueFields.length === 0) {
      return false;
    }

    return uniqueFields.every(field => {
      const newValue = this.getNestedValue(newData, field);
      const existingValue = this.getNestedValue(existingData, field);
      return newValue === existingValue;
    });
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

  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }
    
    return current;
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          if (typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key])) {
            result[key] = this.deepMerge(result[key], source[key]);
          } else {
            result[key] = source[key];
          }
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }
}
