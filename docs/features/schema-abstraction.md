# Schema Abstraction and Linking

JSON Mapper now supports advanced schema abstraction and linking capabilities. This feature allows you to define schemas as abstracted models and create links between entities, enabling sophisticated data transformation scenarios.

## Schema Format Options

Schemas can now be defined and edited in either JSON or YAML format:

- **JSON Format**: The traditional, compact format that is ideal for machine processing
- **YAML Format**: A more human-readable format that makes complex schemas easier to edit and understand

You can toggle between these formats in the Entity Editor using the Schema Format toggle.

## Abstracted Model Types

There are three levels of abstraction available:

### 1. Abstracted Model (Entity Level)

When an entity is marked as an "Abstracted Model," it serves as a canonical data model that other entities can reference. This is useful for creating a central data model that standardizes field naming, types, and relationships.

Requirements:
- Must define at least one uniqueness constraint
- Serves as the reference model for related entities

### 2. Inbound Schema Abstraction

When an entity's inbound schema is marked as abstracted, other entities can link to it, using it as a reference model for their own transformations.

Use cases:
- Standardize input formats across multiple systems
- Create a shared input data model for related entities
- Enable reuse of transformation logic across entities

### 3. Outbound Schema Abstraction

When an entity's outbound schema is marked as abstracted, other entities can link to it as a target for their transformations.

Use cases:
- Define consistent output formats that multiple entities must conform to
- Create a central target schema that multiple source systems map to
- Standardize the structure of data sent to downstream systems

## Linking Entities

Entities can be linked in two ways:

### 1. Reference Links

A reference link indicates that one entity refers to another's schema as a reference model. This is a soft link that influences mapping suggestions but doesn't enforce strict schema compliance.

### 2. Inheritance Links

An inheritance link creates a stronger relationship where one entity inherits structural elements from another. This enforces schema compliance and automatically propagates certain changes from the parent to the child entity.

## API Endpoints

New API endpoints have been added to support these features:

- `POST /api/entities/:id/link` - Link an entity to another entity
- `DELETE /api/entities/:id/link/:targetId/:direction` - Remove a link between entities
- `GET /api/entities/:id/links` - Get all linked entities
- `PUT /api/entities/:id/schema-format` - Update entity schema format

## Example Usage

### Creating an Abstracted Model

```javascript
// Create a central Customer data model
const customerModel = {
  name: "Customer",
  schemaFormat: "yaml",
  inboundAbstracted: true,
  outboundAbstracted: true,
  // ... other properties
};

// API call
await api.post('/api/entities/generate', {
  samplePayload,
  entityName: "Customer",
  schemaFormat: "yaml",
  inboundAbstracted: true,
  outboundAbstracted: true
});
```

### Linking Entities

```javascript
// Link Order entity to Customer entity
await api.post('/api/entities/entity_order_123/link', {
  targetEntityId: "entity_customer_456",
  direction: "outbound",
  linkType: "reference"
});
```

### Retrieving Links

```javascript
// Get all entities linked to Customer
const links = await api.get('/api/entities/entity_customer_456/links');

// Get only inbound links
const inboundLinks = await api.get('/api/entities/entity_customer_456/links?direction=inbound');
```

## Best Practices

1. **Create a Central Data Model**: Start by defining a central abstracted model for your key entities
2. **Link Related Entities**: Create links between related entities to maintain consistency
3. **Use YAML for Complex Schemas**: YAML format is recommended for complex schemas with nested structures
4. **Define Clear Constraints**: Ensure abstracted models have clear uniqueness constraints
5. **Document Your Model Relationships**: Maintain documentation of your entity relationships

## Technical Notes

- Schema validation is performed when linking entities
- Changes to abstracted models may affect linked entities
- Performance impact is minimal when using abstracted models
- Links are stored in the entity metadata and can be queried efficiently