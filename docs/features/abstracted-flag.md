# Abstracted Flag Feature

## Overview

The abstracted flag is a feature that allows users to mark entities as abstracted for mapping purposes. This provides more control over how entities are used within the JSON mapping system.

## What is the Abstracted Flag?

The abstracted flag is a boolean property that can be set on any entity in the system. When an entity is marked as abstracted, it indicates that:

- The entity serves as an intermediate data model
- It may be used as a transformation layer between different data formats
- It can be part of a complex mapping strategy

## How to Use the Abstracted Flag

### Setting the Flag on New Entities

When creating a new entity:

1. Navigate to the entity creation form
2. Fill in the entity details (name, description, etc.)
3. Check the "Abstracted" checkbox to enable the flag
4. Save the entity

### Updating Existing Entities

To update the abstracted flag on an existing entity:

1. Navigate to the entity list
2. Click on the edit icon for the entity
3. Toggle the "Abstracted" checkbox
4. Save the changes

### Visual Indicators

Entities marked as abstracted are identified by:

- A gray "Abstracted" badge in the entity list
- A checkbox state in the entity editor

## Filtering by Abstracted Status

In the entity list view, you can filter entities based on their abstracted status:

1. Use the filter dropdown in the top-right corner
2. Select from:
   - "All Entities" - shows all entities
   - "Abstracted Only" - shows only abstracted entities
   - "Non-abstracted Only" - shows entities without the flag

## Best Practices

### When to Use the Abstracted Flag

Consider marking an entity as abstracted when:

- It represents an intermediate transformation step
- It's used as a common data model between different systems
- You need to distinguish it from direct source/destination entities

### When Not to Use

The abstracted flag is not necessary when:

- The entity is a direct source or destination
- There's no intermediate transformation required
- The entity represents the final output format

## Technical Details

### Default Behavior

- New entities without the flag specified default to `undefined`
- Existing entities maintain their current state
- The flag is persisted with the entity configuration

### API Support

The abstracted flag is supported in:

- Entity creation endpoints
- Entity update endpoints
- Entity listing and filtering

### Migration

Existing entities created before this feature was added:

- Will not have the abstracted flag set
- Can be updated to include the flag
- Continue to function normally without the flag

## Related Features

The abstracted flag works alongside:

- **Abstracted Models**: A more complex feature for central data models
- **Entity Mappings**: Standard mapping functionality
- **Value Mappings**: Custom value transformations

## Examples

### Example 1: Intermediate Processing Entity

```javascript
{
  "name": "ProcessedOrder",
  "description": "Intermediate order format for processing",
  "abstracted": true,
  // ... other entity properties
}
```

### Example 2: Direct Source Entity

```javascript
{
  "name": "RawOrderData",
  "description": "Raw order data from external system",
  "abstracted": false,
  // ... other entity properties
}
```

## Troubleshooting

### Common Issues

1. **Flag not visible**: Ensure you're using the latest version of the application
2. **Filter not working**: Check that entities have been properly saved with the flag
3. **Migration issues**: Existing entities may need manual update to include the flag

### Support

For additional support with the abstracted flag feature:

- Check the developer documentation
- Contact the development team
- Review the API documentation
