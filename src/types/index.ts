export interface EntitySchema {
  id: string;
  name: string;
  description?: string;
  isAbstractedModel?: boolean;  // When true, this entity is the central data model that all ins/outs map to
  abstracted?: boolean;  // Simple flag to mark entity as abstracted
  version: string;
  createdAt: string;
  updatedAt?: string;
  inboundSchema: JsonSchema;
  outboundSchema: JsonSchema;
  schemaFormat?: 'json' | 'yaml';  // Format for schema storage and editing
  inboundAbstracted?: boolean;  // Whether inbound schema is abstracted and can be linked to
  outboundAbstracted?: boolean; // Whether outbound schema is abstracted and can be linked to
  outputConfig?: OutputConfiguration;
  metadata?: {
    source: string;
    sampleData?: any;
    structureAnalysis?: StructureAnalysis;
    outputSource?: {
      type: 'manual' | 'api';
      endpoint?: string;
      apiConfig?: any;
    };
    schemaHistory?: SchemaVersion[];
    uniquenessConstraints?: UniquenessConstraint[];  // Required when isAbstractedModel is true
    linkedEntities?: Array<{
      entityId: string;
      direction: 'inbound' | 'outbound';
      linkType: 'reference' | 'inheritance';
      mappingId?: string;
    }>;
  };
}

export interface JsonSchema {
  type?: string;
  properties?: { [key: string]: JsonSchema };
  items?: JsonSchema;
  required?: string[];
  enum?: any[];
  format?: string;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  allOf?: JsonSchema[];
}

export interface Mapping {
  id: string;
  entityId: string;
  source: string;
  target: string;
  transformation: TransformationType;
  template?: string;
  customFunction?: string;
  valueMapId?: string;  // Reference to value mapping
  active: boolean;
  createdAt: string;
  updatedAt?: string;
  subChildConfig?: SubChildMappingConfig; // New field for sub-child mapping
  metadata?: {
    confidence?: number;
    suggestedBy?: 'user' | 'llm' | 'system';
  };
}

export interface ValueMapping {
  id: string;
  name: string;
  description?: string;
  entityId?: string;  // Optional association with entity
  mappings: { [key: string]: any };  // Key-value pairs for mapping
  defaultValue?: any;  // Default when no match found
  caseSensitive: boolean;
  type: ValueMappingType;
  createdAt: string;
  updatedAt?: string;
}

export type ValueMappingType = 
  | 'exact'           // Exact match
  | 'regex'           // Regular expression match
  | 'range'           // Numeric range mapping
  | 'contains'        // Contains substring
  | 'prefix'          // Starts with
  | 'suffix'          // Ends with
  | 'custom';         // Custom function

export type TransformationType = 
  | 'direct'
  | 'template'
  | 'function'
  | 'lookup'
  | 'aggregate'
  | 'conditional'
  | 'value-mapping'   // Value mapping transformation
  | 'sub-child';      // Sub-child mapping with merge/replace

export interface MappingRule {
  source: string;
  target: string;
  transform: TransformationType;
  aggregationFunction?: string;
  template?: string;
  customFunction?: string;
  valueMapId?: string;
}

export interface ValidationRule {
  field: string;
  rule: string;
  value?: any;
  errorMessage: string;
}

export interface QueueConfiguration {
  queueName: string;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
  };
}

export interface TelemetryConfig {
  logLevel: 'Debug' | 'Info' | 'Warning' | 'Error';
  customDimensions: string[];
}

export interface StructureAnalysis {
  depth: number;
  fieldCount: number;
  arrayFields: string[];
  nestedObjects: string[];
  dataTypes: { [field: string]: string };
}

export interface BrokenMapping {
  mapping: Mapping;
  errors: string[];
  suggestions: string[];
}

export interface MappingChanges {
  added: Mapping[];
  modified: Mapping[];
  removed: Mapping[];
}

export interface Field {
  path: string;
  type: string;
  required: boolean;
  description?: string;
  example?: any;
}

export interface MappingSuggestion {
  targetField: string;
  confidence: number;
  transformation: TransformationType;
  reason: string;
  valueMapId?: string;
}

export interface MappingContext {
  entityType: string;
  industry?: string;
  previousMappings?: Mapping[];
  sampleData?: any[];
}

export interface CodeGenerationContext {
  entityId: string;
  platform: 'azure' | 'node-red' | 'both';
  includeTests: boolean;
  includeDocumentation: boolean;
  customTemplates?: { [key: string]: string };
}

export interface GeneratedFiles {
  interfaces?: string;
  mapper?: string;
  azureFunction?: string;
  nodeRedFlow?: string;
  tests?: string;
  documentation?: string;
  [key: string]: string | undefined;
}

export interface TestCase {
  description: string;
  input: any;
  expected?: any;
  assertions: Array<{
    field: string;
    matcher: string;
    expected: any;
  }>;
}

// Value mapping specific types
export interface ValueMappingRule {
  pattern: string | RegExp | number[];  // Pattern to match
  value: any;                           // Value to map to
  metadata?: {
    description?: string;
    example?: string;
  };
}

export interface ValueMappingResult {
  matched: boolean;
  value: any;
  rule?: ValueMappingRule;
  confidence?: number;
}

// New types for extended functionality
export interface OutputConfiguration {
  upsertConfig?: UpsertConfiguration;
  changeEventConfig?: ChangeEventConfiguration;
  validationRules?: ValidationRule[];
  schemaSource?: OutputSchemaSource;
}

export interface OutputSchemaSource {
  type: 'manual' | 'api';
  endpoint?: string;
  headers?: { [key: string]: string };
  refreshInterval?: number; // minutes
  lastFetched?: string;
  schemaPath?: string; // JSONPath to schema in API response
}

export interface UpsertConfiguration {
  enabled: boolean;
  uniqueFields: string[];
  conflictResolution: 'update' | 'merge' | 'skip' | 'error';
  compareFields?: string[];
  mergeStrategy?: 'shallow' | 'deep';
}

export interface ChangeEventConfiguration {
  enabled: boolean;
  eventType: string;
  includeOldValues: boolean;
  includeMetadata: boolean;
  targetQueue?: string;
  targetTopic?: string;
  customProperties?: { [key: string]: any };
  batchSize?: number;
  format?: 'cloudevents' | 'custom';
}

export interface ChangeEvent {
  id: string;
  entityId: string;
  eventType: string;
  timestamp: string;
  data: {
    new: any;
    old?: any;
    changes?: FieldChange[];
  };
  metadata?: any;
}

export interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
  operation: 'add' | 'update' | 'delete';
}

export interface SchemaVersion {
  schema: JsonSchema;
  timestamp: string;
  version: string;
  current?: boolean;
}

// Sub-child mapping configuration
export interface SubChildMappingConfig {
  operation: 'merge' | 'replace';
  lookupKey?: string;          // Key to use for looking up the sub-child item
  lookupSource?: string;       // Path to lookup source (e.g., external API, database)
  mergeStrategy?: 'shallow' | 'deep'; // How to merge when operation is 'merge'
  preserveFields?: string[];   // Fields to preserve during merge
  mappings?: Mapping[];        // Sub-mappings for the child object
  fallbackBehavior?: 'skip' | 'use-original' | 'use-default' | 'error';
  defaultValue?: any;          // Default value if lookup fails and fallback is 'use-default'
}

// Uniqueness constraint for abstracted models
export interface UniquenessConstraint {
  id: string;
  name: string;
  fields: string[];           // Field paths that form the unique key
  active: boolean;
  type: 'primary' | 'unique'; // Primary key or unique constraint
  description?: string;
  createdAt: string;
  updatedAt?: string;
}
