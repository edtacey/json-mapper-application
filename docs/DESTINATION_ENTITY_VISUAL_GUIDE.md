# Destination Entity Management - Visual Guide

## Current State vs Future State

### Current State (Single Entity)
```
┌─────────────────┐
│  Source Entity  │
├─────────────────┤
│ • Inbound       │
│ • Outbound      │
│ • Mappings      │
└─────────────────┘
```

### Future State (Reusable Destinations)
```
┌─────────────────┐     ┌─────────────────────┐
│  Source Entity  │────▶│ Destination Entity  │
├─────────────────┤     ├─────────────────────┤
│ • Inbound       │     │ • Schema            │
│ • Mappings      │     │ • Shared: Yes       │
└─────────────────┘     │ • Used by: 3        │
                        └─────────────────────┘
                                  ▲
┌─────────────────┐               │
│  Source Entity  │───────────────┘
├─────────────────┤               
│ • Inbound       │               ▲
│ • Mappings      │               │
└─────────────────┘               │
                                  │
┌─────────────────┐               │
│  Source Entity  │───────────────┘
├─────────────────┤
│ • Inbound       │
│ • Mappings      │
└─────────────────┘
```

## User Workflow

### 1. Creating a New Source Entity
```
User Action                     System Response
───────────                     ───────────────
Click "New Entity"              Show entity type selection
     │
     ▼
Select "Source Entity"          Show creation options
     │
     ▼
Choose Data Input              ┌─────────────────────┐
• From Sample JSON             │ Input Schema Setup  │
• From External API            └─────────────────────┘
     │
     ▼
Define Destination             ┌─────────────────────┐
• Select Existing  ───────────▶│ Destination List    │
• Create New      ───────────▶│ Destination Creator │
• Clone & Modify  ───────────▶│ Clone Wizard        │
     │                         └─────────────────────┘
     ▼
Setup Mappings                 ┌─────────────────────┐
                              │ Mapping Editor      │
                              │ (Auto-suggestions)  │
                              └─────────────────────┘
```

### 2. Creating a Destination Entity
```
User Action                     System Response
───────────                     ───────────────
Click "New Entity"              Show entity type selection
     │
     ▼
Select "Destination Entity"     Show creation options
     │
     ▼
Define Schema                  ┌─────────────────────┐
• From Sample JSON             │ Schema Editor       │
• From External API            │ • Field definitions │
• Clone Existing               │ • Validation rules  │
     │                         └─────────────────────┘
     ▼
Configure Settings             ┌─────────────────────┐
• Name & Description           │ Settings Panel      │
• Shared: Yes/No               │ • Access control    │
• Version: 1.0.0               │ • Usage tracking    │
     │                         └─────────────────────┘
     ▼
Save Destination               Entity available for linking
```

## UI Components

### Destination Selector Modal
```
┌─────────────────────────────────────────────┐
│ Select Destination Entity                   │
├─────────────────────────────────────────────┤
│ [Search...                              🔍] │
│                                             │
│ ┌─────────────┐ ┌─────────────┐            │
│ │   Order     │ │  Customer   │            │
│ │  Output     │ │   Output    │            │
│ │ Used by: 5  │ │ Used by: 3  │            │
│ └─────────────┘ └─────────────┘            │
│                                             │
│ ┌─────────────┐ ┌─────────────┐            │
│ │  Product    │ │  Invoice    │            │
│ │  Output     │ │   Output    │            │
│ │ Used by: 2  │ │ Used by: 7  │            │
│ └─────────────┘ └─────────────┘            │
│                                             │
│ [Create New Destination]  [Clone Existing]  │
└─────────────────────────────────────────────┘
```

### Entity List View (Updated)
```
┌─────────────────────────────────────────────┐
│ Entities                      [+ New Entity]│
├─────────────────────────────────────────────┤
│ Filter: [All ▼] [Source ▼] [Destination ▼] │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 📥 OrderInput    ──▶  📤 OrderOutput    │ │
│ │ Source Entity        Destination Entity │ │
│ │ Last modified: 2h ago                   │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 📥 CustomerAPI   ──▶  📤 CustomerOutput │ │
│ │ Source Entity        Destination Entity │ │
│ │ Last modified: 1d ago                   │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │      📤 SharedProductOutput             │ │
│ │      Destination Entity (Shared)        │ │
│ │      Used by: 3 source entities         │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

## Database Structure

### Entity Storage
```
/data/
├── entities/           # Source entities
│   ├── entity_001.json
│   ├── entity_002.json
│   └── entity_003.json
│
├── destination-entities/  # Destination entities
│   ├── dest_001.json
│   ├── dest_002.json
│   └── dest_003.json
│
├── relationships/      # Source-Destination links
│   ├── rel_001.json
│   ├── rel_002.json
│   └── rel_003.json
│
└── mappings/          # Field mappings
    ├── mapping_001.json
    ├── mapping_002.json
    └── mapping_003.json
```

## Benefits of This Approach

1. **Reusability**: Define once, use many times
2. **Consistency**: Same output format across sources
3. **Maintainability**: Update destination in one place
4. **Flexibility**: Clone and modify for variations
5. **Clarity**: Clear separation of concerns

## Implementation Priority

1. **Phase 1**: Core destination entity CRUD
2. **Phase 2**: Linking mechanism
3. **Phase 3**: UI components
4. **Phase 4**: Cloning and versioning
5. **Phase 5**: Impact analysis

## Migration Impact

### Before Migration
```json
{
  "id": "entity_123",
  "name": "OrderProcessor",
  "inboundSchema": {...},
  "outboundSchema": {...}
}
```

### After Migration
```json
// Source Entity
{
  "id": "entity_123",
  "name": "OrderProcessor",
  "inboundSchema": {...},
  "destinationEntityId": "dest_456",
  "isDestination": false
}

// Destination Entity
{
  "id": "dest_456",
  "name": "OrderOutput",
  "isDestination": true,
  "linkedSources": ["entity_123", "entity_789"],
  "schema": {...},
  "isShared": true,
  "version": "1.0.0"
}

// Relationship
{
  "id": "rel_001",
  "sourceEntityId": "entity_123",
  "destinationEntityId": "dest_456",
  "createdAt": "2024-01-01T00:00:00Z",
  "metadata": {
    "compatibility": 95.5,
    "autoMapped": true
  }
}
```

## Example Use Cases

### Use Case 1: Multiple Order Sources
```
┌─────────────────┐     ┌─────────────────────┐
│ Shopify Orders  │────▶│                     │
└─────────────────┘     │   Order Output      │
                        │   (Shared)          │
┌─────────────────┐     │                     │
│  WooCommerce    │────▶│ • OrderID           │
│    Orders       │     │ • CustomerID        │
└─────────────────┘     │ • Items[]           │
                        │ • TotalAmount       │
┌─────────────────┐     │ • Status            │
│  Amazon MWS     │────▶│                     │
│    Orders       │     └─────────────────────┘
└─────────────────┘
```

### Use Case 2: Versioned Output Schemas
```
┌─────────────────┐     ┌─────────────────────┐
│   API Client    │────▶│  Customer v1.0      │
│    (Legacy)     │     │  (Deprecated)       │
└─────────────────┘     └─────────────────────┘

┌─────────────────┐     ┌─────────────────────┐
│   API Client    │────▶│  Customer v2.0      │
│    (Modern)     │     │  (Current)          │
└─────────────────┘     └─────────────────────┘
```

### Use Case 3: Industry Standards
```
┌─────────────────┐     ┌─────────────────────┐
│   Healthcare    │────▶│   HL7 FHIR          │
│     System      │     │   Patient Record    │
└─────────────────┘     └─────────────────────┘

┌─────────────────┐     ┌─────────────────────┐
│    Pharmacy     │────▶│   HL7 FHIR          │
│     System      │     │   Patient Record    │
└─────────────────┘     └─────────────────────┘
```

## Code Generation Impact

### Current Generated Code
```typescript
// Generated mapper for OrderProcessor
export class OrderProcessorMapper {
  mapToOutput(input: OrderInput): OrderOutput {
    return {
      // Hardcoded output structure
      orderId: input.id,
      customer: input.customerInfo,
      // ... more mappings
    };
  }
}
```

### Future Generated Code
```typescript
// Generated mapper with destination reference
import { OrderOutput } from './destinations/OrderOutput';

export class OrderProcessorMapper {
  constructor(
    private destinationSchema: typeof OrderOutput
  ) {}

  mapToOutput(input: OrderInput): OrderOutput {
    // Use destination schema for validation
    const output = new this.destinationSchema();
    
    // Apply mappings
    output.orderId = input.id;
    output.customer = input.customerInfo;
    
    // Validate against destination schema
    return output.validate();
  }
}
```

## API Integration Example

### Creating a Destination Entity
```bash
# Create a new destination entity
POST /api/destination-entities/generate
{
  "samplePayload": {
    "orderId": "12345",
    "customer": {
      "id": "CUST-001",
      "name": "John Doe"
    },
    "items": [],
    "total": 99.99
  },
  "entityName": "StandardOrderOutput",
  "description": "Standard order output format",
  "isShared": true
}

# Response
{
  "entity": {
    "id": "dest_001",
    "name": "StandardOrderOutput",
    "isDestination": true,
    "linkedSources": [],
    "schema": {...},
    "version": "1.0.0"
  }
}
```

### Linking Destination to Source
```bash
# Link destination to existing source
POST /api/entities/entity_123/link-destination
{
  "destinationEntityId": "dest_001",
  "autoMap": true
}

# Response
{
  "relationship": {
    "id": "rel_001",
    "sourceEntityId": "entity_123",
    "destinationEntityId": "dest_001",
    "metadata": {
      "compatibility": 92.5,
      "autoMapped": true,
      "conflicts": []
    }
  },
  "suggestedMappings": [
    {
      "source": "id",
      "target": "orderId",
      "confidence": 0.95
    }
  ]
}
```

## Impact Analysis Example

### Before Making Changes
```bash
# Check impact before modifying destination schema
POST /api/destination-entities/dest_001/analyze-impact
{
  "proposedChanges": {
    "removeField": "oldField",
    "addField": {
      "name": "newField",
      "type": "string",
      "required": true
    }
  }
}

# Response
{
  "impactReport": {
    "affectedSources": 3,
    "breakingChanges": [
      {
        "sourceId": "entity_123",
        "brokenMappings": ["mapping_456"],
        "reason": "Required field 'newField' has no mapping"
      }
    ],
    "warnings": [
      {
        "sourceId": "entity_789",
        "message": "Field 'oldField' will be removed"
      }
    ],
    "autoFixAvailable": true
  }
}
```

## Error Handling

### Common Errors and Solutions

1. **Circular Dependencies**
```json
{
  "error": "CircularDependencyError",
  "message": "Destination cannot reference itself",
  "solution": "Create a new destination or break the circular reference"
}
```

2. **In-Use Deletion**
```json
{
  "error": "DestinationInUseError",
  "message": "Cannot delete destination used by 3 sources",
  "affectedSources": ["entity_123", "entity_456", "entity_789"],
  "solution": "Unlink all sources or use force=true"
}
```

3. **Schema Incompatibility**
```json
{
  "error": "SchemaIncompatibilityError",
  "message": "Source schema incompatible with destination",
  "conflicts": [
    {
      "field": "customerId",
      "sourceType": "number",
      "destinationType": "string"
    }
  ],
  "solution": "Add type transformation or modify schemas"
}
```

## Performance Considerations

### Caching Strategy
```typescript
class DestinationCache {
  private cache = new Map<string, DestinationEntity>();
  private ttl = 5 * 60 * 1000; // 5 minutes
  
  async get(id: string): Promise<DestinationEntity> {
    const cached = this.cache.get(id);
    if (cached && !this.isExpired(cached)) {
      return cached;
    }
    
    const fresh = await this.fetch(id);
    this.cache.set(id, fresh);
    return fresh;
  }
}
```

### Query Optimization
```sql
-- Efficient query for finding destinations
SELECT d.*, COUNT(r.source_id) as usage_count
FROM destination_entities d
LEFT JOIN relationships r ON d.id = r.destination_id
WHERE d.is_shared = true
GROUP BY d.id
ORDER BY usage_count DESC;
```

## Summary

The destination entity management system provides:

1. **Flexibility**: Create once, use many times
2. **Consistency**: Standardized output formats
3. **Efficiency**: Reduced duplication
4. **Maintainability**: Centralized schema management
5. **Scalability**: Support for complex integrations

This approach transforms JsonMapper from a 1-to-1 mapping tool into a powerful many-to-one integration platform, ideal for:
- Multi-source integrations
- API standardization
- Industry compliance
- Version management
- Enterprise-scale deployments
