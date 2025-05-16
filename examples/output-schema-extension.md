# Output Schema Extension Example

This example demonstrates the new output schema features including external API schema sourcing, upsert configuration, and change event publishing.

## Sample Input Data

```json
{
  "orderId": "ORD-2024-001",
  "customerId": "CUST-123",
  "items": [
    {
      "productId": "PROD-A",
      "quantity": 2,
      "unitPrice": 29.99
    },
    {
      "productId": "PROD-B",
      "quantity": 1,
      "unitPrice": 49.99
    }
  ],
  "orderDate": "2024-01-15T10:30:00Z",
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Seattle",
    "state": "WA",
    "zip": "98101"
  }
}
```

## Entity Configuration

```typescript
const entityConfig = {
  name: "Order",
  description: "Order processing entity with upsert and event publishing",
  version: "1.0.0",
  
  // Output configuration
  outputConfig: {
    // Schema source from external API
    schemaSource: {
      type: "api",
      endpoint: "https://api.example.com/schemas/order",
      headers: {
        "Authorization": "Bearer ${API_TOKEN}"
      },
      refreshInterval: 60, // minutes
      schemaPath: "data.schema" // JSONPath to extract schema
    },
    
    // Upsert configuration
    upsertConfig: {
      enabled: true,
      uniqueFields: ["orderId", "customerId"],
      conflictResolution: "merge",
      mergeStrategy: "deep",
      compareFields: ["totalAmount", "status"]
    },
    
    // Change event configuration
    changeEventConfig: {
      enabled: true,
      eventType: "OrderProcessed",
      includeOldValues: true,
      includeMetadata: true,
      targetQueue: "order-events",
      targetTopic: "order-changes",
      format: "cloudevents",
      batchSize: 100,
      customProperties: {
        source: "order-processor",
        environment: "production"
      }
    }
  }
};
```

## Output Schema (fetched from API)

```json
{
  "type": "object",
  "properties": {
    "orderId": { "type": "string" },
    "customerId": { "type": "string" },
    "totalAmount": { "type": "number" },
    "itemCount": { "type": "integer" },
    "status": { 
      "type": "string",
      "enum": ["pending", "processing", "shipped", "delivered"]
    },
    "shippingInfo": {
      "type": "object",
      "properties": {
        "address": { "type": "string" },
        "city": { "type": "string" },
        "state": { "type": "string" },
        "zip": { "type": "string" }
      }
    },
    "processedAt": { "type": "string", "format": "date-time" },
    "correlationId": { "type": "string" }
  },
  "required": ["orderId", "customerId", "totalAmount", "status", "processedAt"]
}
```

## Mapping Configuration

```typescript
const mappings = [
  {
    source: "orderId",
    target: "orderId",
    transformation: "direct"
  },
  {
    source: "customerId",
    target: "customerId",
    transformation: "direct"
  },
  {
    source: "items",
    target: "totalAmount",
    transformation: "aggregate",
    aggregationFunction: "sum",
    customFunction: `
      value.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
    `
  },
  {
    source: "items",
    target: "itemCount",
    transformation: "aggregate",
    aggregationFunction: "count"
  },
  {
    source: "_system.processingStatus",
    target: "status",
    transformation: "template",
    template: "processing"
  },
  {
    source: "shippingAddress",
    target: "shippingInfo",
    transformation: "function",
    customFunction: `
      return {
        address: value.street,
        city: value.city,
        state: value.state,
        zip: value.zip
      };
    `
  },
  {
    source: "_system.timestamp",
    target: "processedAt",
    transformation: "function",
    customFunction: "() => new Date().toISOString()"
  }
];
```

## Generated Output

```json
{
  "orderId": "ORD-2024-001",
  "customerId": "CUST-123",
  "totalAmount": 109.97,
  "itemCount": 2,
  "status": "processing",
  "shippingInfo": {
    "address": "123 Main St",
    "city": "Seattle",
    "state": "WA",
    "zip": "98101"
  },
  "processedAt": "2024-01-15T10:45:00Z",
  "correlationId": "corr_12345",
  "_operation": "insert"
}
```

## Published Change Event

```json
{
  "specversion": "1.0",
  "type": "OrderProcessed",
  "source": "jsonmapper/entity/order",
  "id": "evt_1234567890",
  "time": "2024-01-15T10:45:00Z",
  "datacontenttype": "application/json",
  "data": {
    "new": {
      "orderId": "ORD-2024-001",
      "customerId": "CUST-123",
      "totalAmount": 109.97,
      "itemCount": 2,
      "status": "processing",
      "shippingInfo": {
        "address": "123 Main St",
        "city": "Seattle",
        "state": "WA",
        "zip": "98101"
      },
      "processedAt": "2024-01-15T10:45:00Z",
      "correlationId": "corr_12345"
    },
    "old": null,
    "changes": []
  },
  "metadata": {
    "correlationId": "corr_12345",
    "source": "order-processor",
    "environment": "production",
    "entityVersion": "1.0.0"
  }
}
```

## API Usage Examples

### Fetch Output Schema from External API

```bash
curl -X POST http://localhost:3000/api/entities/entity_123/output-schema/fetch \
  -H "Content-Type: application/json" \
  -d '{
    "type": "api",
    "endpoint": "https://api.example.com/schemas/order",
    "headers": {
      "Authorization": "Bearer token123"
    },
    "schemaPath": "data.schema"
  }'
```

### Configure Upsert Settings

```bash
curl -X POST http://localhost:3000/api/entities/entity_123/upsert-config \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "uniqueFields": ["orderId", "customerId"],
    "conflictResolution": "merge",
    "mergeStrategy": "deep"
  }'
```

### Configure Change Events

```bash
curl -X POST http://localhost:3000/api/entities/entity_123/change-event-config \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "eventType": "OrderProcessed",
    "includeOldValues": true,
    "includeMetadata": true,
    "targetQueue": "order-events",
    "format": "cloudevents"
  }'
```

### Test Event Publishing

```bash
curl -X POST http://localhost:3000/api/entities/entity_123/test-event \
  -H "Content-Type: application/json" \
  -d '{
    "inputData": {
      "orderId": "ORD-2024-001",
      "customerId": "CUST-123",
      "items": [...]
    }
  }'
```

### Get Event History

```bash
curl http://localhost:3000/api/entities/entity_123/change-events?limit=50
```

## Code Generation Output

The generated Azure Function will include:
- Upsert logic with conflict resolution
- Change event publishing to configured queues/topics
- Event format conversion (CloudEvents)
- Batch processing for events
- Error handling and retry logic

```typescript
// Generated Azure Function snippet
if (existingRecord) {
  switch (outputConfig.upsertConfig.conflictResolution) {
    case 'merge':
      output = deepMerge(existingRecord, output);
      break;
    // ... other cases
  }
}

// Publish change event
if (outputConfig.changeEventConfig.enabled) {
  const event = createChangeEvent(output, existingRecord);
  await publishToServiceBus(event);
  await publishToEventHub(event);
}
```
