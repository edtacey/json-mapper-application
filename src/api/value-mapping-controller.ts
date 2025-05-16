import { Router, Request, Response } from 'express';
import { ValueMappingService } from '../services/value-mapping.service';
import { ValueMapping } from '../types';

export class ValueMappingController {
  private router: Router;
  private service: ValueMappingService;

  constructor() {
    this.router = Router();
    this.service = new ValueMappingService();
    this.setupRoutes();
  }

  private setupRoutes() {
    // Create a new value mapping
    this.router.post('/', async (req: Request, res: Response) => {
      try {
        const mapping = await this.service.create(req.body);
        res.json({ success: true, mapping });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get all value mappings for an entity
    this.router.get('/entity/:entityId', async (req: Request, res: Response) => {
      try {
        const mappings = await this.service.getByEntityId(req.params.entityId);
        res.json({ success: true, mappings });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get a specific value mapping
    this.router.get('/:id', async (req: Request, res: Response) => {
      try {
        const mapping = await this.service.getById(req.params.id);
        if (!mapping) {
          return res.status(404).json({ error: 'Value mapping not found' });
        }
        res.json({ success: true, mapping });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Update a value mapping
    this.router.put('/:id', async (req: Request, res: Response) => {
      try {
        const mapping = await this.service.update(req.params.id, req.body);
        res.json({ success: true, mapping });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Delete a value mapping
    this.router.delete('/:id', async (req: Request, res: Response) => {
      try {
        const success = await this.service.delete(req.params.id);
        res.json({ success });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Test a value mapping
    this.router.post('/:id/test', async (req: Request, res: Response) => {
      try {
        const { value, context } = req.body;
        const result = await this.service.mapValue(value, req.params.id, context);
        res.json({ success: true, result });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get example value mappings
    this.router.get('/examples/all', async (req: Request, res: Response) => {
      try {
        const examples = this.service.generateExamples();
        res.json({ success: true, examples });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Import value mappings in bulk
    this.router.post('/import', async (req: Request, res: Response) => {
      try {
        const mappings = await this.service.importMappings(req.body.mappings);
        res.json({ success: true, mappings });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  getRouter(): Router {
    return this.router;
  }
}
