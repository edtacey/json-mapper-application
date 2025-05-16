import { JsonSchema } from '../types';

export class JsonSchemaGenerator {
  generate(sample: any): JsonSchema {
    if (sample === null) {
      return { type: 'null' };
    }

    if (Array.isArray(sample)) {
      return this.generateArraySchema(sample);
    }

    const type = typeof sample;

    switch (type) {
      case 'boolean':
        return { type: 'boolean' };
      
      case 'number':
        return this.generateNumberSchema(sample);
      
      case 'string':
        return this.generateStringSchema(sample);
      
      case 'object':
        return this.generateObjectSchema(sample);
      
      default:
        return { type: 'string' };
    }
  }

  private generateArraySchema(sample: any[]): JsonSchema {
    if (sample.length === 0) {
      return { type: 'array', items: {} };
    }

    // Analyze all items to find common schema
    const itemSchemas = sample.map(item => this.generate(item));
    const mergedItemSchema = this.mergeSchemas(itemSchemas);

    return {
      type: 'array',
      items: mergedItemSchema,
      minItems: 0,
      maxItems: 10000
    };
  }

  private generateObjectSchema(sample: any): JsonSchema {
    const properties: { [key: string]: JsonSchema } = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(sample)) {
      properties[key] = this.generate(value);
      
      // Assume all fields in sample are required
      // This can be refined based on multiple samples
      required.push(key);
    }

    return {
      type: 'object',
      properties,
      required
    };
  }

  private generateNumberSchema(sample: number): JsonSchema {
    const schema: JsonSchema = { type: 'number' };

    if (Number.isInteger(sample)) {
      schema.type = 'integer';
    }

    // Add reasonable bounds
    if (sample >= 0) {
      schema.minimum = 0;
    }

    return schema;
  }

  private generateStringSchema(sample: string): JsonSchema {
    const schema: JsonSchema = { type: 'string' };

    // Detect patterns
    if (this.isEmail(sample)) {
      schema.format = 'email';
    } else if (this.isUrl(sample)) {
      schema.format = 'uri';
    } else if (this.isDate(sample)) {
      schema.format = 'date-time';
    } else if (this.isUuid(sample)) {
      schema.format = 'uuid';
    }

    // Add pattern if detected
    const pattern = this.detectPattern(sample);
    if (pattern) {
      schema.pattern = pattern;
    }

    // Add length constraints
    if (sample.length > 0) {
      schema.minLength = 1;
      schema.maxLength = Math.max(sample.length * 2, 255);
    }

    return schema;
  }

  private mergeSchemas(schemas: JsonSchema[]): JsonSchema {
    if (schemas.length === 0) {
      return {};
    }

    if (schemas.length === 1) {
      return schemas[0];
    }

    // Check if all schemas have the same type
    const types = schemas.map(s => s.type);
    const uniqueTypes = [...new Set(types)];

    if (uniqueTypes.length === 1) {
      // All same type, merge properties
      const baseSchema: JsonSchema = { type: uniqueTypes[0] };

      if (uniqueTypes[0] === 'object') {
        // Merge object properties
        const allProperties: { [key: string]: JsonSchema[] } = {};
        const requiredFields = new Set<string>();

        for (const schema of schemas) {
          if (schema.properties) {
            for (const [key, prop] of Object.entries(schema.properties)) {
              if (!allProperties[key]) {
                allProperties[key] = [];
              }
              allProperties[key].push(prop);
            }
          }
          
          if (schema.required) {
            schema.required.forEach(field => requiredFields.add(field));
          }
        }

        baseSchema.properties = {};
        for (const [key, propSchemas] of Object.entries(allProperties)) {
          baseSchema.properties[key] = this.mergeSchemas(propSchemas);
        }

        if (requiredFields.size > 0) {
          baseSchema.required = Array.from(requiredFields);
        }
      }

      return baseSchema;
    } else {
      // Multiple types, use anyOf
      return {
        anyOf: schemas
      };
    }
  }

  private isEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  private isUrl(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  private isDate(value: string): boolean {
    const date = new Date(value);
    return !isNaN(date.getTime()) && value.includes('-');
  }

  private isUuid(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  private detectPattern(value: string): string | null {
    // Check for common patterns
    if (/^[A-Z]{2,3}$/.test(value)) {
      return '^[A-Z]{2,3}$';  // Country/currency codes
    }
    
    if (/^[A-Z0-9]{6,10}$/.test(value)) {
      return '^[A-Z0-9]{6,10}$';  // ID patterns
    }
    
    if (/^\+?[1-9]\d{1,14}$/.test(value)) {
      return '^\\+?[1-9]\\d{1,14}$';  // Phone numbers
    }
    
    return null;
  }

  // Advanced features for better schema generation
  generateFromMultipleSamples(samples: any[]): JsonSchema {
    if (samples.length === 0) {
      return {};
    }

    const schemas = samples.map(sample => this.generate(sample));
    return this.mergeSchemas(schemas);
  }

  refineSchema(schema: JsonSchema, additionalSamples: any[]): JsonSchema {
    const newSchemas = additionalSamples.map(sample => this.generate(sample));
    return this.mergeSchemas([schema, ...newSchemas]);
  }

  // Generate TypeScript interface from schema
  schemaToTypeScript(schema: JsonSchema, name: string): string {
    let result = `export interface ${name} {\n`;
    
    if (schema.type === 'object' && schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        const isRequired = schema.required?.includes(key);
        const optionalMark = isRequired ? '' : '?';
        const type = this.jsonSchemaTypeToTypeScript(prop);
        result += `  ${key}${optionalMark}: ${type};\n`;
      }
    }
    
    result += '}\n';
    return result;
  }

  private jsonSchemaTypeToTypeScript(schema: JsonSchema): string {
    switch (schema.type) {
      case 'string':
        return schema.enum ? schema.enum.map(v => `'${v}'`).join(' | ') : 'string';
      case 'number':
      case 'integer':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'array':
        return `${this.jsonSchemaTypeToTypeScript(schema.items || {})}[]`;
      case 'object':
        if (schema.properties) {
          const props = Object.entries(schema.properties)
            .map(([k, v]) => `${k}: ${this.jsonSchemaTypeToTypeScript(v)}`)
            .join('; ');
          return `{ ${props} }`;
        }
        return 'Record<string, any>';
      case 'null':
        return 'null';
      default:
        return 'any';
    }
  }
}
