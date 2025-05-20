import { Router, Request, Response } from 'express';
import { EntityService } from '../services/entity.service';
import { MappingService } from '../services/mapping.service';
import { LLMService } from '../services/llm.service';
import { ValueMappingService } from '../services/value-mapping.service';

export class EntityController {
  private router: Router;
  private entityService: EntityService;
  private mappingService: MappingService;
  private llmService: LLMService;
  private valueMappingService: ValueMappingService;

  constructor() {
    this.router = Router();
    this.entityService = new EntityService();
    this.mappingService = new MappingService();
    this.llmService = new LLMService();
    this.valueMappingService = new ValueMappingService();
    this.setupRoutes();
  }

  private setupRoutes() {
    // Generate entity from payload sample
    this.router.post('/generate', async (req: Request, res: Response) => {
      try {
        const { 
          samplePayload, 
          entityName, 
          description, 
          outputSchema, 
          outputConfig, 
          abstracted,
          schemaFormat,
          inboundAbstracted,
          outboundAbstracted
        } = req.body;
        
        // Generate entity schema from sample
        const entitySchema = await this.entityService.generateFromSample(
          samplePayload,
          entityName,
          description,
          outputSchema,
          outputConfig,
          {
            abstracted,
            schemaFormat: schemaFormat || 'json', 
            inboundAbstracted: inboundAbstracted || false,
            outboundAbstracted: outboundAbstracted || false
          }
        );
        
        // Use LLM to enhance schema with intelligent defaults
        const enhancedSchema = await this.llmService.enhanceEntitySchema(entitySchema);
        
        // Save to data store
        await this.entityService.save(enhancedSchema);
        
        // Create default mappings
        const mappings = await this.mappingService.generateDefaultMappings(enhancedSchema);
        
        // Analyze sample data for potential value mappings
        const valueMappingSuggestions = await this.analyzeSampleDataForValueMappings(
          samplePayload,
          enhancedSchema
        );

        res.json({
          success: true,
          entity: enhancedSchema,
          mappings,
          valueMappingSuggestions
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Import entity from external API
    this.router.post('/import', async (req: Request, res: Response) => {
      try {
        const { 
          apiEndpoint, 
          method, 
          headers, 
          sampleRequest, 
          schemaFormat,
          inboundAbstracted,
          outboundAbstracted
        } = req.body;
        
        // Call external API
        const response = await this.entityService.callExternalAPI({
          endpoint: apiEndpoint,
          method,
          headers,
          body: sampleRequest
        });
        
        // Generate schema from response
        const entitySchema = await this.entityService.generateFromAPIResponse(
          response.data,
          req.body.entityName,
          {
            schemaFormat: schemaFormat || 'json',
            inboundAbstracted: inboundAbstracted || false,
            outboundAbstracted: outboundAbstracted || false
          }
        );
        
        // Save and return
        await this.entityService.save(entitySchema);
        
        // Create default mappings
        const mappings = await this.mappingService.generateDefaultMappings(entitySchema);
        
        res.json({ 
          success: true, 
          entity: entitySchema,
          mappings,
          apiResponse: response.data
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // List all entities
    this.router.get('/', async (req: Request, res: Response) => {
      try {
        const entities = await this.entityService.list();
        res.json({ success: true, entities });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get entity by ID
    this.router.get('/:id', async (req: Request, res: Response) => {
      try {
        const entity = await this.entityService.getById(req.params.id);
        if (!entity) {
          return res.status(404).json({ error: 'Entity not found' });
        }
        
        // Also get associated mappings and value mappings
        const mappings = await this.mappingService.getByEntityId(req.params.id);
        const valueMappings = await this.valueMappingService.getByEntityId(req.params.id);
        
        res.json({ 
          success: true, 
          entity,
          mappings,
          valueMappings
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Update entity
    this.router.put('/:id', async (req: Request, res: Response) => {
      try {
        const entity = await this.entityService.update(req.params.id, req.body);
        res.json({ success: true, entity });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Update entity schemas
    this.router.put('/:id/schemas', async (req: Request, res: Response) => {
      try {
        const { inboundSchema, outboundSchema } = req.body;
        const entity = await this.entityService.update(req.params.id, {
          inboundSchema,
          outboundSchema
        });
        res.json({ success: true, entity });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Delete entity
    this.router.delete('/:id', async (req: Request, res: Response) => {
      try {
        // Delete associated mappings using the entity-specific endpoint
        await this.mappingService.deleteByEntityId(req.params.id);
        
        // Delete associated value mappings
        const valueMappings = await this.valueMappingService.getByEntityId(req.params.id);
        for (const vm of valueMappings) {
          await this.valueMappingService.delete(vm.id);
        }
        
        const success = await this.entityService.delete(req.params.id);
        res.json({ success });
      } catch (error: any) {
        console.error(`Error deleting entity ${req.params.id}:`, error);
        res.status(500).json({ error: error.message });
      }
    });

    // Test entity transformation
    this.router.post('/:id/test', async (req: Request, res: Response) => {
      try {
        const { inputData } = req.body;
        const entity = await this.entityService.getById(req.params.id);
        if (!entity) {
          return res.status(404).json({ error: 'Entity not found' });
        }
        
        const mappings = await this.mappingService.getByEntityId(req.params.id);
        const result = await this.entityService.testTransformation(
          entity,
          mappings,
          inputData
        );
        
        res.json({ success: true, result });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Import output schema from external API
    this.router.post('/import-output-schema', async (req: Request, res: Response) => {
      try {
        const { apiEndpoint, method, headers, sampleRequest } = req.body;
        
        const result = await this.entityService.importOutputSchema({
          endpoint: apiEndpoint,
          method,
          headers,
          body: sampleRequest
        });
        
        res.json({
          success: true,
          schema: result.schema
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Test transformation with upsert
    this.router.post('/:id/test-upsert', async (req: Request, res: Response) => {
      try {
        const { inputData, existingData } = req.body;
        const entity = await this.entityService.getById(req.params.id);
        if (!entity) {
          return res.status(404).json({ error: 'Entity not found' });
        }
        
        const mappings = await this.mappingService.getByEntityId(req.params.id);
        const result = await this.entityService.generateWithUpsert(
          entity,
          mappings,
          inputData,
          existingData
        );
        
        res.json({ success: true, result });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Generate change event
    this.router.post('/:id/change-event', async (req: Request, res: Response) => {
      try {
        const { oldData, newData, operation } = req.body;
        const entity = await this.entityService.getById(req.params.id);
        if (!entity) {
          return res.status(404).json({ error: 'Entity not found' });
        }
        
        const event = await this.entityService.generateChangeEvent(
          entity,
          oldData,
          newData,
          operation
        );
        
        res.json({ success: true, event });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Import entity configuration
    this.router.post('/import-config', async (req: Request, res: Response) => {
      try {
        const { entity, mappings, valueMappings } = req.body;
        
        // Import entity
        const importedEntity = await this.entityService.save(entity);
        
        // Import mappings
        const importedMappings = [];
        if (mappings) {
          for (const mapping of mappings) {
            const imported = await this.mappingService.create({
              ...mapping,
              entityId: importedEntity.id
            });
            importedMappings.push(imported);
          }
        }
        
        // Import value mappings
        const importedValueMappings = [];
        if (valueMappings) {
          for (const vm of valueMappings) {
            const imported = await this.valueMappingService.create({
              ...vm,
              entityId: importedEntity.id
            });
            importedValueMappings.push(imported);
          }
        }
        
        res.json({
          success: true,
          entity: importedEntity,
          mappings: importedMappings,
          valueMappings: importedValueMappings
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Link two entities (abstracted model feature)
    this.router.post('/:id/link', async (req: Request, res: Response) => {
      try {
        const { targetEntityId, direction, linkType, mappingId } = req.body;
        
        if (!targetEntityId || !direction || !linkType) {
          return res.status(400).json({ 
            error: 'Missing required parameters: targetEntityId, direction, and linkType are required' 
          });
        }
        
        const entity = await this.entityService.linkEntities(
          req.params.id,
          targetEntityId,
          direction,
          linkType,
          mappingId
        );
        
        res.json({ success: true, entity });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Unlink entities (abstracted model feature)
    this.router.delete('/:id/link/:targetId/:direction', async (req: Request, res: Response) => {
      try {
        const { targetId, direction } = req.params;
        
        const entity = await this.entityService.unlinkEntities(
          req.params.id,
          targetId,
          direction as 'inbound' | 'outbound'
        );
        
        res.json({ success: true, entity });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Get linked entities
    this.router.get('/:id/links', async (req: Request, res: Response) => {
      try {
        const direction = req.query.direction as 'inbound' | 'outbound' | undefined;
        
        const linkedEntities = await this.entityService.getLinkedEntities(
          req.params.id,
          direction
        );
        
        res.json({ success: true, linkedEntities });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Update entity schema format
    this.router.put('/:id/schema-format', async (req: Request, res: Response) => {
      try {
        const { schemaFormat, inboundAbstracted, outboundAbstracted } = req.body;
        
        if (!schemaFormat || !['json', 'yaml'].includes(schemaFormat)) {
          return res.status(400).json({ error: 'Invalid schema format. Must be "json" or "yaml"' });
        }
        
        const entity = await this.entityService.update(req.params.id, {
          schemaFormat,
          inboundAbstracted,
          outboundAbstracted
        });
        
        res.json({ success: true, entity });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  private async analyzeSampleDataForValueMappings(sampleData: any, entity: any): Promise<any[]> {
    const suggestions: any[] = [];
    
    // Analyze each field in the sample data for potential value mappings
    const analyzeFields = (obj: any, path: string = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = path ? `${path}.${key}` : key;
        
        if (typeof value === 'object' && value !== null) {
          analyzeFields(value, fullPath);
        } else if (typeof value === 'string' || typeof value === 'number') {
          // Check if this looks like it needs value mapping
          if (this.looksLikeEnumField(key, value)) {
            suggestions.push({
              fieldPath: fullPath,
              fieldName: key,
              sampleValue: value,
              suggestedType: this.detectValueMappingType(value)
            });
          }
        }
      }
    };
    
    analyzeFields(sampleData);
    
    // Use LLM to enhance suggestions
    for (const suggestion of suggestions) {
      try {
        const llmSuggestion = await this.llmService.suggestValueMappings(
          {
            fieldName: suggestion.fieldName,
            sampleValues: [suggestion.sampleValue]
          },
          { entityType: entity.name }
        );
        suggestion.llmSuggestion = llmSuggestion;
      } catch (error) {
        console.error('Error getting LLM suggestion:', error);
      }
    }
    
    return suggestions;
  }

  private looksLikeEnumField(fieldName: string, value: any): boolean {
    const enumPatterns = [
      /status/i,
      /type/i,
      /category/i,
      /state/i,
      /code/i,
      /level/i,
      /priority/i,
      /country/i,
      /currency/i
    ];
    
    return enumPatterns.some(pattern => pattern.test(fieldName));
  }

  private detectValueMappingType(value: any): string {
    if (typeof value === 'number') {
      return 'range';
    }
    
    if (typeof value === 'string') {
      if (value.match(/^[A-Z]{2,3}$/)) {
        return 'exact';  // Probably country or currency code
      }
      if (value.includes('|') || value.includes(',')) {
        return 'regex';
      }
    }
    
    return 'exact';
  }

  getRouter(): Router {
    return this.router;
  }
}
