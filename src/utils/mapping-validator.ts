import { Mapping, EntitySchema, JsonSchema } from '../types';
import * as jsonpath from 'jsonpath';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  suggestions: string[];
}

export class MappingValidator {
  validate(mapping: Mapping, entity: EntitySchema): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      suggestions: []
    };

    // Validate source field exists
    if (mapping.source && !mapping.source.startsWith('_system.')) {
      const sourceValid = this.validatePath(mapping.source, entity.inboundSchema);
      if (!sourceValid) {
        result.isValid = false;
        result.errors.push(`Source field '${mapping.source}' not found in entity schema`);
        result.suggestions.push(...this.suggestSimilarPaths(mapping.source, entity.inboundSchema));
      }
    }

    // Validate target field exists
    if (mapping.target) {
      const targetValid = this.validatePath(mapping.target, entity.outboundSchema);
      if (!targetValid) {
        result.isValid = false;
        result.errors.push(`Target field '${mapping.target}' not found in output schema`);
        result.suggestions.push(...this.suggestSimilarPaths(mapping.target, entity.outboundSchema));
      }
    }

    // Validate transformation type requirements
    switch (mapping.transformation) {
      case 'template':
        if (!mapping.template) {
          result.isValid = false;
          result.errors.push('Template transformation requires a template string');
          result.suggestions.push('Add a template property with placeholders like "${fieldName}"');
        }
        break;
      
      case 'function':
        if (!mapping.customFunction) {
          result.isValid = false;
          result.errors.push('Function transformation requires a custom function');
          result.suggestions.push('Add a customFunction property with JavaScript code');
        } else {
          const functionValid = this.validateCustomFunction(mapping.customFunction);
          if (!functionValid.isValid) {
            result.isValid = false;
            result.errors.push(...functionValid.errors);
            result.suggestions.push(...functionValid.suggestions);
          }
        }
        break;
      
      case 'value-mapping':
        if (!mapping.valueMapId) {
          result.isValid = false;
          result.errors.push('Value mapping transformation requires a valueMapId');
          result.suggestions.push('Create and reference a value mapping configuration');
        }
        break;
      
      case 'aggregate':
        if (!mapping.template) {
          result.isValid = false;
          result.errors.push('Aggregate transformation requires an aggregation function');
          result.suggestions.push('Specify an aggregation function: sum, count, avg, min, max');
        }
        break;
    }

    // Validate data type compatibility
    if (mapping.source && mapping.target) {
      const typeCheck = this.checkTypeCompatibility(
        mapping.source,
        mapping.target,
        entity.inboundSchema,
        entity.outboundSchema,
        mapping.transformation
      );
      
      if (!typeCheck.compatible) {
        result.errors.push(typeCheck.error || 'Type incompatibility detected');
        result.suggestions.push(...(typeCheck.suggestions || []));
      }
    }

    return result;
  }

  private validatePath(path: string, schema: JsonSchema): boolean {
    if (!schema.properties) {
      return false;
    }

    const parts = path.split('.');
    let currentSchema = schema;

    for (const part of parts) {
      if (currentSchema.type === 'object' && currentSchema.properties && currentSchema.properties[part]) {
        currentSchema = currentSchema.properties[part];
      } else if (currentSchema.type === 'array' && currentSchema.items) {
        currentSchema = currentSchema.items;
      } else {
        return false;
      }
    }

    return true;
  }

  private suggestSimilarPaths(path: string, schema: JsonSchema): string[] {
    const allPaths = this.extractAllPaths(schema);
    const suggestions: string[] = [];
    const pathParts = path.split('.');
    const lastPart = pathParts[pathParts.length - 1].toLowerCase();

    for (const availablePath of allPaths) {
      const availableParts = availablePath.split('.');
      const availableLastPart = availableParts[availableParts.length - 1].toLowerCase();
      
      // Check for similar field names
      if (availableLastPart.includes(lastPart) || lastPart.includes(availableLastPart)) {
        suggestions.push(`Did you mean '${availablePath}'?`);
      }
    }

    return suggestions.slice(0, 3);  // Return top 3 suggestions
  }

  private extractAllPaths(schema: JsonSchema, prefix: string = ''): string[] {
    const paths: string[] = [];

    if (schema.type === 'object' && schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        paths.push(fullPath);
        
        if (prop.type === 'object' || prop.type === 'array') {
          paths.push(...this.extractAllPaths(prop, fullPath));
        }
      }
    }

    return paths;
  }

  private validateCustomFunction(functionBody: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      suggestions: []
    };

    try {
      // Try to create function to check syntax
      new Function('value', 'data', 'jsonpath', functionBody);
    } catch (error: any) {
      result.isValid = false;
      result.errors.push(`Invalid function syntax: ${error.message}`);
      result.suggestions.push('Ensure your function returns a value and has valid JavaScript syntax');
      result.suggestions.push('Example: return value.toUpperCase();');
    }

    // Check for common issues
    if (!functionBody.includes('return')) {
      result.errors.push('Function should return a value');
      result.suggestions.push('Add a return statement to your function');
    }

    return result;
  }

  private checkTypeCompatibility(
    sourcePath: string,
    targetPath: string,
    inSchema: JsonSchema,
    outSchema: JsonSchema,
    transformation: string
  ): { compatible: boolean; error?: string; suggestions?: string[] } {
    const sourceType = this.getFieldType(sourcePath, inSchema);
    const targetType = this.getFieldType(targetPath, outSchema);

    if (!sourceType || !targetType) {
      return { compatible: true };  // Can't determine types, assume compatible
    }

    // Check based on transformation type
    switch (transformation) {
      case 'direct':
        if (sourceType !== targetType) {
          return {
            compatible: false,
            error: `Type mismatch: source is ${sourceType} but target expects ${targetType}`,
            suggestions: [
              'Use a function transformation to convert types',
              'Use a template transformation for string conversion',
              'Ensure source and target types match'
            ]
          };
        }
        break;
      
      case 'template':
        if (targetType !== 'string') {
          return {
            compatible: false,
            error: `Template transformation always produces strings, but target expects ${targetType}`,
            suggestions: [
              'Change target field to string type',
              'Use a function transformation for type conversion'
            ]
          };
        }
        break;
      
      case 'aggregate':
        if (sourceType !== 'array') {
          return {
            compatible: false,
            error: 'Aggregate transformation requires source to be an array',
            suggestions: [
              'Ensure source field is an array',
              'Use a different transformation type for non-array fields'
            ]
          };
        }
        break;
    }

    return { compatible: true };
  }

  private getFieldType(path: string, schema: JsonSchema): string | null {
    const parts = path.split('.');
    let currentSchema = schema;

    for (const part of parts) {
      if (currentSchema.type === 'object' && currentSchema.properties && currentSchema.properties[part]) {
        currentSchema = currentSchema.properties[part];
      } else if (currentSchema.type === 'array' && currentSchema.items) {
        currentSchema = currentSchema.items;
      } else {
        return null;
      }
    }

    return currentSchema.type || null;
  }

  // Validate entire mapping set for completeness
  validateMappingCompleteness(mappings: Mapping[], entity: EntitySchema): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      suggestions: []
    };

    const requiredOutputFields = this.getRequiredFields(entity.outboundSchema);
    const mappedTargetFields = new Set(mappings.map(m => m.target));

    for (const requiredField of requiredOutputFields) {
      if (!mappedTargetFields.has(requiredField)) {
        result.errors.push(`Required output field '${requiredField}' is not mapped`);
        result.suggestions.push(`Create a mapping for required field '${requiredField}'`);
      }
    }

    if (result.errors.length > 0) {
      result.isValid = false;
    }

    return result;
  }

  private getRequiredFields(schema: JsonSchema, prefix: string = ''): string[] {
    const required: string[] = [];

    if (schema.type === 'object' && schema.properties && schema.required) {
      for (const requiredField of schema.required) {
        const fullPath = prefix ? `${prefix}.${requiredField}` : requiredField;
        required.push(fullPath);
        
        const fieldSchema = schema.properties[requiredField];
        if (fieldSchema && fieldSchema.type === 'object') {
          required.push(...this.getRequiredFields(fieldSchema, fullPath));
        }
      }
    }

    return required;
  }
}
