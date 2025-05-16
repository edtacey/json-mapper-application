import { EntitySchema, Mapping, MappingSuggestion, Field, MappingContext, ValueMapping } from '../types';

export class LLMService {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.model = process.env.LLM_MODEL || 'gpt-4';
  }

  async enhanceEntitySchema(schema: EntitySchema): Promise<EntitySchema> {
    const prompt = `
      Analyze this entity schema and enhance it with:
      1. Proper field descriptions
      2. Validation rules
      3. Data format specifications
      4. Business logic hints
      5. Suggested value mappings for enum fields
      
      Entity Schema:
      ${JSON.stringify(schema, null, 2)}
      
      Return enhanced schema with intelligent defaults and patterns detected.
    `;

    try {
      const response = await this.callLLM(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Error enhancing entity schema:', error);
      return schema;
    }
  }

  async refreshMappings(
    entity: EntitySchema, 
    currentMappings: Mapping[], 
    context?: string
  ): Promise<Mapping[]> {
    const prompt = `
      Review and refresh these data mappings for entity "${entity.name}".
      
      Current Entity Schema:
      ${JSON.stringify(entity, null, 2)}
      
      Current Mappings:
      ${JSON.stringify(currentMappings, null, 2)}
      
      ${context ? `Additional Context: ${context}` : ''}
      
      Tasks:
      1. Identify missing mappings
      2. Fix broken field references
      3. Suggest better transformation functions
      4. Add any required business logic mappings
      5. Suggest value mappings for fields with standard patterns (status, country codes, etc)
      6. Ensure all required output fields are mapped
      
      Return updated mappings array with value-mapping transformations where appropriate.
    `;

    try {
      const response = await this.callLLM(prompt);
      const refreshedMappings = JSON.parse(response);
      return this.validateAndNormalizeMappings(refreshedMappings, entity);
    } catch (error) {
      console.error('Error refreshing mappings:', error);
      return currentMappings;
    }
  }

  async suggestMapping(
    sourceField: Field,
    targetFields: Field[],
    context: MappingContext
  ): Promise<MappingSuggestion[]> {
    const prompt = `
      Suggest the best mapping for this source field to available target fields.
      
      Source Field:
      ${JSON.stringify(sourceField, null, 2)}
      
      Available Target Fields:
      ${JSON.stringify(targetFields, null, 2)}
      
      Context:
      - Entity Type: ${context.entityType}
      - Industry: ${context.industry}
      - Previous Mappings: ${JSON.stringify(context.previousMappings)}
      - Sample Data: ${JSON.stringify(context.sampleData)}
      
      Consider:
      1. Semantic similarity
      2. Data type compatibility
      3. Common patterns in ${context.industry}
      4. Required transformations
      5. Need for value mappings (e.g., status codes, country names)
      
      Return top 3 suggestions with confidence scores and transformation type.
      Include value mapping suggestions where appropriate.
    `;

    try {
      const response = await this.callLLM(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Error suggesting mapping:', error);
      return [];
    }
  }

  async suggestValueMappings(
    fieldData: { fieldName: string; sampleValues: any[] },
    context?: { industry?: string; entityType?: string }
  ): Promise<ValueMapping> {
    const prompt = `
      Analyze these sample values for field "${fieldData.fieldName}" and suggest appropriate value mappings.
      
      Sample Values:
      ${JSON.stringify(fieldData.sampleValues, null, 2)}
      
      Context:
      ${context ? JSON.stringify(context, null, 2) : 'General context'}
      
      Tasks:
      1. Identify patterns in the values
      2. Suggest standardized mappings
      3. Choose appropriate mapping type (exact, regex, range, etc.)
      4. Provide a default value for unmapped cases
      
      Return a ValueMapping object with:
      - name: descriptive name for the mapping
      - description: what this mapping does
      - mappings: key-value pairs for transformation
      - type: exact, regex, range, etc.
      - caseSensitive: whether to consider case
      - defaultValue: what to use when no match
    `;

    try {
      const response = await this.callLLM(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Error suggesting value mappings:', error);
      throw error;
    }
  }

  async generateCodeFromMapping(
    entity: EntitySchema,
    mappings: Mapping[],
    platform: 'azure' | 'node-red'
  ): Promise<string> {
    const prompt = `
      Generate ${platform} code for processing this entity with the given mappings.
      
      Entity: ${entity.name}
      Entity Schema:
      ${JSON.stringify(entity, null, 2)}
      
      Mappings:
      ${JSON.stringify(mappings, null, 2)}
      
      Requirements:
      1. Handle all mapping transformations including value mappings
      2. Include error handling
      3. Add comprehensive logging
      4. Follow ${platform} best practices
      5. Include inline comments explaining complex mappings
      
      Generate production-ready code.
    `;

    try {
      const response = await this.callLLM(prompt);
      return response;
    } catch (error) {
      console.error('Error generating code:', error);
      throw error;
    }
  }

  async analyzeBrokenMappings(
    brokenMappings: any[],
    entity: EntitySchema
  ): Promise<any[]> {
    const prompt = `
      Analyze these broken mappings and provide solutions.
      
      Entity Schema:
      ${JSON.stringify(entity, null, 2)}
      
      Broken Mappings:
      ${JSON.stringify(brokenMappings, null, 2)}
      
      For each broken mapping:
      1. Identify the root cause
      2. Suggest fixes
      3. Recommend alternative approaches
      4. Provide corrected mapping configuration
      
      Return array of solutions.
    `;

    try {
      const response = await this.callLLM(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Error analyzing broken mappings:', error);
      return [];
    }
  }

  private async callLLM(prompt: string): Promise<string> {
    // This is a placeholder for actual LLM API calls
    // In production, you would use OpenAI, Azure OpenAI, or other LLM services
    
    if (!this.apiKey) {
      throw new Error('LLM API key not configured');
    }

    // Example with OpenAI (you'll need to install and import the OpenAI SDK)
    /*
    const openai = new OpenAI({ apiKey: this.apiKey });
    const response = await openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: "You are an expert in data mapping and transformation." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3
    });
    
    return response.choices[0].message.content || '';
    */

    // Mock response for development
    console.log('LLM Prompt:', prompt);
    return JSON.stringify({
      status: 'mock_response',
      message: 'LLM integration pending'
    });
  }

  private validateAndNormalizeMappings(mappings: any[], entity: EntitySchema): Mapping[] {
    return mappings.map(mapping => ({
      id: mapping.id || this.generateId(),
      entityId: entity.id,
      source: mapping.source,
      target: mapping.target,
      transformation: mapping.transformation || 'direct',
      template: mapping.template,
      customFunction: mapping.customFunction,
      valueMapId: mapping.valueMapId,
      active: mapping.active !== false,
      createdAt: mapping.createdAt || new Date().toISOString(),
      updatedAt: mapping.updatedAt,
      metadata: mapping.metadata
    }));
  }

  private generateId(): string {
    return `mapping_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
