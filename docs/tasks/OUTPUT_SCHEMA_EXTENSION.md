# Output Schema Extension Task List

## Overview
This task list covers the implementation of enhanced output schema functionality including external API sourcing, schema editing, upsert capabilities, and change event publishing.

## Task Breakdown

### 1. External API Schema Sourcing
- [ ] Extend EntityService to fetch output schemas from external APIs
- [ ] Add API endpoint configuration for output schema sources
- [ ] Implement caching for external schema fetches
- [ ] Add retry logic for failed API calls
- [ ] Create UI component for external schema URL configuration

### 2. Output Schema Editor
- [ ] Create OutputSchemaEditor React component
- [ ] Add Monaco editor integration for JSON schema editing
- [ ] Implement schema validation on edit
- [ ] Add visual schema preview
- [ ] Create save/revert functionality
- [ ] Implement schema versioning
- [ ] Add schema import/export capabilities

### 3. Upsert Configuration
- [ ] Add uniqueness field selection to entity configuration
- [ ] Create UI for defining unique key combinations
- [ ] Implement composite key support
- [ ] Add validation for uniqueness constraints
- [ ] Extend mapping service to support upsert logic
- [ ] Create upsert strategy configuration (update vs merge)

### 4. Change Event Publishing
- [ ] Create EventPublisher service
- [ ] Implement change detection algorithm
- [ ] Add event queue configuration options
- [ ] Support multiple event formats (CloudEvents, custom)
- [ ] Implement event routing configuration
- [ ] Add event batching capabilities
- [ ] Create event history/audit log
- [ ] Add retry mechanism for failed event deliveries

### 5. API Endpoints
- [ ] POST /api/entities/{id}/output-schema/fetch - Fetch from external API
- [ ] PUT /api/entities/{id}/output-schema - Update output schema
- [ ] GET /api/entities/{id}/output-schema/versions - Get schema versions
- [ ] POST /api/entities/{id}/upsert-config - Configure upsert settings
- [ ] GET /api/entities/{id}/change-events - Get event history
- [ ] POST /api/entities/{id}/publish-event - Manually trigger event

### 6. Code Generation Updates
- [ ] Update Azure Function templates to support upsert
- [ ] Add event publishing to generated code
- [ ] Include change detection logic in templates
- [ ] Update Node-RED flows for event publishing
- [ ] Add configuration for event endpoints

### 7. UI Components
- [ ] OutputSchemaTab component for entity editor
- [ ] UpsertConfigurationPanel component
- [ ] EventPublishingSettings component
- [ ] EventHistoryViewer component
- [ ] SchemaVersionComparison component

### 8. Testing
- [ ] Unit tests for EventPublisher service
- [ ] Unit tests for upsert logic
- [ ] Integration tests for external schema fetching
- [ ] E2E tests for schema editing workflow
- [ ] Performance tests for event publishing

### 9. Documentation
- [ ] Update API documentation
- [ ] Create user guide for output schema features
- [ ] Document event formats and publishing
- [ ] Add upsert configuration examples
- [ ] Update architecture diagrams

## Dependencies
- Extend EntitySchema type to include upsert configuration
- Update Mapping type to support change tracking
- Create new Event and EventConfiguration types
- Extend storage layer for event persistence

## Timeline
- Week 1: External API schema sourcing and editor
- Week 2: Upsert configuration implementation
- Week 3: Change event publishing
- Week 4: Testing and documentation

## Success Criteria
- [ ] Users can fetch and edit output schemas from external APIs
- [ ] Upsert operations work based on user-defined uniqueness
- [ ] Change events are published reliably
- [ ] All generated code includes the new functionality
- [ ] Comprehensive test coverage (>80%)
