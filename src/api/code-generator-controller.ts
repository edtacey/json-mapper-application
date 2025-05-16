import { Router, Request, Response } from 'express';
import { CodeGeneratorService } from '../services/code-generator.service';
import { EntityService } from '../services/entity.service';
import { MappingService } from '../services/mapping.service';
import { ValueMappingService } from '../services/value-mapping.service';
import { LLMService } from '../services/llm.service';

export class CodeGeneratorController {
  private router: Router;
  private codeGenService: CodeGeneratorService;
  private entityService: EntityService;
  private mappingService: MappingService;
  private valueMappingService: ValueMappingService;
  private llmService: LLMService;

  constructor() {
    this.router = Router();
    this.codeGenService = new CodeGeneratorService();
    this.entityService = new EntityService();
    this.mappingService = new MappingService();
    this.valueMappingService = new ValueMappingService();
    this.llmService = new LLMService();
    this.setupRoutes();
  }

  private setupRoutes() {
    // Generate code for an entity
    this.router.post('/entity', async (req: Request, res: Response) => {
      try {
        const { entityId, platform, includeTests, includeDocumentation } = req.body;
        
        const entity = await this.entityService.getById(entityId);
        if (!entity) {
          return res.status(404).json({ error: 'Entity not found' });
        }
        
        const mappings = await this.mappingService.getByEntityId(entityId);
        const valueMappings = await this.valueMappingService.getByEntityId(entityId);
        
        const generatedFiles = await this.codeGenService.generateEntity({
          entity,
          mappings,
          valueMappings,
          platform,
          includeTests,
          includeDocumentation
        });
        
        res.json({
          success: true,
          files: generatedFiles
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Generate Azure Function
    this.router.post('/azure-function', async (req: Request, res: Response) => {
      try {
        const { entityId } = req.body;
        
        const entity = await this.entityService.getById(entityId);
        if (!entity) {
          return res.status(404).json({ error: 'Entity not found' });
        }
        
        const mappings = await this.mappingService.getByEntityId(entityId);
        const code = await this.codeGenService.generateAzureFunction(entity, mappings);
        
        res.json({
          success: true,
          code,
          filename: `${entity.name}Processor.ts`
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Generate Node-RED flow
    this.router.post('/node-red-flow', async (req: Request, res: Response) => {
      try {
        const { entityId } = req.body;
        
        const entity = await this.entityService.getById(entityId);
        if (!entity) {
          return res.status(404).json({ error: 'Entity not found' });
        }
        
        const mappings = await this.mappingService.getByEntityId(entityId);
        const flow = await this.codeGenService.generateNodeRedFlow(entity, mappings);
        
        res.json({
          success: true,
          flow,
          filename: `${entity.name}-flow.json`
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Generate tests
    this.router.post('/tests', async (req: Request, res: Response) => {
      try {
        const { entityId, testFramework = 'jest' } = req.body;
        
        const entity = await this.entityService.getById(entityId);
        if (!entity) {
          return res.status(404).json({ error: 'Entity not found' });
        }
        
        const mappings = await this.mappingService.getByEntityId(entityId);
        const tests = await this.codeGenService.generateTests(entity, mappings, testFramework);
        
        res.json({
          success: true,
          tests,
          filename: `${entity.name}.test.ts`
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Generate documentation
    this.router.post('/documentation', async (req: Request, res: Response) => {
      try {
        const { entityId, format = 'markdown' } = req.body;
        
        const entity = await this.entityService.getById(entityId);
        if (!entity) {
          return res.status(404).json({ error: 'Entity not found' });
        }
        
        const mappings = await this.mappingService.getByEntityId(entityId);
        const valueMappings = await this.valueMappingService.getByEntityId(entityId);
        
        const docs = await this.codeGenService.generateDocumentation({
          entity,
          mappings,
          valueMappings,
          format
        });
        
        res.json({
          success: true,
          documentation: docs,
          filename: `${entity.name}.${format === 'markdown' ? 'md' : 'html'}`
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Preview generated code
    this.router.post('/preview', async (req: Request, res: Response) => {
      try {
        const { entityId, platform, codeType } = req.body;
        
        const entity = await this.entityService.getById(entityId);
        if (!entity) {
          return res.status(404).json({ error: 'Entity not found' });
        }
        
        const mappings = await this.mappingService.getByEntityId(entityId);
        let preview = '';
        
        switch (codeType) {
          case 'interfaces':
            preview = await this.codeGenService.generateInterfaces(entity);
            break;
          case 'mapper':
            preview = await this.codeGenService.generateMapper(entity, mappings);
            break;
          case 'azure-function':
            preview = await this.codeGenService.generateAzureFunction(entity, mappings);
            break;
          case 'node-red':
            preview = await this.codeGenService.generateNodeRedFlow(entity, mappings);
            break;
          default:
            throw new Error('Invalid code type');
        }
        
        res.json({
          success: true,
          preview,
          language: codeType === 'node-red' ? 'json' : 'typescript'
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Download generated project
    this.router.post('/download-project', async (req: Request, res: Response) => {
      try {
        const { entityId, platform, includeAll } = req.body;
        
        const entity = await this.entityService.getById(entityId);
        if (!entity) {
          return res.status(404).json({ error: 'Entity not found' });
        }
        
        const projectZip = await this.codeGenService.generateProjectZip({
          entityId,
          platform,
          includeAll
        });
        
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${entity.name}-project.zip"`);
        res.send(projectZip);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Use LLM to generate custom code
    this.router.post('/llm-generate', async (req: Request, res: Response) => {
      try {
        const { entityId, platform, customRequirements } = req.body;
        
        const entity = await this.entityService.getById(entityId);
        if (!entity) {
          return res.status(404).json({ error: 'Entity not found' });
        }
        
        const mappings = await this.mappingService.getByEntityId(entityId);
        const code = await this.llmService.generateCodeFromMapping(
          entity,
          mappings,
          platform
        );
        
        res.json({
          success: true,
          code,
          platform
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Generate template for custom development
    this.router.post('/template', async (req: Request, res: Response) => {
      try {
        const { entityId, templateType } = req.body;
        
        const entity = await this.entityService.getById(entityId);
        if (!entity) {
          return res.status(404).json({ error: 'Entity not found' });
        }
        
        const template = await this.codeGenService.generateTemplate({
          entity,
          templateType
        });
        
        res.json({
          success: true,
          template
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  getRouter(): Router {
    return this.router;
  }
}
