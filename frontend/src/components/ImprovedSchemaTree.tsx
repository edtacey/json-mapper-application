import React, { useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface SchemaTreeProps {
  schema: any;
  type: 'source' | 'target';
  brokenMappings?: any[];
  path?: string;
  sampleData?: any;
  onDrop?: (result: any, item: any) => void;
  mappings?: any[]; // Add mappings to highlight mapped fields
}

// Helper function to safely get nested values from an object
const getNestedValue = (obj: any, path: string): any => {
  if (!obj || !path) return undefined;
  
  // Handle root
  if (path === '') return obj;
  
  // Handle array notation
  if (path.includes('[]')) {
    const parentPath = path.split('[]')[0];
    const remainingPath = path.split('[]').slice(1).join('[]');
    
    const parentValue = getNestedValue(obj, parentPath);
    if (Array.isArray(parentValue) && parentValue.length > 0) {
      // Return the first item in the array for example purposes
      if (remainingPath) {
        return getNestedValue(parentValue[0], remainingPath.startsWith('.') ? remainingPath.substring(1) : remainingPath);
      } else {
        return parentValue[0];
      }
    }
    return undefined;
  }
  
  // Handle regular dot notation
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    current = current[key];
  }
  
  return current;
};

// Create JsonPath from regular path
const pathToJsonPath = (path: string): string => {
  if (!path) return '$';
  return `$.${path}`;
};

export const ImprovedSchemaTree: React.FC<SchemaTreeProps> = ({
  schema,
  type,
  path = '',
  sampleData,
  brokenMappings = [],
  onDrop,
  mappings = []
}) => {
  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({
    root: true
  });

  const toggleExpand = (nodePath: string) => {
    setExpanded(prev => ({
      ...prev,
      [nodePath]: !prev[nodePath]
    }));
  };
  
  // Check if a field is mapped based on its JsonPath
  const isFieldMapped = (jsonPath: string) => {
    if (type === 'source') {
      return mappings.some(mapping => mapping.source === jsonPath);
    } else if (type === 'target') {
      return mappings.some(mapping => mapping.target === jsonPath);
    }
    return false;
  };

  const renderNode = (nodeSchema: any, nodePath: string, depth: number = 0) => {
    if (!nodeSchema) return null;

    const isObject = nodeSchema.type === 'object' && nodeSchema.properties;
    const isArray = nodeSchema.type === 'array';
    const isExpanded = expanded[nodePath] !== false;
    
    // Extract example value from sample data if available
    const exampleValue = sampleData ? getNestedValue(sampleData, nodePath) : undefined;
    
    // Check if this field is mapped
    const fieldJsonPath = pathToJsonPath(nodePath);
    const fieldIsMapped = isFieldMapped(fieldJsonPath);

    return (
      <div key={nodePath}>
        <SchemaNode
          path={nodePath}
          jsonPath={fieldJsonPath}
          name={nodePath.split('.').pop() || 'root'}
          type={nodeSchema.type}
          format={nodeSchema.format}
          required={nodeSchema.required}
          isDraggable={type === 'source'}
          isDroppable={type === 'target'}
          isExpanded={isExpanded}
          onToggle={() => toggleExpand(nodePath)}
          hasChildren={isObject || isArray}
          depth={depth}
          example={exampleValue}
          schemaType={type}
          onDrop={onDrop}
          isMapped={fieldIsMapped}
        />

        {isExpanded && isObject && nodeSchema.properties && (
          <div className="ml-4">
            {Object.entries(nodeSchema.properties).map(([propName, propSchema]) => 
              renderNode(
                propSchema,
                nodePath ? `${nodePath}.${propName}` : propName,
                depth + 1
              )
            )}
          </div>
        )}

        {isExpanded && isArray && nodeSchema.items && (
          <div className="ml-4">
            {renderNode(
              nodeSchema.items,
              `${nodePath}[]`,
              depth + 1
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="text-sm">
      {renderNode(schema, path)}
    </div>
  );
};

interface SchemaNodeProps {
  path: string;
  jsonPath: string;
  name: string;
  type: string;
  format?: string;
  required?: boolean;
  isDraggable: boolean;
  isDroppable: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  hasChildren: boolean;
  depth: number;
  example?: any;
  schemaType: 'source' | 'target';
  onDrop?: (result: any, item: any) => void;
  isMapped?: boolean; // Flag to indicate if this field is mapped
}

const SchemaNode: React.FC<SchemaNodeProps> = ({
  path,
  jsonPath,
  name,
  type,
  format,
  isDraggable,
  isDroppable,
  isExpanded,
  onToggle,
  hasChildren,
  depth,
  example,
  schemaType,
  onDrop,
  isMapped = false
}) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'FIELD',
    item: { 
      type: 'FIELD',
      path,
      jsonPath,
      fieldType: type,
      schemaType
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    canDrag: () => isDraggable
  }), [path, jsonPath, type, schemaType, isDraggable]);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'FIELD',
    canDrop: (item: any) => {
      // Only allow dropping if:
      // 1. This is a target field
      // 2. The dragged item is a source field
      // 3. This field is droppable
      return isDroppable && 
             item.schemaType === 'source' && 
             schemaType === 'target';
    },
    drop: (item: any) => {
      // Return field info for mapping creation
      const result = {
        targetPath: path,
        targetJsonPath: jsonPath,
        targetType: type,
        targetName: name
      };
      
      // Call the onDrop callback if provided
      if (onDrop) {
        onDrop(result, item);
      }
      
      return result;
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }), [path, jsonPath, isDroppable, schemaType, type, name, onDrop]);

  // Get field type color
  const getTypeColor = () => {
    switch (type) {
      case 'string':
        return 'text-green-600';
      case 'number':
      case 'integer':
        return 'text-blue-600';
      case 'boolean':
        return 'text-purple-600';
      case 'array':
        return 'text-orange-600';
      case 'object':
        return 'text-gray-800';
      default:
        return 'text-gray-600';
    }
  };

  // Combine ref functions
  const ref = (node: HTMLDivElement) => {
    if (isDraggable) drag(node);
    if (isDroppable) drop(node);
  };

  return (
    <div 
      ref={ref}
      className={`
        flex items-center py-1 px-2 rounded cursor-pointer transition-all
        ${isDragging ? 'opacity-50' : ''}
        ${isOver ? 'bg-blue-100' : ''}
        ${isDraggable || isDroppable ? 'hover:bg-gray-100' : ''}
      `}
      style={{ paddingLeft: `${depth * 16}px` }}
    >
      {hasChildren && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="mr-1"
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      )}
      
      <span className={`${isMapped ? 'font-bold' : 'font-medium'} text-gray-900`}>
        {name}
      </span>
      
      <span className={`ml-2 text-xs ${getTypeColor()}`}>
        {type}
        {format && ` (${format})`}
      </span>

      {/* Display example value if available */}
      {example !== undefined && (
        <span className="ml-3 text-xs text-gray-600 italic truncate max-w-36 overflow-hidden">
          Ex: {typeof example === 'object' ? JSON.stringify(example).substring(0, 25) : String(example).substring(0, 25)}
          {(typeof example === 'object' && JSON.stringify(example).length > 25) || 
           (typeof example !== 'object' && String(example).length > 25) ? '...' : ''}
        </span>
      )}
      
      {isDroppable && isOver && (
        <span className="ml-auto text-xs text-blue-600">Drop here</span>
      )}
      
      {/* Display schema type badge */}
      {isDraggable && (
        <span className="ml-2 text-xs px-1 bg-green-600 text-white rounded">source</span>
      )}
      {isDroppable && (
        <span className="ml-2 text-xs px-1 bg-blue-600 text-white rounded">target</span>
      )}
      
      {/* Display mapped indicator */}
      {isMapped && (
        <span className="ml-2 text-xs px-1 bg-purple-600 text-white rounded">mapped</span>
      )}
      
      {/* Display JsonPath for developers */}
      <span className="ml-2 text-xs text-gray-400 hidden group-hover:inline-block">{jsonPath}</span>
    </div>
  );
};

export default ImprovedSchemaTree;