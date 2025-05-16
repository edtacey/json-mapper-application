# JsonMapper

A comprehensive JSON mapping and transformation system with LLM integration, featuring visual mapping editor, value mapping capabilities, output schema management, change event publishing, and code generation for Azure Functions and Node-RED.

## Features

- **Entity Management**: Generate entity schemas from sample payloads or external APIs
- **Abstracted Model Support**: Define canonical data models with uniqueness constraints
- **Visual Mapping Editor**: Drag-and-drop interface for creating field mappings
- **Value Mapping**: Define value transformations with various matching strategies (exact, regex, range, etc.)
- **Sub-Child Mapping**: Merge or replace sub-objects with data from external sources
- **Output Schema Management**: Fetch schemas from external APIs, version tracking, manual editing
- **Upsert Configuration**: Define uniqueness criteria and conflict resolution strategies
- **Change Event Publishing**: Automatic event generation for data changes
- **LLM Integration**: AI-powered mapping suggestions and automatic mapping refresh
- **Code Generation**: Generate TypeScript interfaces, Azure Functions, Node-RED flows, and tests
- **Multi-Platform Support**: Deploy to Azure PaaS or Node-RED for debugging

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key (optional, for LLM features)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/JsonMapper.git
cd JsonMapper
```

2. Install dependencies:
```bash
# Backend
npm install

# Frontend
cd frontend
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development servers:
```bash
# Backend (from root directory)
npm run dev

# Frontend (in separate terminal)
cd frontend
npm run dev
```

5. Open http://localhost:5173 in your browser

## Usage

### Creating an Entity

1. Navigate to the Dashboard
2. Click "New Entity"
3. Either:
   - Paste a sample JSON payload and click "Generate from Sample"
   - Import from an external API endpoint
4. The system will analyze the payload and create input/output schemas
5. Configure output options:
   - **Output Schema Source**: Manual editing or API endpoint
   - **Upsert Configuration**: Define unique fields and conflict resolution
   - **Change Event Publishing**: Enable and configure event generation
6. Optionally set as an Abstracted Model:
   - Define uniqueness constraints
   - Mark as the central data model
   - All mappings will reference this model

### Defining Mappings

1. Open the Mapping Editor for your entity
2. Drag fields from the input schema to the output schema
3. Configure transformation types:
   - **Direct**: Copy value as-is
   - **Template**: Use string templates with field references
   - **Function**: Write custom JavaScript transformations
   - **Value Mapping**: Apply predefined value mappings
   - **Aggregate**: Perform operations on arrays
   - **Conditional**: Apply logic-based transformations
   - **Sub-Child**: Merge or replace sub-objects with external data

### Value Mappings

1. Create reusable value mapping configurations
2. Define mapping types:
   - **Exact**: Direct key-to-value mappings
   - **Regex**: Pattern-based matching
   - **Range**: Numeric range mappings
   - **Contains**: Substring matching
   - **Prefix/Suffix**: Start/end pattern matching

### Sub-Child Mapping

The Sub-Child mapping transformation allows you to enhance or replace nested objects with data from external sources:

1. **Merge Operation**:
   - Combines external data with source data
   - Preserves specified fields from the original
   - Supports deep or shallow merge strategies
   - Ideal for enriching existing data with additional fields

2. **Replace Operation**:
   - Completely replaces source data with external data
   - Can apply additional mappings to the replaced data
   - Useful for data lookups and complete substitutions

3. **Configuration Options**:
   - **Lookup Key**: Field to use for external data lookup
   - **Lookup Source**: API endpoint pattern (e.g., `/api/customer/{customerId}`)
   - **Merge Strategy**: Deep or shallow merge when using merge operation
   - **Preserve Fields**: List of fields to keep from original data during merge
   - **Fallback Behavior**: What to do when lookup fails:
     - `use-original`: Keep the source data
     - `use-default`: Use a predefined default value
     - `skip`: Skip the item entirely (useful for arrays)
     - `error`: Throw an error and stop processing

4. **Use Cases**:
   - Customer profile enrichment with loyalty data
   - Product details enhancement from catalog API
   - Address verification and geocoding
   - Vendor information lookup
   - Category metadata enrichment

### Output Schema Management

1. **External API Integration**:
   - Configure API endpoint for schema fetching
   - Set refresh intervals
   - Specify JSONPath to extract schema from response

2. **Manual Editing**:
   - Edit output schema directly in JSON editor
   - Version tracking with history
   - Validate schema changes

3. **Upsert Configuration**:
   - Define unique field combinations
   - Choose conflict resolution strategy:
     - Update: Replace existing record
     - Merge: Deep merge with existing
     - Skip: Keep existing record
     - Error: Throw conflict error

### Change Event Publishing

1. Enable change event tracking
2. Configure event properties:
   - Event type name
   - Include old values for comparison
   - Add metadata
   - Choose target queue or topic
3. Set event format (CloudEvents or custom)
4. View event history and statistics

### Code Generation

1. Navigate to the Generate page for your entity
2. Select target platform:
   - Azure Functions
   - Node-RED flows
   - Both
3. Configure options:
   - Include tests
   - Include documentation
4. Download generated code or copy to clipboard

## Architecture

The JsonMapper system is built with a modular architecture that supports:
- Entity schema management with abstracted model capabilities
- Visual mapping editor
- Value transformations
- Sub-child data enrichment from external sources
- Change event publishing
- Code generation for multiple platforms

```
JsonMapper/
├── src/                    # Backend source code
│   ├── api/               # Express controllers
│   │   ├── abstracted-model/  # Abstracted model endpoints
│   │   ├── output-schema/     # Schema management
│   │   └── events/            # Event publishing
│   ├── services/          # Business logic
│   ├── utils/             # Utility functions
│   ├── storage/           # Data persistence
│   └── types/             # TypeScript types
├── frontend/              # React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   └── services/      # API client
├── data/                  # JSON file storage
├── templates/             # Code generation templates
└── docs/                  # Documentation
```

## API Reference

### Entities

- `POST /api/entities/generate` - Generate entity from sample
- `POST /api/entities/import` - Import from external API
- `GET /api/entities` - List all entities
- `GET /api/entities/:id` - Get entity details
- `PUT /api/entities/:id` - Update entity
- `DELETE /api/entities/:id` - Delete entity

### Output Schema Management

- `POST /api/entities/:id/output-schema/fetch` - Fetch schema from external API
- `POST /api/entities/:id/output-schema/refresh` - Refresh schema from configured source
- `PUT /api/entities/:id/output-schema` - Update output schema manually
- `GET /api/entities/:id/output-schema/versions` - Get schema version history

### Upsert Configuration

- `POST /api/entities/:id/upsert-config` - Configure upsert settings
- `POST /api/entities/:id/upsert-config/validate` - Validate uniqueness fields

### Abstracted Model

- `POST /api/entities/:id/abstracted-model` - Set entity as abstracted model
- `POST /api/entities/:id/constraints` - Add uniqueness constraint
- `DELETE /api/entities/:id/constraints/:constraintId` - Remove constraint
- `GET /api/abstracted-models` - Get all abstracted models
- `POST /api/entities/:id/validate-abstracted` - Validate abstracted model

### Change Events

- `GET /api/entities/:id/change-events` - Get event history
- `GET /api/entities/:id/change-events/stats` - Get event statistics  
- `POST /api/entities/:id/publish-event` - Manually publish event
- `POST /api/entities/:id/test-event` - Test event generation
- `POST /api/entities/:id/change-event-config` - Configure event publishing

### Mappings

- `POST /api/mappings` - Create mapping
- `GET /api/mappings/entity/:entityId` - Get mappings for entity
- `POST /api/mappings/refresh/:entityId` - Refresh with LLM
- `POST /api/mappings/test` - Test mapping transformation
- `POST /api/mappings/sub-child/test` - Test sub-child mapping

### Value Mappings

- `POST /api/value-mappings` - Create value mapping
- `GET /api/value-mappings/entity/:entityId` - Get value mappings
- `POST /api/value-mappings/:id/test` - Test value mapping

### Code Generation

- `POST /api/generate/entity` - Generate all code for entity
- `POST /api/generate/azure-function` - Generate Azure Function
- `POST /api/generate/node-red-flow` - Generate Node-RED flow

## Example Configurations

### Abstracted Model Example

```json
{
  "id": "entity_order",
  "name": "Order",
  "isAbstractedModel": true,
  "version": "1.0.0",
  "inboundSchema": {
    "type": "object",
    "properties": {
      "id": { "type": "string" },
      "orderNumber": { "type": "string" },
      "customerId": { "type": "string" },
      "totalAmount": { "type": "number" }
    }
  },
  "metadata": {
    "uniquenessConstraints": [
      {
        "id": "pk_order",
        "name": "primary_key",
        "fields": ["id"],
        "type": "primary",
        "active": true
      }
    ]
  }
}
```

### Sub-Child Mapping Example

```json
{
  "id": "mapping_customer_enrich",
  "source": "customer",
  "target": "customerProfile",
  "transformation": "sub-child",
  "subChildConfig": {
    "operation": "merge",
    "lookupKey": "customer.id",
    "lookupSource": "https://api.customer.internal/v2/profile/{customerId}",
    "mergeStrategy": "deep",
    "preserveFields": ["tier", "loyaltyPoints"],
    "fallbackBehavior": "use-original",
    "mappings": [
      {
        "source": "name",
        "target": "fullName",
        "transformation": "direct"
      }
    ]
  }
}
```

## Configuration

### Environment Variables

- `PORT`: Server port (default: 3000)
- `OPENAI_API_KEY`: OpenAI API key for LLM features
- `LLM_MODEL`: LLM model to use (default: gpt-4)
- `DATA_DIR`: Directory for JSON storage (default: ./data)

### Data Storage

JsonMapper uses a file-based JSON storage system with:
- Automatic versioning
- History tracking
- Backup/restore capabilities

## Development

### Running Tests

```bash
# Backend tests
npm test

# Frontend tests
cd frontend
npm test
```

### Building for Production

```bash
# Backend
npm run build

# Frontend
cd frontend
npm run build
```

### Docker Support

```bash
# Build image
docker build -t jsonmapper .

# Run container
docker run -p 3000:3000 -v $(pwd)/data:/app/data jsonmapper
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

- Documentation: [/docs](./docs)
- Issues: [GitHub Issues](https://github.com/yourusername/JsonMapper/issues)
- Discussions: [GitHub Discussions](https://github.com/yourusername/JsonMapper/discussions)

## Roadmap

- [x] Sub-child mapping with merge/replace capabilities
- [ ] Database backend option (PostgreSQL/MongoDB)
- [ ] Authentication and multi-user support
- [ ] Advanced LLM integration with multiple providers
- [ ] GraphQL API support
- [ ] Webhook integration
- [ ] Kubernetes deployment templates
- [ ] Performance monitoring and analytics
