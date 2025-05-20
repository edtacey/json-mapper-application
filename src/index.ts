import express from 'express';
import cors from 'cors';
import * as path from 'path';
import { EntityController } from './api/entity-controller';
import { MappingController } from './api/mapping-controller';
import { ValueMappingController } from './api/value-mapping-controller';
import { CodeGeneratorController } from './api/code-generator-controller';
import { createOutputSchemaRouter } from './api/output-schema';
import { createEventRouter } from './api/events';
import abstractedModelRouter from './api/abstracted-model/controller';
import { DataStore } from './storage/data-store';

export class Application {
  private app: express.Application;
  private port: number;

  constructor(port: number = 3000) {
    this.app = express();
    this.port = port;
    this.setupMiddleware();
    this.setupRoutes();
    this.initializeDataStores();
  }

  private setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Serve static files from frontend
    this.app.use(express.static(path.join(__dirname, '../frontend/dist')));
    this.app.use('/assets', express.static(path.join(__dirname, '../frontend/public')));
  }

  private setupRoutes() {
    // API routes
    const entityController = new EntityController();
    const mappingController = new MappingController();
    const valueMappingController = new ValueMappingController();
    const codeGenController = new CodeGeneratorController();
    const outputSchemaRouter = createOutputSchemaRouter();
    const eventRouter = createEventRouter();

    this.app.use('/api/entities', entityController.getRouter());
    this.app.use('/api/entities', outputSchemaRouter); // Output schema routes
    this.app.use('/api/entities', eventRouter); // Event routes
    this.app.use('/api', abstractedModelRouter); // Abstracted model routes
    this.app.use('/api/mappings', mappingController.getRouter());
    this.app.use('/api/value-mappings', valueMappingController.getRouter());
    this.app.use('/api/generate', codeGenController.getRouter());

    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        version: '1.0.0',
        timestamp: new Date().toISOString() 
      });
    });

    // API documentation
    this.app.get('/api/docs', (req, res) => {
      res.json({
        version: '1.0.0',
        endpoints: {
          entities: {
            'POST /api/entities/generate': 'Generate entity from sample payload',
            'POST /api/entities/import': 'Import entity from external API',
            'GET /api/entities': 'List all entities',
            'GET /api/entities/:id': 'Get entity by ID',
            'PUT /api/entities/:id': 'Update entity',
            'DELETE /api/entities/:id': 'Delete entity'
          },
          outputSchema: {
            'POST /api/entities/:id/output-schema/fetch': 'Fetch output schema from external API',
            'POST /api/entities/:id/output-schema/refresh': 'Refresh output schema',
            'PUT /api/entities/:id/output-schema': 'Update output schema',
            'GET /api/entities/:id/output-schema/versions': 'Get schema version history'
          },
          upsertConfig: {
            'POST /api/entities/:id/upsert-config': 'Configure upsert settings',
            'POST /api/entities/:id/upsert-config/validate': 'Validate upsert fields'
          },
          abstractedModel: {
            'POST /api/entities/:id/abstracted-model': 'Set entity as abstracted model',
            'POST /api/entities/:id/constraints': 'Add uniqueness constraint',
            'DELETE /api/entities/:id/constraints/:constraintId': 'Remove uniqueness constraint',
            'GET /api/abstracted-models': 'Get all abstracted models',
            'POST /api/entities/:id/validate-abstracted': 'Validate abstracted model'
          },
          changeEvents: {
            'GET /api/entities/:id/change-events': 'Get event history',
            'GET /api/entities/:id/change-events/stats': 'Get event statistics',
            'POST /api/entities/:id/publish-event': 'Manually publish event',
            'POST /api/entities/:id/test-event': 'Test event publishing',
            'POST /api/entities/:id/change-event-config': 'Configure change events'
          },
          mappings: {
            'POST /api/mappings': 'Create mapping',
            'GET /api/mappings/entity/:entityId': 'Get mappings for entity',
            'POST /api/mappings/refresh/:entityId': 'Refresh mappings with LLM',
            'POST /api/mappings/test': 'Test mapping transformation',
            'POST /api/mappings/validate': 'Validate mappings'
          },
          valueMappings: {
            'POST /api/value-mappings': 'Create value mapping',
            'GET /api/value-mappings/entity/:entityId': 'Get value mappings for entity',
            'POST /api/value-mappings/:id/test': 'Test value mapping',
            'GET /api/value-mappings/examples/all': 'Get example value mappings'
          },
          generation: {
            'POST /api/generate/entity': 'Generate code for entity',
            'POST /api/generate/azure-function': 'Generate Azure Function',
            'POST /api/generate/node-red-flow': 'Generate Node-RED flow'
          }
        }
      });
    });

    // Catch all route for frontend
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
    });
  }

  private async initializeDataStores() {
    const stores = [
      './data/entities',
      './data/mappings',
      './data/value-mappings',
      './data/generated',
      './data/events'
    ];

    for (const storePath of stores) {
      new DataStore(storePath);
    }
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`JsonMapper server running on port ${this.port}`);
      console.log(`Web UI: http://localhost:${this.port}`);
      console.log(`API: http://localhost:${this.port}/api`);
      console.log(`API Docs: http://localhost:${this.port}/api/docs`);
    });
  }
}

// Environment setup
const PORT = parseInt(process.env.PORT || '3001', 10);

// Start the application
const app = new Application(PORT);
app.start();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
