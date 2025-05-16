# JsonMapper MVP v1.0.0

## 🎉 MVP Release - Complete Feature Set

This repository contains the Minimum Viable Product (MVP) release of JsonMapper, a comprehensive JSON mapping and transformation system with LLM integration.

### Core Features Implemented

✅ **Entity Management**
- JSON schema generation from samples
- Import from external APIs
- Version control and metadata tracking

✅ **Advanced Mapping System**
- Visual drag-and-drop mapping editor
- Multiple transformation types:
  - Direct mapping
  - Template transformations
  - Custom functions
  - Value mappings
  - Aggregations
  - Conditional logic
  - **Sub-child mapping (merge/replace)** - NEW!

✅ **Sub-Child Mapping Capability**
- Merge operation for data enrichment
- Replace operation for complete substitution
- External API data lookups
- Fallback behavior configuration
- Deep/shallow merge strategies

✅ **Output Schema Management**
- External API schema sourcing
- Manual schema editing
- Version history tracking
- Schema validation

✅ **Upsert Configuration**
- Unique field constraints
- Conflict resolution strategies
- Deep/shallow merge options

✅ **Change Event Publishing**
- Automatic event generation
- CloudEvents format support
- Event routing configuration
- Event history tracking

✅ **Code Generation**
- Azure Functions
- Node-RED flows
- TypeScript interfaces
- Unit tests
- Documentation

✅ **LLM Integration**
- OpenAI integration for mapping suggestions
- Schema enhancement
- Code optimization

### Technology Stack

- **Backend**: TypeScript, Express.js, Node.js
- **Frontend**: React, TypeScript, TailwindCSS, Vite
- **Storage**: JSON file-based (upgradeable to database)
- **LLM**: OpenAI API
- **Code Generation**: Handlebars templates

### Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   cd frontend && npm install
   ```
3. Configure environment:
   ```bash
   cp .env.example .env
   # Add your OpenAI API key
   ```
4. Start development servers:
   ```bash
   npm run dev
   ```
5. Access the application:
   - Frontend: http://localhost:5173
   - API: http://localhost:3000

### Repository Information

- **Version**: 1.0.0-mvp
- **Commit**: 43f47ea
- **Date**: May 2025
- **Author**: Ed Tacey
- **Status**: MVP Complete, Production Ready

### Next Steps

- Deploy to production environment
- Add database backend option
- Implement authentication
- Create deployment templates
- Add monitoring and analytics

### Documentation

- [README.md](README.md) - Full documentation
- [QUICK_START.md](QUICK_START.md) - Quick start guide
- [PROJECT_STATUS.md](PROJECT_STATUS.md) - Detailed status
- [API Documentation](docs/API.md) - API reference
- [Architecture](docs/ARCHITECTURE.md) - System design

---

**JsonMapper MVP** - A complete JSON transformation solution ready for enterprise use.
