# Preventing Build Issues - Quick Guide

## Common Issue: "Loading..." on Create New Entity

### ❌ What Goes Wrong
```typescript
// This shows loading for ALL routes, including /new
if (isLoading) {
  return <div>Loading...</div>;
}
```

### ✅ The Fix
```typescript
// Only show loading for existing entities
if (!isNew && isLoading) {
  return <div>Loading...</div>;
}
```

## Development Workflow

### 1. Use Hot Reload During Development
```bash
# Start with hot reload (recommended)
npm run dev

# This runs both:
# - Backend: http://localhost:3001
# - Frontend dev server: http://localhost:5173
```

### 2. Before Every Build
```bash
# Check for common issues
npm run check

# Auto-fix known problems
npm run fix

# Type check everything
npm run type-check
```

### 3. Smart Build Process
```bash
# Use smart build instead of regular build
npm run build:smart

# It will:
# - Check dependencies
# - Run type checks
# - Build backend & frontend
# - Verify outputs
```

## Quick Commands

```bash
npm run dev          # Development mode with hot reload
npm run check        # Pre-build checks
npm run fix          # Auto-fix common issues
npm run build:smart  # Smart build with verification
npm run type-check   # Check TypeScript in both projects
npm start            # Start production server
```

## Project Structure
```
JsonMapper/
├── src/              # Backend code
├── frontend/         # React app
├── scripts/          # Build & check scripts
├── dist/             # Backend build output
└── frontend/dist/    # Frontend build output
```

## If Something Goes Wrong

1. **"Loading..." stuck**: Run `npm run fix`
2. **Build fails**: Run `npm run check` first
3. **Frontend not updating**: Delete `frontend/dist` and rebuild
4. **Port conflicts**: Check `.env` for PORT setting

## Best Practices

1. Always use `npm run dev` during development
2. Run `npm run check` before building
3. Use `npm run build:smart` for production builds
4. Keep the development guide handy: `docs/DEVELOPMENT.md`
