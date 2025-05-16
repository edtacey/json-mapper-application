import * as Handlebars from 'handlebars';
import { promises as fs } from 'fs';
import * as path from 'path';
import { EntitySchema, Mapping, ValueMapping, GeneratedFiles } from '../types';
import { DataStore } from '../storage/data-store';

export class CodeGeneratorService {
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();
  private dataStore: DataStore;

  constructor() {
    this.dataStore = new DataStore('./data/generated');
    this.loadTemplates();
    this.registerHelpers();
  }

  async generateEntity(config: {
    entity: EntitySchema;
    mappings: Mapping[];
    valueMappings: ValueMapping[];
    platform: 'azure' | 'node-red' | 'both';
    includeTests: boolean;
    includeDocumentation: boolean;
  }): Promise<GeneratedFiles> {
    const { entity, mappings, valueMappings, platform, includeTests, includeDocumentation } = config;
    const context = this.prepareContext(entity, mappings, valueMappings);
    const files: GeneratedFiles = {};

    // Always generate interfaces
    files.interfaces = await this.generateInterfaces(entity);
    files.mapper = await this.generateMapper(entity, mappings);

    // Platform-specific code
    if (platform === 'azure' || platform === 'both') {
      files.azureFunction = await this.generateAzureFunction(entity, mappings);
    }

    if (platform === 'node-red' || platform === 'both') {
      files.nodeRedFlow = await this.generateNodeRedFlow(entity, mappings);
    }

    // Optional generations
    if (includeTests) {
      files.tests = await this.generateTests(entity, mappings);
    }

    if (includeDocumentation) {
      files.documentation = await this.generateDocumentation({
        entity,
        mappings,
        valueMappings,
        format: 'markdown'
      });
    }

    return files;
  }

  async generateInterfaces(entity: EntitySchema): Promise<string> {
    const template = this.templates.get('interfaces');
    if (!template) throw new Error('Interface template not found');

    const context = {
      entityName: entity.name,
      version: entity.version,
      timestamp: new Date().toISOString(),
      inboundProperties: this.extractProperties(entity.inboundSchema),
      outboundProperties: this.extractProperties(entity.outboundSchema),
      zodInboundSchema: this.generateZodSchema(entity.inboundSchema),
      zodOutboundSchema: this.generateZodSchema(entity.outboundSchema)
    };

    return template(context);
  }

  async generateMapper(entity: EntitySchema, mappings: Mapping[]): Promise<string> {
    const template = this.templates.get('mapper');
    if (!template) throw new Error('Mapper template not found');

    const context = {
      entityName: entity.name,
      mappingRules: mappings.map(m => ({
        source: m.source,
        target: m.target,
        transformation: m.transformation,
        template: m.template,
        customFunction: m.customFunction,
        valueMapId: m.valueMapId
      })),
      customTransformations: this.extractCustomTransformations(mappings)
    };

    return template(context);
  }

  async generateAzureFunction(entity: EntitySchema, mappings: Mapping[]): Promise<string> {
    const template = this.templates.get('azure-function');
    if (!template) throw new Error('Azure Function template not found');

    const context = {
      entityName: entity.name,
      queueName: `${entity.name.toLowerCase()}-events`,
      logLevel: 'Info',
      hasMappings: mappings.length > 0,
      hasUpsert: entity.outputConfig?.upsertConfig?.enabled || false,
      upsertConfig: entity.outputConfig?.upsertConfig,
      hasChangeEvents: entity.outputConfig?.changeEventConfig?.enabled || false,
      changeEventConfig: entity.outputConfig?.changeEventConfig
    };

    return template(context);
  }

  async generateNodeRedFlow(entity: EntitySchema, mappings: Mapping[]): Promise<string> {
    const flow = {
      id: this.generateNodeId(),
      type: 'tab',
      label: `${entity.name} Flow`,
      nodes: [
        {
          id: this.generateNodeId(),
          type: 'http in',
          name: `${entity.name} Input`,
          url: `/api/${entity.name.toLowerCase()}`,
          method: 'post',
          upload: false,
          x: 100,
          y: 100,
          wires: [[this.generateNodeId()]]
        },
        {
          id: this.generateNodeId(),
          type: 'json-mapper',
          name: `${entity.name} Mapper`,
          entityId: entity.id,
          mappings: mappings.map(m => m.id),
          x: 300,
          y: 100,
          wires: [[this.generateNodeId()]]
        },
        {
          id: this.generateNodeId(),
          type: 'queue-out',
          name: 'Send to Queue',
          queue: `${entity.name.toLowerCase()}-events`,
          x: 500,
          y: 100,
          wires: [[this.generateNodeId()]]
        },
        {
          id: this.generateNodeId(),
          type: 'http response',
          name: 'Response',
          statusCode: '200',
          x: 700,
          y: 100,
          wires: []
        }
      ]
    };

    return JSON.stringify(flow, null, 2);
  }

  async generateTests(entity: EntitySchema, mappings: Mapping[], framework: string = 'jest'): Promise<string> {
    const template = this.templates.get('test');
    if (!template) throw new Error('Test template not found');

    const context = {
      entityName: entity.name,
      testCases: this.generateTestCases(entity, mappings),
      invalidInputExample: this.generateInvalidInput(entity),
      edgeCases: this.generateEdgeCases(entity)
    };

    return template(context);
  }

  async generateDocumentation(config: {
    entity: EntitySchema;
    mappings: Mapping[];
    valueMappings: ValueMapping[];
    format: 'markdown' | 'html';
  }): Promise<string> {
    const { entity, mappings, valueMappings, format } = config;
    const template = this.templates.get(`documentation-${format}`);
    if (!template) throw new Error(`Documentation template for ${format} not found`);

    const context = {
      entityName: entity.name,
      description: entity.description,
      version: entity.version,
      createdAt: entity.createdAt,
      inboundSchema: JSON.stringify(entity.inboundSchema, null, 2),
      outboundSchema: JSON.stringify(entity.outboundSchema, null, 2),
      mappings: mappings.map(m => ({
        source: m.source,
        target: m.target,
        transformation: m.transformation,
        description: this.describeMappingTransformation(m)
      })),
      valueMappings: valueMappings.map(vm => ({
        name: vm.name,
        description: vm.description,
        type: vm.type,
        mappingCount: Object.keys(vm.mappings).length
      })),
      sampleInput: entity.metadata?.sampleData ? JSON.stringify(entity.metadata.sampleData, null, 2) : null
    };

    return template(context);
  }

  async generateProjectZip(config: {
    entityId: string;
    platform: 'azure' | 'node-red' | 'both';
    includeAll: boolean;
  }): Promise<Buffer> {
    // This would use a zip library like archiver to create a complete project
    // For now, returning a placeholder
    return Buffer.from('Project zip placeholder');
  }

  async generateTemplate(config: {
    entity: EntitySchema;
    templateType: string;
  }): Promise<string> {
    const { entity, templateType } = config;
    const template = this.templates.get(templateType);
    if (!template) throw new Error(`Template ${templateType} not found`);

    return template({ entity });
  }

  private async loadTemplates() {
    const templateDir = path.join(__dirname, '../../templates');
    
    // Load all template files
    const templates = {
      'interfaces': 'interface-template.hbs',
      'mapper': 'mapper-template.hbs',
      'azure-function': 'azure-function-template.hbs',
      'test': 'test-template.hbs',
      'documentation-markdown': 'documentation-md-template.hbs',
      'documentation-html': 'documentation-html-template.hbs'
    };

    // For now, use embedded templates
    this.templates.set('interfaces', Handlebars.compile(this.getInterfaceTemplate()));
    this.templates.set('mapper', Handlebars.compile(this.getMapperTemplate()));
    this.templates.set('azure-function', Handlebars.compile(this.getAzureFunctionTemplate()));
    this.templates.set('test', Handlebars.compile(this.getTestTemplate()));
    this.templates.set('documentation-markdown', Handlebars.compile(this.getDocumentationTemplate()));
  }

  private registerHelpers() {
    Handlebars.registerHelper('json', (context) => {
      return JSON.stringify(context, null, 2);
    });

    Handlebars.registerHelper('uppercase', (str) => {
      return str ? str.toUpperCase() : '';
    });

    Handlebars.registerHelper('lowercase', (str) => {
      return str ? str.toLowerCase() : '';
    });

    Handlebars.registerHelper('camelCase', (str) => {
      return str ? str.charAt(0).toLowerCase() + str.slice(1) : '';
    });

    Handlebars.registerHelper('pascalCase', (str) => {
      return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
    });
  }

  private prepareContext(entity: EntitySchema, mappings: Mapping[], valueMappings: ValueMapping[]): any {
    return {
      entityName: entity.name,
      version: entity.version,
      timestamp: new Date().toISOString(),
      mappings,
      valueMappings,
      hasValueMappings: valueMappings.length > 0
    };
  }

  private extractProperties(schema: any): any[] {
    const properties: any[] = [];

    if (schema.type === 'object' && schema.properties) {
      for (const [name, prop] of Object.entries(schema.properties)) {
        properties.push({
          name,
          type: this.schemaTypeToTypeScript((prop as any).type),
          optional: !schema.required?.includes(name) ? '?' : '',
          description: (prop as any).description
        });
      }
    }

    return properties;
  }

  private generateZodSchema(schema: any): any[] {
    const zodSchema: any[] = [];

    if (schema.type === 'object' && schema.properties) {
      for (const [name, prop] of Object.entries(schema.properties)) {
        zodSchema.push({
          name,
          validation: this.schemaToZodValidation(prop as any)
        });
      }
    }

    return zodSchema;
  }

  private schemaTypeToTypeScript(type: string): string {
    switch (type) {
      case 'string': return 'string';
      case 'number': return 'number';
      case 'integer': return 'number';
      case 'boolean': return 'boolean';
      case 'array': return 'any[]';
      case 'object': return 'Record<string, any>';
      default: return 'any';
    }
  }

  private schemaToZodValidation(schema: any): string {
    switch (schema.type) {
      case 'string':
        let validation = 'z.string()';
        if (schema.format === 'email') validation += '.email()';
        if (schema.format === 'uuid') validation += '.uuid()';
        if (schema.minLength) validation += `.min(${schema.minLength})`;
        if (schema.maxLength) validation += `.max(${schema.maxLength})`;
        return validation;
      case 'number':
      case 'integer':
        validation = 'z.number()';
        if (schema.minimum) validation += `.min(${schema.minimum})`;
        if (schema.maximum) validation += `.max(${schema.maximum})`;
        return validation;
      case 'boolean':
        return 'z.boolean()';
      case 'array':
        return 'z.array(z.any())';
      case 'object':
        return 'z.object({})';
      default:
        return 'z.any()';
    }
  }

  private extractCustomTransformations(mappings: Mapping[]): any[] {
    const transformations: any[] = [];
    
    for (const mapping of mappings) {
      if (mapping.transformation === 'function' && mapping.customFunction) {
        transformations.push({
          name: `transform_${mapping.id}`,
          params: 'value: any',
          returnType: 'any',
          implementation: mapping.customFunction
        });
      }
    }
    
    return transformations;
  }

  private generateTestCases(entity: EntitySchema, mappings: Mapping[]): any[] {
    // Generate test cases based on schema and mappings
    return [
      {
        description: 'should map all required fields correctly',
        input: this.generateSampleInput(entity),
        assertions: mappings.map(m => ({
          field: m.target,
          matcher: 'toBeDefined'
        }))
      }
    ];
  }

  private generateInvalidInput(entity: EntitySchema): string {
    return '{}';  // Simplified - would generate based on schema
  }

  private generateEdgeCases(entity: EntitySchema): any[] {
    return [
      {
        description: 'should handle null values gracefully',
        input: 'null'
      },
      {
        description: 'should handle empty objects',
        input: '{}'
      }
    ];
  }

  private generateSampleInput(entity: EntitySchema): string {
    if (entity.metadata?.sampleData) {
      return JSON.stringify(entity.metadata.sampleData);
    }
    return '{}';
  }

  private describeMappingTransformation(mapping: Mapping): string {
    switch (mapping.transformation) {
      case 'direct':
        return 'Direct mapping without transformation';
      case 'template':
        return `Template transformation: ${mapping.template}`;
      case 'function':
        return 'Custom function transformation';
      case 'value-mapping':
        return 'Value mapping transformation';
      case 'aggregate':
        return 'Aggregation transformation';
      default:
        return mapping.transformation;
    }
  }

  private generateNodeId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Embedded template strings (simplified versions)
  private getInterfaceTemplate(): string {
    return `// Generated interfaces for {{entityName}}
// Version: {{version}}
// Generated at: {{timestamp}}

import { z } from 'zod';

export interface {{entityName}}InboundPayload {
{{#each inboundProperties}}
  {{this.name}}{{this.optional}}: {{this.type}};
{{/each}}
}

export interface {{entityName}}OutboundEvent {
{{#each outboundProperties}}
  {{this.name}}: {{this.type}};
{{/each}}
}

export const {{entityName}}InboundSchema = z.object({
{{#each zodInboundSchema}}
  {{this.name}}: {{this.validation}},
{{/each}}
});

export const {{entityName}}OutboundSchema = z.object({
{{#each zodOutboundSchema}}
  {{this.name}}: {{this.validation}},
{{/each}}
});`;
  }

  private getMapperTemplate(): string {
    return `import { {{entityName}}InboundPayload, {{entityName}}OutboundEvent } from "../interfaces/{{entityName}}.interface";
import { BaseMapper } from "../utils/base-mapper";

export class {{entityName}}Mapper extends BaseMapper<{{entityName}}InboundPayload, {{entityName}}OutboundEvent> {
  private readonly mappingRules = [
{{#each mappingRules}}
    {
      source: "{{this.source}}",
      target: "{{this.target}}",
      transformation: "{{this.transformation}}"{{#if this.template}},
      template: "{{this.template}}"{{/if}}{{#if this.valueMapId}},
      valueMapId: "{{this.valueMapId}}"{{/if}}
    },
{{/each}}
  ];

  async map(input: {{entityName}}InboundPayload): Promise<{{entityName}}OutboundEvent> {
    const output: Partial<{{entityName}}OutboundEvent> = {};
    
    for (const rule of this.mappingRules) {
      const value = await this.applyRule(input, rule);
      this.setNestedProperty(output, rule.target, value);
    }
    
    return output as {{entityName}}OutboundEvent;
  }
}`;
  }

  private getAzureFunctionTemplate(): string {
    return `import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { ServiceBusClient } from "@azure/service-bus";
import { {{entityName}}InboundPayload, {{entityName}}InboundSchema } from "./interfaces/{{entityName}}.interface";
import { {{entityName}}Mapper } from "./mappers/{{entityName}}.mapper";
{{#if hasUpsert}}
import { UpsertService } from "./services/upsert-service";
{{/if}}
{{#if hasChangeEvents}}
import { ChangeEventService } from "./services/change-event-service";
{{/if}}

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const correlationId = req.headers["x-correlation-id"] || context.invocationId;
    
    try {
        const validationResult = {{entityName}}InboundSchema.safeParse(req.body);
        if (!validationResult.success) {
            context.res = {
                status: 400,
                body: { error: "Validation failed", details: validationResult.error.errors }
            };
            return;
        }

        const mapper = new {{entityName}}Mapper();
        let outboundEvent = await mapper.map(validationResult.data);

        {{#if hasUpsert}}
        // Handle upsert logic
        const upsertService = new UpsertService();
        const upsertResult = await upsertService.processUpsert(outboundEvent, {
            uniqueFields: {{json upsertConfig.uniqueFields}},
            conflictResolution: "{{upsertConfig.conflictResolution}}"
        });
        outboundEvent = upsertResult.data;
        const operation = upsertResult.operation;
        {{else}}
        const operation = "insert";
        {{/if}}

        {{#if hasChangeEvents}}
        // Generate change event
        const changeEventService = new ChangeEventService();
        const changeEvent = await changeEventService.generateEvent({
            entityName: "{{entityName}}",
            operation,
            newData: outboundEvent,
            eventType: "{{changeEventConfig.eventType}}",
            includeOldValues: {{changeEventConfig.includeOldValues}},
            includeMetadata: {{changeEventConfig.includeMetadata}}
        });

        // Send change event to separate queue
        const sbClient = new ServiceBusClient(process.env.SERVICE_BUS_CONNECTION_STRING!);
        const changeEventSender = sbClient.createSender("{{entityName}}-change-events");
        await changeEventSender.sendMessages({
            body: changeEvent,
            correlationId
        });
        await changeEventSender.close();
        {{/if}}
        
        // Send to Service Bus
        const sbClient = new ServiceBusClient(process.env.SERVICE_BUS_CONNECTION_STRING!);
        const sender = sbClient.createSender("{{queueName}}");
        
        await sender.sendMessages({
            body: outboundEvent,
            correlationId
        });
        
        await sender.close();
        await sbClient.close();
        
        context.res = {
            status: 200,
            body: { success: true, eventId: outboundEvent.id, operation }
        };
        
    } catch (error) {
        context.res = {
            status: 500,
            body: { error: "Processing failed", correlationId }
        };
    }
};

export default httpTrigger;`;
  }

  private getTestTemplate(): string {
    return `import { describe, it, expect } from '@jest/globals';
import { {{entityName}}Mapper } from '../src/mappers/{{entityName}}.mapper';
import { {{entityName}}InboundPayload } from '../src/interfaces/{{entityName}}.interface';

describe('{{entityName}}Mapper', () => {
  let mapper: {{entityName}}Mapper;
  
  beforeEach(() => {
    mapper = new {{entityName}}Mapper();
  });
  
{{#each testCases}}
  it('{{this.description}}', async () => {
    const input: {{../entityName}}InboundPayload = {{this.input}};
    const result = await mapper.map(input);
    
    {{#each this.assertions}}
    expect(result.{{this.field}}).{{this.matcher}}();
    {{/each}}
  });
{{/each}}
});`;
  }

  private getDocumentationTemplate(): string {
    return `# {{entityName}} Entity Documentation

## Overview
- **Name**: {{entityName}}
- **Version**: {{version}}
- **Created**: {{createdAt}}
{{#if description}}
- **Description**: {{description}}
{{/if}}

## Schemas

### Inbound Schema
\`\`\`json
{{{inboundSchema}}}
\`\`\`

### Outbound Schema
\`\`\`json
{{{outboundSchema}}}
\`\`\`

## Mappings

| Source | Target | Transformation | Description |
|--------|--------|----------------|-------------|
{{#each mappings}}
| {{this.source}} | {{this.target}} | {{this.transformation}} | {{this.description}} |
{{/each}}

{{#if valueMappings}}
## Value Mappings

{{#each valueMappings}}
### {{this.name}}
- **Type**: {{this.type}}
{{#if this.description}}
- **Description**: {{this.description}}
{{/if}}
- **Mappings**: {{this.mappingCount}} defined

{{/each}}
{{/if}}

{{#if sampleInput}}
## Sample Input
\`\`\`json
{{{sampleInput}}}
\`\`\`
{{/if}}`;
  }
}
