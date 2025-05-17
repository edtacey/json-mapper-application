# Improved Mapping Interface PR

## Overview
This PR introduces a completely revamped mapping interface for JSON schema mapping, providing a more intuitive and visually informative experience. The improved interface replaces the previous implementation with a more robust drag-and-drop system that better handles complex scenarios and provides clearer visual feedback.

## Key Changes

### New Components
- **ImprovedSchemaTree**: A React DnD-based tree visualization for JSON schemas
- **ImprovedMappingPanel**: Panel displaying existing mappings with visual indicators
- **ImprovedMappingEditor**: Main component that orchestrates the improved mapping experience

### Major Features
1. **Enhanced Field Mapping UI**
   - Clear visual indicators for source and target fields
   - Color-coded field types (strings, numbers, booleans, arrays, objects)
   - Bold styling and "mapped" badge for fields that are part of mappings
   - Example values shown inline for better context

2. **Extended Mapping Types**
   - Added "Sub Child Merge" transformation type
   - Added "Sub Child Replace" transformation type
   - Automatic selection of appropriate transformation type based on field type

3. **Object and Array Mapping Support**
   - Direct support for mapping objects to objects
   - Direct support for mapping arrays to arrays
   - Default "Sub Child Replace" transformation for complex type mappings

4. **Improved User Experience**
   - Cleaner field name display (removed src/dst prefixes in the panel)
   - Better visual feedback during drag operations
   - Improved handling of same-name fields across schemas

## Technical Implementation

### React DnD Integration
The new implementation uses React DnD (react-dnd) instead of the previous dnd-kit library, providing more flexibility for complex drag and drop scenarios. Key technical aspects include:

- `useDrag` and `useDrop` hooks for field interaction
- Custom drop handling for mapping creation
- Conditional drag/drop enablement based on field types

### Mapping Types and Behaviors
Two new transformation types were added to handle complex mappings:

1. **Sub Child Merge**
   - Preserves existing values in the target
   - Adds/overwrites only fields that exist in the source

2. **Sub Child Replace**
   - Completely replaces target with source
   - Used as default when mapping objects or arrays

### Visual Enhancement with Tailwind
Extensive use of Tailwind CSS for visual styling:
- Color-coded transformation badges
- Highlighted states for drag and drop operations
- Responsive layout with flexible panels

## Learnings

### JSON Schema Mapping Challenges

1. **Field Identification**
   - JsonPath provides a reliable way to uniquely identify fields across schemas
   - Prefixing field display names helps users distinguish between source and target fields
   - Using both path and jsonPath allows for flexible referencing

2. **Complex Type Mappings**
   - Object-to-object mapping requires special handling
   - Array-to-array mapping needs contextual transformation options
   - Default transformation types should be selected based on field types

3. **Visual Feedback**
   - Clear indication of mapped fields is crucial for complex schemas
   - Color-coding and badges greatly enhance usability
   - Bold styling draws attention to already-mapped fields

4. **Drag and Drop Events**
   - Multi-step communication is needed between drag source and drop target
   - Event handlers need to pass comprehensive field information
   - Type checking is essential for determining valid drop targets

## Future Enhancements

1. **Expanded Transformation Options**
   - More specialized array transformations (map, filter, etc.)
   - Advanced templating for nested object transformations

2. **Visual Relationship Lines**
   - Draw lines between related fields for better visualization
   - Implement highlighting of related fields on hover

3. **Detailed Field Information**
   - Expandable panels with more schema metadata
   - Type validation warnings and suggestions

4. **Schema Navigation**
   - Search and filter functionality for large schemas
   - Collapsible sections for better navigation

## Testing Guidelines

When testing this PR, please focus on:

1. Mapping various field types (primitives, objects, arrays)
2. Creating mappings with different transformation types
3. Verifying visual indicators for mapped fields
4. Checking that object and array mappings work as expected
5. Ensuring the interface remains responsive with large schemas

## Migration Notes

The new mapper is now the default when accessing the mapping editor. The legacy mapper is still accessible via the "Legacy Mapper" button on the entity page if needed for comparison or troubleshooting.