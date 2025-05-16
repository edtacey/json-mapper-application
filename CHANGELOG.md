# Changelog

All notable changes to the JsonMapper project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-05-16

### Added
- YAML/JSON schema format support
  - Toggle control for switching between formats
  - Schema format persistence in entity model
  - Format conversion utilities
  - Documentation for format options
- Enhanced abstracted model capabilities
  - Inbound and outbound abstraction flags
  - Entity linking functionality
  - Reference and inheritance link types
  - Link management API endpoints
  - Visual indicators for linked entities
- New frontend components
  - SchemaFormatToggle component
  - Enhanced AbstractedFlag component
  - AbstractedFlagsGroup component
  - Switch UI component

### Changed
- Entity data model to include schemaFormat, inboundAbstracted, and outboundAbstracted properties
- Entity service to support schema format selection and entity linking
- API endpoints to handle new abstraction and linking features
- Entity controller to expose new functionality

### Enhanced
- Entity validation to enforce abstraction rules
- Link management with create, read, and delete operations
- Documentation with comprehensive schema abstraction guide
- Migration support for existing entities

## [1.1.0] - 2025-05-15

### Added
- Abstracted flag feature for entities
  - New checkbox control in entity editor UI
  - Visual indicators in entity list view
  - Filter options to show/hide abstracted entities
  - Tooltip help text explaining the feature
  - Support for both frontend and backend
- Migration support for existing entities (default abstracted=false)
- Unit tests for abstracted flag functionality
- User documentation for the abstracted flag feature

### Changed
- Entity data model to include abstracted property
- Entity save/load logic to persist abstracted flag
- Entity list UI to display abstracted status with badges
- Entity creation and update endpoints to handle abstracted flag

### Enhanced
- Entity forms with abstracted flag control
- State management to track abstracted flag changes
- Export/import functionality to include abstracted flag
- Filter functionality in entity list view

## [1.0.0] - 2024-01-15

### Added
- Initial release of JsonMapper with complete feature set
- Entity management system for creating schemas from JSON samples
- Visual mapping editor with drag-and-drop functionality
- Comprehensive value mapping system with multiple matching strategies:
  - Exact match
  - Regular expression matching
  - Numeric range matching
  - Contains substring matching
  - Prefix/suffix matching
- LLM integration for intelligent suggestions and mapping refresh
- Code generation for multiple platforms:
  - TypeScript interfaces
  - Azure Functions
  - Node-RED flows
  - Test suites
  - Documentation
- Web-based UI with:
  - Dashboard overview
  - Entity editor
  - Mapping editor
  - Value mapping editor
  - Code generator interface
- REST API with complete CRUD operations
- JSON file-based data persistence with versioning
- Example data and initialization scripts
- Docker support for containerized deployment

### Security
- Environment-based configuration for sensitive data
- Input validation for all API endpoints
- Safe sandboxed execution for custom functions

### Documentation
- Comprehensive README with setup instructions
- API documentation
- Task tracking (TASKS.md)
- Example data structures

## [Unreleased]

### Planned
- Database backend options (PostgreSQL, MongoDB)
- User authentication and multi-user support
- Real-time collaboration features
- Advanced visualization for mappings
- GraphQL API support
- Direct cloud deployment integrations

---

## Version History

### Pre-release Development

#### 2024-01-15 - Value Mapping Implementation
- Added ValueMappingService with full CRUD operations
- Implemented multiple matching strategies
- Created value mapping UI components
- Integrated value mappings with main mapping system
- Added test interface for value mappings

#### 2024-01-14 - Core Mapping System
- Implemented mapping service with transformations
- Created visual mapping editor
- Added drag-and-drop functionality
- Implemented mapping validation

#### 2024-01-13 - Entity Management
- Created entity service
- Added JSON schema generation
- Implemented entity CRUD operations
- Added API import functionality

#### 2024-01-12 - Initial Setup
- Project structure creation
- Basic Express server setup
- React frontend initialization
- TypeScript configuration

---

## Contributing

When contributing to this project, please:
1. Update the CHANGELOG.md with your changes
2. Follow the existing code style
3. Write tests for new features
4. Update documentation as needed

## Release Process

1. Update version in package.json files
2. Update CHANGELOG.md with release date
3. Create git tag with version number
4. Build and test all components
5. Deploy to production environment
