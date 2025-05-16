# JsonMapper API Documentation

## Base URL

```
http://localhost:3000/api
```

## Authentication

Currently, the API does not require authentication. This will be added in future versions.

## Entities

### Generate Entity from Sample

```http
POST /entities/generate
```

Create an entity schema from a sample JSON payload.

**Request Body:**
```json
{
  "samplePayload": {
    "orderId": "ORD-123",
    "customer": {
      "id": "CUST-456",
      "name": "John Doe"
    }
  },
  "entityName": "Order",
  "description": "E-commerce order entity"
}
```

**Response:**
```json
{
  "success": true,
  "entity": {
    "id": "entity_123...",
    "name": "Order",
    "version": "1.0.0",
    "inboundSchema": { ... },
    "outboundSchema": { ... }
  },
  "mappings": [ ... ],
  "valueMappingSuggestions": [ ... ]
}
```

### Import from External API

```http
POST /entities/import
```

Import entity schema from an external API endpoint.

**Request Body:**
```json
{
  "apiEndpoint": "https://api.example.com/orders",
  "method": "GET",
  "headers": {
    "Authorization": "Bearer token"
  },
  "sampleRequest": {},
  "entityName": "Order"
}
```

### List Entities

```http
GET /entities
```

Get all entities in the system.

**Response:**
```json
{
  "success": true,
  "entities": [
    {
      "id": "entity_123...",
      "name": "Order",
      "version": "1.0.0",
      "createdAt": "2024-01-15T10:30:00Z",
      "mappingCount": 5,
      "valueMappingCount": 2
    }
  ]
}
```

### Get Entity by ID

```http
GET /entities/:id
```

Get detailed information about a specific entity.

**Response:**
```json
{
  "success": true,
  "entity": {
    "id": "entity_123...",
    "name": "Order",
    "inboundSchema": { ... },
    "outboundSchema": { ... }
  },
  "mappings": [ ... ],
  "valueMappings": [ ... ]
}
```

### Update Entity

```http
PUT /entities/:id
```

Update entity properties.

**Request Body:**
```json
{
  "name": "Updated Order",
  "description": "Updated description",
  "version": "1.1.0"
}
```

### Delete Entity

```http
DELETE /entities/:id
```

Delete an entity and all associated mappings.

### Test Entity Transformation

```http
POST /entities/:id/test
```

Test the entity transformation with sample data.

**Request Body:**
```json
{
  "inputData": {
    "orderId": "ORD-789",
    "customer": {
      "id": "CUST-012",
      "name": "Jane Smith"
    }
  }
}
```

## Mappings

### Create Mapping

```http
POST /mappings
```

Create a new field mapping.

**Request Body:**
```json
{
  "entityId": "entity_123",
  "source": "customer.id",
  "target": "customerId",
  "transformation": "direct",
  "active": true
}
```

### Get Mappings by Entity

```http
GET /mappings/entity/:entityId
```

Get all mappings for a specific entity.

### Update Mapping

```http
PUT /mappings/:id
```

Update an existing mapping.

**Request Body:**
```json
{
  "transformation": "template",
  "template": "CUST-${value}",
  "active": true
}
```

### Delete Mapping

```http
DELETE /mappings/:id
```

Delete a mapping.

### Refresh Mappings with LLM

```http
POST /mappings/refresh/:entityId
```

Use LLM to analyze and refresh mappings.

**Request Body:**
```json
{
  "context": "This is for an e-commerce order processing system"
}
```

### Test Mapping

```http
POST /mappings/test
```

Test a specific mapping transformation.

**Request Body:**
```json
{
  "mapping": {
    "source": "customer.id",
    "target": "customerId",
    "transformation": "template",
    "template": "CUST-${value}"
  },
  "input": {
    "customer": {
      "id": "123"
    }
  }
}
```

### Validate Mappings

```http
POST /mappings/validate
```

Validate a set of mappings against an entity schema.

**Request Body:**
```json
{
  "mappings": [ ... ],
  "entityId": "entity_123"
}
```

## Value Mappings

### Create Value Mapping

```http
POST /value-mappings
```

Create a new value mapping configuration.

**Request Body:**
```json
{
  "name": "Country Codes",
  "description": "Map country names to ISO codes",
  "entityId": "entity_123",
  "type": "exact",
  "mappings": {
    "United States": "US",
    "United Kingdom": "GB",
    "Canada": "CA"
  },
  "defaultValue": "UNKNOWN",
  "caseSensitive": false
}
```

### Get Value Mappings by Entity

```http
GET /value-mappings/entity/:entityId
```

Get all value mappings for an entity.

### Update Value Mapping

```http
PUT /value-mappings/:id
```

Update an existing value mapping.

### Delete Value Mapping

```http
DELETE /value-mappings/:id
```

Delete a value mapping.

### Test Value Mapping

```http
POST /value-mappings/:id/test
```

Test a value mapping with sample data.

**Request Body:**
```json
{
  "value": "United States",
  "context": {
    "caseSensitive": false
  }
}
```

### Get Example Value Mappings

```http
GET /value-mappings/examples/all
```

Get example value mapping configurations.

## Code Generation

### Generate Entity Code

```http
POST /generate/entity
```

Generate complete code for an entity.

**Request Body:**
```json
{
  "entityId": "entity_123",
  "platform": "azure",
  "includeTests": true,
  "includeDocumentation": true
}
```

### Generate Azure Function

```http
POST /generate/azure-function
```

Generate Azure Function code for an entity.

**Request Body:**
```json
{
  "entityId": "entity_123"
}
```

### Generate Node-RED Flow

```http
POST /generate/node-red-flow
```

Generate Node-RED flow configuration.

**Request Body:**
```json
{
  "entityId": "entity_123"
}
```

### Generate Tests

```http
POST /generate/tests
```

Generate test code for an entity.

**Request Body:**
```json
{
  "entityId": "entity_123",
  "testFramework": "jest"
}
```

### Generate Documentation

```http
POST /generate/documentation
```

Generate documentation for an entity.

**Request Body:**
```json
{
  "entityId": "entity_123",
  "format": "markdown"
}
```

### Preview Generated Code

```http
POST /generate/preview
```

Preview generated code without saving.

**Request Body:**
```json
{
  "entityId": "entity_123",
  "platform": "azure",
  "codeType": "interfaces"
}
```

## Health Check

### System Health

```http
GET /health
```

Check system health and status.

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "error": "Error message",
  "details": "Additional error details",
  "code": "ERROR_CODE"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request
- `404`: Not Found
- `500`: Internal Server Error
