import { Router, Request, Response } from 'express';
import { MappingService } from '../services/mapping.service';
import { EntityService } from '../services/entity.service';
import { LLMService } from '../services/llm.service';
import { ValueMappingService } from '../services/value-mapping.service';

export class MappingController {
  private router: Router;
  private mappingService: MappingService;
  private entityService: EntityService;
  private llmService: LLMService;
  private valueMappingService: ValueMappingService;

  constructor() {
    this.router = Router();
    this.mappingService = new MappingService();
    this.entityService = new EntityService();
    this.llmService = new LLMService();
    this.valueMappingService = new ValueMappingService();
    this.setupRoutes();
  }

  private setupRoutes() {
    // Create a new mapping
    this.router.post('/', async (req: Request, res: Response) => {
      try {
        const mapping = await this.mappingService.create(req.body);
        res.json({ success: true, mapping });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get mappings by entity ID
    this.router.get('/entity/:entityId', async (req: Request, res: Response) => {
      try {
        const mappings = await this.mappingService.getByEntityId(req.params.entityId);
        res.json({ success: true, mappings });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Delete all mappings for an entity
    this.router.delete('/entity/:entityId', async (req: Request, res: Response) => {
      try {
        const mappings = await this.mappingService.getByEntityId(req.params.entityId);
        
        // Delete each mapping
        for (const mapping of mappings) {
          await this.mappingService.delete(mapping.id);
        }
        
        res.json({ 
          success: true, 
          message: `Deleted ${mappings.length} mappings for entity ${req.params.entityId}`,
          count: mappings.length
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get a specific mapping
    this.router.get('/:id', async (req: Request, res: Response) => {
      try {
        const mapping = await this.mappingService.getById(req.params.id);
        if (!mapping) {
          return res.status(404).json({ error: 'Mapping not found' });
        }
        res.json({ success: true, mapping });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Update a mapping
    this.router.put('/:id', async (req: Request, res: Response) => {
      try {
        const mapping = await this.mappingService.update(req.params.id, req.body);
        res.json({ success: true, mapping });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Delete a mapping
    this.router.delete('/:id', async (req: Request, res: Response) => {
      try {
        const success = await this.mappingService.delete(req.params.id);
        res.json({ success });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Refresh mappings using LLM
    this.router.post('/refresh/:entityId', async (req: Request, res: Response) => {
      try {
        const entity = await this.entityService.getById(req.params.entityId);
        if (!entity) {
          return res.status(404).json({ error: 'Entity not found' });
        }

        const currentMappings = await this.mappingService.getByEntityId(req.params.entityId);
        
        // Use LLM to analyze and refresh mappings
        const refreshedMappings = await this.llmService.refreshMappings(
          entity,
          currentMappings,
          req.body.context
        );
        
        // Save refreshed mappings
        const savedMappings = [];
        for (const mapping of refreshedMappings) {
          if (mapping.id && currentMappings.find(m => m.id === mapping.id)) {
            const updated = await this.mappingService.update(mapping.id, mapping);
            savedMappings.push(updated);
          } else {
            const created = await this.mappingService.create({
              ...mapping,
              entityId: entity.id
            });
            savedMappings.push(created);
          }
        }
        
        // Identify broken mappings
        const brokenMappings = await this.mappingService.validateMappings(
          savedMappings,
          entity
        );
        
        res.json({
          success: true,
          mappings: savedMappings,
          brokenMappings,
          changes: this.mappingService.diffMappings(currentMappings, savedMappings)
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Test a mapping
    this.router.post('/test', async (req: Request, res: Response) => {
      try {
        const { mapping, input } = req.body;
        const result = await this.mappingService.applyMapping(input, mapping);
        
        res.json({
          success: true,
          input,
          output: result,
          mapping
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Validate mappings
    this.router.post('/validate', async (req: Request, res: Response) => {
      try {
        const { mappings, entityId } = req.body;
        
        const entity = await this.entityService.getById(entityId);
        if (!entity) {
          return res.status(404).json({ error: 'Entity not found' });
        }
        
        const validationResults = await this.mappingService.validateMappings(mappings, entity);
        
        res.json({
          success: true,
          brokenMappings: validationResults,
          totalMappings: mappings.length,
          brokenCount: validationResults.length
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Suggest mappings for a field
    this.router.post('/suggest', async (req: Request, res: Response) => {
      try {
        const { sourceField, entityId, context } = req.body;
        
        const entity = await this.entityService.getById(entityId);
        if (!entity) {
          return res.status(404).json({ error: 'Entity not found' });
        }
        
        // Extract target fields from schema
        const targetFields = this.extractFields(entity.outboundSchema);
        
        // Get LLM suggestions
        const suggestions = await this.llmService.suggestMapping(
          sourceField,
          targetFields,
          context || { entityType: entity.name }
        );
        
        res.json({
          success: true,
          suggestions
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Analyze broken mappings
    this.router.post('/analyze-broken', async (req: Request, res: Response) => {
      try {
        const { brokenMappings, entityId } = req.body;
        
        const entity = await this.entityService.getById(entityId);
        if (!entity) {
          return res.status(404).json({ error: 'Entity not found' });
        }
        
        const analysis = await this.llmService.analyzeBrokenMappings(
          brokenMappings,
          entity
        );
        
        res.json({
          success: true,
          analysis
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Bulk import mappings
    this.router.post('/import', async (req: Request, res: Response) => {
      try {
        const imported = await this.mappingService.importMappings(req.body);
        res.json({
          success: true,
          imported,
          count: imported.length
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Export mappings
    this.router.get('/export/:entityId', async (req: Request, res: Response) => {
      try {
        const exported = await this.mappingService.exportMappings(req.params.entityId);
        res.json({
          success: true,
          data: exported
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Generate default mappings for an entity
    this.router.post('/generate-defaults/:entityId', async (req: Request, res: Response) => {
      try {
        const entity = await this.entityService.getById(req.params.entityId);
        if (!entity) {
          return res.status(404).json({ error: 'Entity not found' });
        }
        
        const defaultMappings = await this.mappingService.generateDefaultMappings(entity);
        
        res.json({
          success: true,
          mappings: defaultMappings
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Auto-detect value mappings
    this.router.post('/auto-detect-value-mappings', async (req: Request, res: Response) => {
      try {
        const { entityId, sampleData } = req.body;
        
        const entity = await this.entityService.getById(entityId);
        if (!entity) {
          return res.status(404).json({ error: 'Entity not found' });
        }
        
        const detectedMappings = [];
        
        // Analyze each field in sample data
        for (const field of this.extractFieldsWithValues(sampleData)) {
          if (field.values.length > 0) {
            const suggestion = await this.llmService.suggestValueMappings(
              {
                fieldName: field.name,
                sampleValues: field.values
              },
              { entityType: entity.name }
            );
            
            detectedMappings.push({
              field: field.name,
              suggestion
            });
          }
        }
        
        res.json({
          success: true,
          detectedMappings
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  private extractFields(schema: any, path: string = ''): any[] {
    const fields: any[] = [];

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

  private extractFieldsWithValues(data: any, path: string = ''): any[] {
    const fieldsWithValues: any[] = [];

    const extract = (obj: any, currentPath: string) => {
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = currentPath ? `${currentPath}.${key}` : key;
        
        if (Array.isArray(value)) {
          fieldsWithValues.push({
            name: fullPath,
            values: value.filter(v => v !== null && v !== undefined)
          });
        } else if (typeof value === 'object' && value !== null) {
          extract(value, fullPath);
        } else if (value !== null && value !== undefined) {
          fieldsWithValues.push({
            name: fullPath,
            values: [value]
          });
        }
      }
    };

    if (Array.isArray(data)) {
      for (const item of data) {
        extract(item, path);
      }
    } else {
      extract(data, path);
    }

    return fieldsWithValues;
  }

  getRouter(): Router {
    return this.router;
  }
}
