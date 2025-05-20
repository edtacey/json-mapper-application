export interface EntitySchema {
  id: string;
  name: string;
  description?: string;
  isAbstractedModel?: boolean;
  abstracted?: boolean;
  inboundAbstracted?: boolean;
  outboundAbstracted?: boolean;
  schemaFormat?: 'json' | 'yaml';
  version: string;
  createdAt: string;
  updatedAt?: string;
  inboundSchema: JsonSchema;
  outboundSchema: JsonSchema;
  outputConfig?: OutputConfiguration;
  upsertConfig?: UpsertConfiguration;
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
    uniquenessConstraints?: UniquenessConstraint[];
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

export interface OutputConfiguration {
  upsertConfig?: UpsertConfiguration;
  changeEventConfig?: ChangeEventConfiguration;
  validationRules?: ValidationRule[];
  schemaSource?: OutputSchemaSource;
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

export interface UniquenessConstraint {
  id: string;
  name: string;
  fields: string[];
  active: boolean;
  type: 'primary' | 'unique';
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface StructureAnalysis {
  depth: number;
  fieldCount: number;
  arrayFields: string[];
  nestedObjects: string[];
  dataTypes: { [field: string]: string };
}

export interface SchemaVersion {
  schema: JsonSchema;
  timestamp: string;
  version: string;
  current?: boolean;
}

export interface OutputSchemaSource {
  type: 'manual' | 'api';
  endpoint?: string;
  headers?: { [key: string]: string };
  refreshInterval?: number;
  lastFetched?: string;
  schemaPath?: string;
}

export interface ValidationRule {
  field: string;
  rule: string;
  value?: any;
  errorMessage: string;
}

export interface Mapping {
  id: string;
  entityId: string;
  source: string;
  target: string;
  transformation: TransformationType;
  template?: string;
  customFunction?: string;
  valueMapId?: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
  subChildConfig?: SubChildMappingConfig;
  metadata?: {
    confidence?: number;
    suggestedBy?: 'user' | 'llm' | 'system';
  };
}

export type TransformationType = 
  | 'direct'
  | 'template'
  | 'function'
  | 'lookup'
  | 'aggregate'
  | 'conditional'
  | 'value-mapping'
  | 'sub-child';

export interface SubChildMappingConfig {
  operation: 'merge' | 'replace';
  lookupKey?: string;
  lookupSource?: string;
  mergeStrategy?: 'shallow' | 'deep';
  preserveFields?: string[];
  mappings?: Mapping[];
  fallbackBehavior?: 'skip' | 'use-original' | 'use-default' | 'error';
  defaultValue?: any;
}
