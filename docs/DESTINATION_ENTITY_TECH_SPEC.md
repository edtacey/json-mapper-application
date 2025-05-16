# Destination Entity Management - Technical Specification

## 1. Type Definitions

```typescript
// Extend existing EntitySchema
export interface EntitySchema {
  // ... existing fields
  isDestination?: boolean;
  destinationEntityId?: string; // For source entities linked to destinations
  usageCount?: number; // For destination entities
}

// New types
export interface DestinationEntity extends EntitySchema {
  isDestination: true;
  linkedSources: string[]; // Source entity IDs using this destination
  isShared: boolean; // Can be reused
  isLocked?: boolean; // Prevent modifications when in use
}

export interface EntityRelationship {
  id: string;
  sourceEntityId: string;
  destinationEntityId: string;
  mappingId?: string;
  createdAt: string;
  updatedAt?: string;
  metadata?: {
    compatibility: number; // 0-100 compatibility score
    autoMapped: boolean;
    conflicts?: SchemaConflict[];
  };
}

export interface SchemaConflict {
  field: string;
  sourceType: string;
  destinationType: string;
  resolution?: 'ignore' | 'transform' | 'error';
}

export interface DestinationCloneOptions {
  name: string;
  description?: string;
  modifySchema?: boolean;
  inheritRelationships?: boolean;
}
```

## 2. API Specification

### Destination Entity Endpoints

```typescript
// Create destination entity from sample
POST /api/destination-entities/generate
Body: {
  samplePayload: object;
  entityName: string;
  description?: string;
  isShared?: boolean;
}
Response: { entity: DestinationEntity }

// Import from external API
POST /api/destination-entities/import
Body: {
  apiEndpoint: string;
  method: string;
  headers?: object;
  entityName: string;
}
Response: { entity: DestinationEntity }

// List destination entities
GET /api/destination-entities
Query: {
  shared?: boolean;
  inUse?: boolean;
  search?: string;
}
Response: { entities: DestinationEntity[] }

// Get specific destination
GET /api/destination-entities/:id
Response: { entity: DestinationEntity }

// Update destination entity
PUT /api/destination-entities/:id
Body: {
  name?: string;
  description?: string;
  schema?: JsonSchema;
  isShared?: boolean;
}
Response: { entity: DestinationEntity }

// Delete destination entity
DELETE /api/destination-entities/:id
Query: { force?: boolean }
Response: { success: boolean; affectedSources?: string[] }

// Clone destination entity
POST /api/destination-entities/:id/clone
Body: DestinationCloneOptions
Response: { entity: DestinationEntity }

// Get linked source entities
GET /api/destination-entities/:id/sources
Response: { sources: EntitySchema[] }
```

### Source-Destination Relationship Endpoints

```typescript
// Link destination to source
POST /api/entities/:id/link-destination
Body: {
  destinationEntityId: string;
  autoMap?: boolean;
}
Response: { 
  relationship: EntityRelationship;
  suggestedMappings?: Mapping[];
}

// Unlink destination from source
DELETE /api/entities/:id/unlink-destination
Response: { success: boolean }

// Get relationship details
GET /api/entities/:id/destination-relationship
Response: { 
  relationship: EntityRelationship;
  destination: DestinationEntity;
}
```

## 3. Service Implementation

### DestinationEntityService

```typescript
export class DestinationEntityService {
  private dataStore: DataStore;
  private entityService: EntityService;
  private mappingService: MappingService;

  constructor() {
    this.dataStore = new DataStore('./data/destination-entities');
    this.entityService = new EntityService();
    this.mappingService = new MappingService();
  }

  async createFromSample(
    samplePayload: any,
    entityName: string,
    options?: CreateDestinationOptions
  ): Promise<DestinationEntity> {
    // Generate schema from sample
    const schema = this.schemaGenerator.generate(samplePayload);
    
    const destination: DestinationEntity = {
      id: this.generateId(),
      name: entityName,
      description: options?.description,
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      isDestination: true,
      linkedSources: [],
      isShared: options?.isShared ?? true,
      inboundSchema: schema, // For destinations, this represents the expected output
      outboundSchema: schema, // Same schema for consistency
      metadata: {
        source: 'sample_payload',
        sampleData: samplePayload
      }
    };

    return this.dataStore.save(destination);
  }

  async linkToSource(
    sourceId: string,
    destinationId: string,
    options?: LinkOptions
  ): Promise<EntityRelationship> {
    const source = await this.entityService.getById(sourceId);
    const destination = await this.getById(destinationId);
    
    if (!source || !destination) {
      throw new Error('Source or destination not found');
    }

    // Check compatibility
    const compatibility = this.checkSchemaCompatibility(
      source.inboundSchema,
      destination.inboundSchema
    );

    // Create relationship
    const relationship: EntityRelationship = {
      id: this.generateId(),
      sourceEntityId: sourceId,
      destinationEntityId: destinationId,
      createdAt: new Date().toISOString(),
      metadata: {
        compatibility: compatibility.score,
        autoMapped: options?.autoMap ?? false,
        conflicts: compatibility.conflicts
      }
    };

    // Update entities
    await this.entityService.update(sourceId, {
      destinationEntityId: destinationId
    });

    await this.update(destinationId, {
      linkedSources: [...destination.linkedSources, sourceId],
      usageCount: (destination.usageCount || 0) + 1
    });

    // Auto-generate mappings if requested
    if (options?.autoMap) {
      await this.generateAutoMappings(source, destination);
    }

    return relationship;
  }

  async clone(
    destinationId: string,
    options: DestinationCloneOptions
  ): Promise<DestinationEntity> {
    const original = await this.getById(destinationId);
    if (!original) {
      throw new Error('Destination not found');
    }

    const cloned: DestinationEntity = {
      ...original,
      id: this.generateId(),
      name: options.name,
      description: options.description || `Clone of ${original.name}`,
      linkedSources: options.inheritRelationships ? [...original.linkedSources] : [],
      createdAt: new Date().toISOString(),
      version: '1.0.0'
    };

    if (options.modifySchema) {
      // Allow schema modifications during clone
      cloned.isLocked = false;
    }

    return this.dataStore.save(cloned);
  }

  async delete(destinationId: string, force: boolean = false): Promise<void> {
    const destination = await this.getById(destinationId);
    if (!destination) {
      throw new Error('Destination not found');
    }

    if (destination.linkedSources.length > 0 && !force) {
      throw new Error('Cannot delete destination in use. Use force=true to override.');
    }

    // Unlink all sources if forcing
    if (force) {
      for (const sourceId of destination.linkedSources) {
        await this.unlinkFromSource(sourceId, destinationId);
      }
    }

    await this.dataStore.delete(destinationId);
  }

  private checkSchemaCompatibility(
    sourceSchema: JsonSchema,
    destinationSchema: JsonSchema
  ): { score: number; conflicts: SchemaConflict[] } {
    const conflicts: SchemaConflict[] = [];
    let compatibleFields = 0;
    let totalFields = 0;

    // Deep schema comparison logic
    const compareSchemas = (source: any, dest: any, path: string = '') => {
      // Implementation details...
    };

    compareSchemas(sourceSchema, destinationSchema);

    const score = totalFields > 0 ? (compatibleFields / totalFields) * 100 : 0;
    return { score, conflicts };
  }
}
```

## 4. UI Component Structure

### DestinationEntityList Component

```tsx
interface DestinationEntityListProps {
  onSelect?: (destination: DestinationEntity) => void;
  onEdit?: (id: string) => void;
  onClone?: (id: string) => void;
  filterOptions?: {
    showShared?: boolean;
    showInUse?: boolean;
    searchTerm?: string;
  };
}

export const DestinationEntityList: React.FC<DestinationEntityListProps> = ({
  onSelect,
  onEdit,
  onClone,
  filterOptions
}) => {
  const { data: destinations, isLoading } = useQuery(
    ['destination-entities', filterOptions],
    () => api.destinationEntities.list(filterOptions)
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {destinations?.map((dest) => (
        <DestinationCard
          key={dest.id}
          destination={dest}
          onSelect={() => onSelect?.(dest)}
          onEdit={() => onEdit?.(dest.id)}
          onClone={() => onClone?.(dest.id)}
        />
      ))}
    </div>
  );
};
```

### LinkDestinationModal Component

```tsx
interface LinkDestinationModalProps {
  sourceEntityId: string;
  isOpen: boolean;
  onClose: () => void;
  onLink: (destinationId: string) => void;
}

export const LinkDestinationModal: React.FC<LinkDestinationModalProps> = ({
  sourceEntityId,
  isOpen,
  onClose,
  onLink
}) => {
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);
  const [createNew, setCreateNew] = useState(false);

  const handleLink = async () => {
    if (selectedDestination) {
      await api.entities.linkDestination(sourceEntityId, {
        destinationEntityId: selectedDestination,
        autoMap: true
      });
      onLink(selectedDestination);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Link Destination Entity</h2>
        
        <Tabs>
          <TabPanel label="Select Existing">
            <DestinationEntityList
              onSelect={(dest) => setSelectedDestination(dest.id)}
              filterOptions={{ showShared: true }}
            />
          </TabPanel>
          
          <TabPanel label="Create New">
            <DestinationEntityEditor
              mode="create"
              onSave={(dest) => {
                setSelectedDestination(dest.id);
                setCreateNew(false);
              }}
            />
          </TabPanel>
        </Tabs>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleLink}
            disabled={!selectedDestination}
          >
            Link Destination
          </Button>
        </div>
      </div>
    </Modal>
  );
};
```

## 5. State Management

```typescript
// Redux slice for destination entities
export const destinationEntitySlice = createSlice({
  name: 'destinationEntities',
  initialState: {
    entities: [],
    relationships: [],
    selectedDestination: null,
    isLoading: false,
    error: null
  },
  reducers: {
    setDestinations: (state, action) => {
      state.entities = action.payload;
    },
    addDestination: (state, action) => {
      state.entities.push(action.payload);
    },
    updateDestination: (state, action) => {
      const index = state.entities.findIndex(e => e.id === action.payload.id);
      if (index !== -1) {
        state.entities[index] = action.payload;
      }
    },
    removeDestination: (state, action) => {
      state.entities = state.entities.filter(e => e.id !== action.payload);
    },
    setRelationships: (state, action) => {
      state.relationships = action.payload;
    }
  }
});
```

## 6. Migration Strategy

```typescript
// Migration script for existing entities
export async function migrateToDestinationEntities() {
  const entities = await entityService.list();
  
  for (const entity of entities) {
    // Skip if already processed
    if (entity.isDestination !== undefined) continue;
    
    // Determine if this should be a destination
    const isUsedAsDestination = await checkIfUsedAsDestination(entity);
    
    if (isUsedAsDestination) {
      // Create destination entity
      const destination = await destinationService.createFromEntity(entity);
      
      // Find and link source entities
      const sources = await findSourcesUsingDestination(entity.id);
      for (const source of sources) {
        await destinationService.linkToSource(source.id, destination.id);
      }
    } else {
      // Mark as source entity
      await entityService.update(entity.id, { isDestination: false });
    }
  }
}
```

## 7. Impact Analysis

```typescript
export class ImpactAnalyzer {
  async analyzeDestinationChange(
    destinationId: string,
    proposedChanges: Partial<JsonSchema>
  ): Promise<ImpactReport> {
    const destination = await destinationService.getById(destinationId);
    const affectedSources = destination.linkedSources;
    
    const impacts: Impact[] = [];
    
    for (const sourceId of affectedSources) {
      const mappings = await mappingService.getByEntityId(sourceId);
      const brokenMappings = this.findBrokenMappings(mappings, proposedChanges);
      
      if (brokenMappings.length > 0) {
        impacts.push({
          sourceId,
          severity: 'high',
          brokenMappings,
          suggestedFixes: this.generateFixes(brokenMappings)
        });
      }
    }
    
    return {
      totalImpact: impacts.length,
      affectedSources: affectedSources.length,
      impacts,
      canAutoFix: this.canAutoFix(impacts)
    };
  }
}
```

This technical specification provides a comprehensive blueprint for implementing destination entity management. The system allows for flexible schema reuse while maintaining data integrity and providing clear impact analysis for changes.
