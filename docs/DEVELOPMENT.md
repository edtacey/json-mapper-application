# Development Best Practices for JsonMapper

## Avoiding Common Build Issues

### 1. Loading States in React

**Problem**: Components showing "Loading..." for new/create routes.

**Solution**: 
```typescript
// ❌ Wrong
if (isLoading) {
  return <div>Loading...</div>;
}

// ✅ Correct
if (!isNew && isLoading) {
  return <div>Loading...</div>;
}
```

### 2. Hot Reloading Setup

**Use the development server for real-time updates:**
```bash
# Start both backend and frontend with hot reload
npm run dev

# Backend only
npm run dev:backend

# Frontend only
npm run dev:frontend
```

### 3. Build Verification

**Always run the full build before deployment:**
```bash
# Run smart build with checks
npm run build:smart

# Quick pre-build check
npm run check
```

### 4. Common Patterns

#### Entity Editor Pattern
```typescript
const EntityEditor: React.FC = () => {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  
  // Only show loading for existing entities
  if (!isNew && isLoading) {
    return <Loading />;
  }
  
  // Handle new entity creation
  if (isNew) {
    return <CreateForm />;
  }
  
  // Handle existing entity
  return <EditForm />;
};
```

#### API Integration Pattern
```typescript
// Always handle loading states properly
const { data, isLoading, error } = useQuery(
  ['entity', id],
  () => api.entities.getById(id),
  { 
    enabled: !isNew, // Don't fetch for new entities
    retry: 1,
    refetchOnWindowFocus: false
  }
);
```

### 5. Testing Before Commit

**Run these checks before committing:**
```bash
# 1. Type check
npm run type-check

# 2. Build test
npm run build

# 3. Start and verify
npm start
# Open http://localhost:3001
# Test creating new entity
# Test editing existing entity
```

### 6. Environment Setup

**Required files:**
- `.env` - Environment variables
- `tsconfig.json` - TypeScript config
- `frontend/tsconfig.json` - Frontend TypeScript config
- `frontend/vite.config.ts` - Vite configuration

### 7. Debugging Tips

**Frontend issues:**
```bash
# Check browser console for errors
# Use React DevTools
# Check Network tab for API calls
```

**Backend issues:**
```bash
# Check server logs
# Use nodemon for auto-restart
# Check API responses with curl/Postman
```

### 8. Auto-fixing Script

**Create an auto-fix script:**
```javascript
// scripts/auto-fix.js
const fs = require('fs');
const path = require('path');

const fixes = {
  'frontend/src/pages/EntityEditor.tsx': {
    find: /if\s*\(\s*isLoading\s*\)/,
    replace: 'if (!isNew && isLoading)'
  }
};

// Apply fixes...
```

## Quick Reference

```bash
# Development
npm run dev           # Start everything with hot reload
npm run dev:backend   # Backend only
npm run dev:frontend  # Frontend only

# Building
npm run build         # Build everything
npm run build:smart   # Build with checks
npm run check         # Pre-build checks

# Testing
npm test              # Run tests
npm run test:watch    # Watch mode

# Production
npm start             # Start production server
```

## Troubleshooting

### "Loading..." stuck on create new entity
1. Check EntityEditor.tsx for proper loading condition
2. Ensure route is `/entities/new`
3. Verify isNew detection: `const isNew = !id || id === 'new'`

### Frontend changes not showing
1. Clear browser cache
2. Rebuild frontend: `npm run build:frontend`
3. Check for TypeScript errors
4. Verify dist folder exists

### API not responding
1. Check backend is running on correct port
2. Verify CORS settings
3. Check environment variables
4. Look for TypeScript compilation errors

## Git Hooks

Consider adding pre-commit hooks:
```json
// package.json
"husky": {
  "hooks": {
    "pre-commit": "npm run check && npm run build"
  }
}
```
