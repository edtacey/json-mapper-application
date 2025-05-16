// MCP (Model Context Protocol) Server Implementation
// This module provides enhanced context management for LLM interactions

import { EventEmitter } from 'events';
import { 
  EntitySchema, 
  Mapping, 
  ValueMapping, 
  SubChildMappingConfig,
  OutputConfiguration 
} from '../types';
import { EntityService } from '../services/entity.service';
import { MappingService } from '../services/mapping.service';
import { ValueMappingService } from '../services/value-mapping.service';
import { LLMService } from '../services/llm.service';
import { EventPublisherService } from '../services/event-publisher.service';

// MCP Context Interface
export interface MCPContext {
  entities: EntitySchema[];
  mappings: Mapping[];
  valueMappings: ValueMapping[];
  outputConfigurations: OutputConfiguration[];
  recentEvents: any[];
  systemMetadata: {
    version: string;
    lastUpdated: string;
    capabilities: string[];
  };
}

// MCP Request/Response Types
export interface MCPRequest {
  id: string;
  method: string;
  params?: any;
  context?: Partial<MCPContext>;
}

export interface MCPResponse {
  id: string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  context?: MCPContext;
}

// MCP Server Configuration
export interface MCPServerConfig {
  port?: number;
  maxContextSize?: number;
  enableCaching?: boolean;
  llmProvider?: string;
  apiKey?: string;
}

// MCP Server Implementation
export class MCPServer extends EventEmitter {
  private entityService: EntityService;
  private mappingService: MappingService;
  private valueMappingService: ValueMappingService;
  private llmService: LLMService;
  private eventPublisher: EventPublisherService;
  private context: MCPContext;
  private config: MCPServerConfig;
  private isInitialized: boolean = false;

  constructor(config: MCPServerConfig = {}) {
    super();
    this.config = {
      port: 3001,
      maxContextSize: 1000000, // 1MB default
      enableCaching: true,
      ...config
    };

    // Initialize services
    this.entityService = new EntityService();
    this.mappingService = new MappingService();
    this.valueMappingService = new ValueMappingService();
    this.llmService = new LLMService();
    this.eventPublisher = new EventPublisherService();

    // Initialize context
    this.context = {
      entities: [],
      mappings: [],
      valueMappings: [],
      outputConfigurations: [],
      recentEvents: [],
      systemMetadata: {
        version: '1.1.0',
        lastUpdated: new Date().toISOString(),
        capabilities: [
          'entity-management',
          'mapping-transformation',
          'value-mapping',
          'sub-child-mapping',
          'output-schema-management',
          'event-publishing',
          'code-generation'
        ]
      }
    };
  }

  // Initialize the MCP server
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Load initial context
      await this.loadContext();
      
      // Setup WebSocket server for real-time communication
      await this.setupWebSocketServer();
      
      // Initialize event listeners
      this.setupEventListeners();
      
      this.isInitialized = true;
      this.emit('initialized');
      
      console.log(`MCP Server initialized on port ${this.config.port}`);
    } catch (error) {
      console.error('Failed to initialize MCP Server:', error);
      throw error;
    }
  }

  // Load context from services
  private async loadContext(): Promise<void> {
    try {
      const [entities, mappings, valueMappings] = await Promise.all([
        this.entityService.list(),
        this.mappingService.listAll(),
        this.valueMappingService.list()
      ]);

      this.context.entities = entities;
      this.context.mappings = mappings;
      this.context.valueMappings = valueMappings;

      // Extract output configurations from entities
      this.context.outputConfigurations = entities
        .filter(e => e.outputConfig)
        .map(e => e.outputConfig!);

      // Load recent events
      const events = await this.eventPublisher.getRecentEvents(10);
      this.context.recentEvents = events;

    } catch (error) {
      console.error('Error loading context:', error);
      throw error;
    }
  }

  // Handle MCP requests
  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    try {
      // Update context if provided
      if (request.context) {
        this.mergeContext(request.context);
      }

      let result: any;

      switch (request.method) {
        case 'getContext':
          result = await this.getContext(request.params);
          break;

        case 'enhanceEntity':
          result = await this.enhanceEntity(request.params);
          break;

        case 'suggestMappings':
          result = await this.suggestMappings(request.params);
          break;

        case 'validateSubChildMapping':
          result = await this.validateSubChildMapping(request.params);
          break;

        case 'generateCode':
          result = await this.generateCode(request.params);
          break;

        case 'analyzeOutputSchema':
          result = await this.analyzeOutputSchema(request.params);
          break;

        case 'optimizeEventConfiguration':
          result = await this.optimizeEventConfiguration(request.params);
          break;

        default:
          throw new Error(`Unknown method: ${request.method}`);
      }

      return {
        id: request.id,
        result,
        context: this.context
      };

    } catch (error: any) {
      return {
        id: request.id,
        error: {
          code: -32603,
          message: error.message || 'Internal error',
          data: error.stack
        }
      };
    }
  }

  // Get current context
  private async getContext(params: any): Promise<MCPContext> {
    if (params?.refresh) {
      await this.loadContext();
    }
    return this.context;
  }

  // Enhance entity with LLM
  private async enhanceEntity(params: {
    entityId: string;
    enhancementType: string;
  }): Promise<any> {
    const entity = await this.entityService.getById(params.entityId);
    if (!entity) {
      throw new Error('Entity not found');
    }

    // Use LLM to enhance entity based on type
    const enhanced = await this.llmService.enhanceEntity(
      entity,
      this.context,
      params.enhancementType
    );

    // Update entity with enhancements
    await this.entityService.update(params.entityId, enhanced);
    
    // Refresh context
    await this.loadContext();
    
    return enhanced;
  }

  // Suggest mappings using LLM
  private async suggestMappings(params: {
    entityId: string;
    includeSubChild?: boolean;
  }): Promise<Mapping[]> {
    const entity = await this.entityService.getById(params.entityId);
    if (!entity) {
      throw new Error('Entity not found');
    }

    // Get mapping suggestions from LLM
    const suggestions = await this.llmService.suggestMappings(
      entity,
      this.context,
      params.includeSubChild
    );

    return suggestions;
  }

  // Validate sub-child mapping configuration
  private async validateSubChildMapping(params: {
    mapping: Mapping;
    testData?: any;
  }): Promise<any> {
    const { mapping, testData } = params;
    
    if (!mapping.subChildConfig) {
      throw new Error('No sub-child configuration found');
    }

    // Validate configuration
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // Check lookup source
    if (!mapping.subChildConfig.lookupSource) {
      validation.errors.push('Lookup source is required');
      validation.isValid = false;
    }

    // Test with sample data if provided
    if (testData && validation.isValid) {
      try {
        const result = await this.mappingService.applyMapping(testData, mapping);
        validation.testResult = result;
      } catch (error: any) {
        validation.errors.push(`Test failed: ${error.message}`);
        validation.isValid = false;
      }
    }

    // Get LLM suggestions for improvement
    if (mapping.subChildConfig) {
      const suggestions = await this.llmService.analyzeSubChildMapping(
        mapping,
        this.context
      );
      validation.suggestions = suggestions;
    }

    return validation;
  }

  // Generate optimized code
  private async generateCode(params: {
    entityId: string;
    platform: string;
    includeSubChild?: boolean;
  }): Promise<any> {
    const entity = await this.entityService.getById(params.entityId);
    if (!entity) {
      throw new Error('Entity not found');
    }

    const mappings = await this.mappingService.getByEntityId(params.entityId);
    
    // Generate code with LLM optimization
    const code = await this.llmService.generateOptimizedCode(
      entity,
      mappings,
      params.platform,
      this.context
    );

    return code;
  }

  // Analyze output schema
  private async analyzeOutputSchema(params: {
    entityId: string;
    proposedSchema?: any;
  }): Promise<any> {
    const entity = await this.entityService.getById(params.entityId);
    if (!entity) {
      throw new Error('Entity not found');
    }

    const analysis = await this.llmService.analyzeSchema(
      entity,
      params.proposedSchema || entity.outboundSchema,
      this.context
    );

    return analysis;
  }

  // Optimize event configuration
  private async optimizeEventConfiguration(params: {
    entityId: string;
    currentConfig?: any;
  }): Promise<any> {
    const entity = await this.entityService.get