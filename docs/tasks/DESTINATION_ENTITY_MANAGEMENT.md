# Destination Entity Management Task List

## Overview
Implement destination entity management that allows users to create, import, link, and reuse destination schemas across multiple source entities, similar to how source entities are currently managed.

## Task Breakdown

### 1. Data Model Extensions
- [ ] Create `DestinationEntity` type extending current entity structure
- [ ] Add `destinationEntityId` field to source entities for linking
- [ ] Add `isDestination` flag to EntitySchema to differentiate types
- [ ] Create `EntityRelationship` type to track source-destination mappings
- [ ] Add `sharedDestinations` collection for reusable destination schemas
- [ ] Implement versioning for destination entities

### 2. Database/Storage Updates
- [ ] Create storage for destination entities (`data/destination-entities`)
- [ ] Add relationship tracking storage (`data/entity-relationships`)
- [ ] Implement destination entity CRUD operations
- [ ] Add clone functionality for destination entities
- [ ] Create migration script for existing entities

### 3. Service Layer Enhancements
#### EntityService Extensions
- [ ] Add `createDestinationEntity()` method
- [ ] Add `linkDestinationEntity()` method
- [ ] Add `cloneDestinationEntity()` method
- [ ] Add `getDestinationEntities()` method
- [ ] Add `unlinkDestinationEntity()` method
- [ ] Add `getLinkedSources()` method for destinations
- [ ] Update `generateFromSample()` to support destination creation

#### New DestinationEntityService
- [ ] Create dedicated service for destination entity management
- [ ] Implement schema validation for destinations
- [ ] Add schema compatibility checking
- [ ] Implement destination reuse tracking
- [ ] Add impact analysis for destination changes

### 4. API Endpoints
- [ ] `POST /api/destination-entities/generate` - Create from sample
- [ ] `POST /api/destination-entities/import` - Import from API
- [ ] `GET /api/destination-entities` - List all destinations
- [ ] `GET /api/destination-entities/:id` - Get specific destination
- [ ] `PUT /api/destination-entities/:id` - Update destination
- [ ] `DELETE /api/destination-entities/:id` - Delete (with validation)
- [ ] `POST /api/destination-entities/:id/clone` - Clone destination
- [ ] `GET /api/destination-entities/:id/sources` - Get linked sources
- [ ] `POST /api/entities/:id/link-destination` - Link destination to source
- [ ] `DELETE /api/entities/:id/unlink-destination` - Unlink destination

### 5. UI Components
#### New Components
- [ ] `DestinationEntityList` - List view of all destinations
- [ ] `DestinationEntityEditor` - Create/edit destination schemas
- [ ] `DestinationSelector` - Modal to select existing destinations
- [ ] `DestinationPreview` - Preview destination schema structure
- [ ] `LinkDestinationModal` - UI for linking destinations
- [ ] `DestinationUsageIndicator` - Show where destination is used

#### Updated Components
- [ ] Update `EntityEditor` to support destination creation mode
- [ ] Add destination selection tab to `EntityEditor`
- [ ] Update `MappingEditor` to show destination entity info
- [ ] Add destination management to Dashboard statistics
- [ ] Update `EntityList` to filter by source/destination

### 6. Frontend State Management
- [ ] Add destination entities to Redux/Context state
- [ ] Create actions for destination CRUD operations
- [ ] Add relationship tracking to state
- [ ] Implement destination selection state
- [ ] Add destination filtering and search

### 7. Mapping System Updates
- [ ] Update mapping validation to use linked destinations
- [ ] Modify code generation to reference destination entities
- [ ] Update mapping suggestions based on destination schema
- [ ] Add destination schema change impact analysis
- [ ] Implement mapping migration for schema changes

### 8. Code Generation Updates
- [ ] Update Azure Function templates for destination entities
- [ ] Update Node-RED templates for destination entities
- [ ] Generate destination interfaces separately
- [ ] Add destination validation to generated code
- [ ] Include destination versioning in generated code

### 9. Business Logic Enhancements
#### Destination Reuse Logic
- [ ] Implement compatibility checking algorithm
- [ ] Add schema diff visualization
- [ ] Create mapping suggestion engine
- [ ] Add automatic field matching
- [ ] Implement conflict resolution

#### Validation Rules
- [ ] Prevent deletion of destinations in use
- [ ] Validate schema compatibility on linking
- [ ] Check for circular dependencies
- [ ] Ensure required fields are mapped
- [ ] Validate destination schema changes

### 10. Documentation & Help
- [ ] Create destination entity user guide
- [ ] Add destination management to API docs
- [ ] Create migration guide for existing users
- [ ] Add destination best practices guide
- [ ] Update architecture documentation

### 11. Testing
- [ ] Unit tests for DestinationEntityService
- [ ] Integration tests for linking/unlinking
- [ ] E2E tests for destination creation flow
- [ ] Performance tests for multiple destinations
- [ ] Migration tests for existing data

### 12. UI/UX Flow
```
1. Create New Entity Flow:
   ├── Choose Type (Source/Destination)
   ├── If Destination:
   │   ├── Create from Sample JSON
   │   ├── Import from API
   │   └── Clone Existing
   └── If Source:
       ├── Create as usual
       └── Link to Destination:
           ├── Select Existing
           ├── Create New
           └── Clone & Modify

2. Destination Management:
   ├── List All Destinations
   ├── View Usage (linked sources)
   ├── Edit Schema
   ├── Version History
   └── Impact Analysis
```

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- Data model extensions
- Storage layer updates
- Basic CRUD operations
- Service layer foundation

### Phase 2: API & Backend (Week 2)
- REST endpoints
- Business logic
- Validation rules
- Relationship management

### Phase 3: UI Components (Week 3)
- Destination entity UI
- Selection modals
- List views
- Integration with existing UI

### Phase 4: Advanced Features (Week 4)
- Cloning functionality
- Impact analysis
- Schema versioning
- Migration tools

### Phase 5: Testing & Documentation (Week 5)
- Comprehensive testing
- Documentation
- User guides
- Performance optimization

## Migration Plan
1. Add `isDestination` flag to existing entities
2. Create destination entity copies where needed
3. Link source entities to destinations
4. Update mappings to reference destinations
5. Validate all relationships
6. Clean up redundant data

## Success Criteria
- [ ] Users can create destination entities separately
- [ ] Destinations can be reused across multiple sources
- [ ] Schema changes propagate correctly
- [ ] Code generation uses destination references
- [ ] UI clearly shows source-destination relationships
- [ ] Performance remains optimal with many destinations
- [ ] Existing functionality remains intact

## Technical Considerations
1. **Backward Compatibility**: Ensure existing entities continue to work
2. **Performance**: Optimize queries for destination lookups
3. **Caching**: Implement caching for frequently used destinations
4. **Versioning**: Track destination schema versions
5. **Security**: Validate permissions for destination access

## UI Mockups Needed
1. Destination entity creation wizard
2. Destination selector modal
3. Source-destination relationship diagram
4. Destination usage dashboard
5. Schema diff viewer

## Risk Mitigation
1. **Data Loss**: Implement comprehensive backup before migration
2. **Performance**: Add indexes for destination lookups
3. **Complexity**: Provide clear UI guidance
4. **Breaking Changes**: Version the API properly
5. **User Confusion**: Create detailed documentation

## Dependencies
- TypeScript type definitions
- React components library
- State management updates
- API versioning strategy
- Database schema updates

## Estimated Timeline
- Total Duration: 5-6 weeks
- Development: 4 weeks
- Testing: 1 week
- Documentation: 1 week
- Buffer: 1 week

## Next Steps
1. Review and approve task list
2. Set up feature branch
3. Begin with data model design
4. Create API specification
5. Design UI mockups
