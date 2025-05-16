# JsonMapper Abstracted Model Documentation

## Overview

The Abstracted Model feature allows you to designate an entity as the central data model that all inputs and outputs map to. This provides a canonical data structure that serves as the single source of truth for data transformations.

## Key Concepts

### What is an Abstracted Model?

An abstracted model is an entity that:
- Serves as the central mapping point for all data transformations
- Requires at least one uniqueness constraint
- Acts as the intermediate layer between inbound and outbound data
- Ensures data consistency across different integrations

### When to Use Abstracted Models

Use abstracted models when you need:
- A canonical data representation
- Consistent data structure across multiple sources
- Central point for business logic and validations
- To decouple source systems from target systems

## Setting Up an Abstracted Model

### 1. Create or Select an Entity

First, create an entity or select an existing one that will serve as your abstracted model.

### 2. Define Uniqueness Constraints

Before setting an entity as an abstracted model, you must define at least one uniqueness constraint:

```typescript
interface UniquenessConstraint {
  id: string;
  name: string;
  fields: string[];           // Field paths that form the unique key
  active: boolean;
  type: 'primary' | 'unique'; // Primary key or unique constraint
  description?: string;
}
```

### 3. Configure via UI

1. Navigate to the entity editor
2. Click on the "Abstracted Model" tab
3. Add one or more uniqueness constraints
4. Click "Set as Abstracted Model"

### 4. Configure via API

```bash
POST /api/entities/{entityId}/abstracted-model
{
  "constraints": [
    {
      "name": "primary_key",
      "fields": ["id"],
      "type": "primary",
      "description": "Primary identifier"
    },
    {
      "name": "business_key",
      "fields": ["orderNumber", "customerId"],
      "type": "unique",
      "description": "Unique business identifier"
    }
  ]
}
```

## API Endpoints

### Set Entity as Abstracted Model
```
POST /api/entities/{entityId}/abstracted-model
```

### Add Uniqueness Constraint
```
POST /api/entities/{entityId}/constraints
```

### Remove Uniqueness Constraint
```
DELETE /api/entities/{entityId}/constraints/{constraintId}
```

### Get All Abstracted Models
```
GET /api/abstracted-models
```

### Validate Abstracted Model
```
POST /api/entities/{entityId}/validate-abstracted
```

## Validation Rules

When an entity is marked as an abstracted model:

1. **At least one uniqueness constraint is required**
   - The system will not allow an entity to be marked as abstracted without constraints
   - Removing the last constraint from an abstracted model is prohibited

2. **Field validation**
   - All fields referenced in constraints must exist in the entity schema
   - Field paths are validated against the inbound schema

3. **Type validation**
   - Constraints must be either 'primary' or 'unique' type
   - Primary constraints typically use a single field
   - Unique constraints can combine multiple fields

## Best Practices

1. **Design constraints carefully**
   - Choose fields that truly represent unique identifiers
   - Consider composite keys for business uniqueness
   - Document the purpose of each constraint

2. **Use primary keys wisely**
   - Typically have one primary key per entity
   - Use system-generated IDs for primary keys
   - Use business keys as unique constraints

3. **Maintain consistency**
   - Ensure all mappings reference the abstracted model
   - Keep the abstracted model schema stable
   - Version changes carefully

## Example: Order Processing System

```typescript
// Order abstracted model
const orderModel: EntitySchema = {
  id: "entity_order",
  name: "Order",
  isAbstractedModel: true,
  inboundSchema: {
    type: "object",
    properties: {
      id: { type: "string" },
      orderNumber: { type: "string" },
      customerId: { type: "string" },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            productId: { type: "string" },
            quantity: { type: "number" },
            price: { type: "number" }
          }
        }
      },
      totalAmount: { type: "number" },
      status: { type: "string" }
    }
  },
  metadata: {
    uniquenessConstraints: [
      {
        id: "pk_order",
        name: "primary_key",
        fields: ["id"],
        type: "primary",
        active: true
      },
      {
        id: "uk_order_number",
        name: "order_number_unique",
        fields: ["orderNumber"],
        type: "unique",
        active: true
      }
    ]
  }
};
```

## Integration with Other Features

### Mappings
- All inbound mappings target the abstracted model
- All outbound mappings source from the abstracted model
- Mapping editor shows abstracted model indicator

### Code Generation
- Generated code includes abstracted model validation
- Upsert operations use uniqueness constraints
- TypeScript interfaces reflect the canonical structure

### Change Events
- Events reference the abstracted model structure
- Change detection uses uniqueness constraints
- Event metadata includes model version

## Troubleshooting

### Common Issues

1. **Cannot set as abstracted model**
   - Ensure at least one uniqueness constraint is defined
   - Check that all constraint fields exist in the schema
   - Verify constraint names are unique

2. **Validation failures**
   - Review the validation error messages
   - Check field paths match the schema structure
   - Ensure constraint types are valid

3. **Cannot remove constraint**
   - Abstracted models must have at least one constraint
   - Add a new constraint before removing the last one

## Migration Guide

To convert an existing entity to an abstracted model:

1. Analyze the entity schema to identify unique fields
2. Define appropriate uniqueness constraints
3. Test the constraints with sample data
4. Set the entity as abstracted model
5. Update existing mappings to reference the model
6. Regenerate code to include abstracted model logic

## Future Enhancements

Planned improvements to the abstracted model feature:

- Automatic constraint suggestions based on data analysis
- Visual constraint builder with drag-and-drop
- Constraint validation against sample data
- Performance optimization for large datasets
- Multi-tenant support with tenant-specific constraints
