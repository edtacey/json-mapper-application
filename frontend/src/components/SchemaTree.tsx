import React, { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useDraggable, useDroppable } from '@dnd-kit/core';

interface SchemaTreeProps {
  schema: any;
  type: 'source' | 'target';
  brokenMappings?: any[];
  path?: string;
  sampleData?: any; // Add sample data for examples
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

export const SchemaTree: React.FC<SchemaTreeProps> = ({
  schema,
  type,
  path = '',
  sampleData
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

  const renderNode = (nodeSchema: any, nodePath: string, depth: number = 0) => {
    if (!nodeSchema) return null;

    const isObject = nodeSchema.type === 'object' && nodeSchema.properties;
    const isArray = nodeSchema.type === 'array';
    const isExpanded = expanded[nodePath] !== false;
    
    // Extract example value from sample data if available
    const exampleValue = sampleData ? getNestedValue(sampleData, nodePath) : undefined;

    return (
      <div key={nodePath}>
        <SchemaNode
          path={nodePath}
          name={nodePath.split('.').pop() || 'root'}
          type={nodeSchema.type}
          format={nodeSchema.format}
          required={nodeSchema.required}
          isDraggable={type === 'source' && !isObject && !isArray}
          isDroppable={type === 'target' && !isObject && !isArray}
          isExpanded={isExpanded}
          onToggle={() => toggleExpand(nodePath)}
          hasChildren={isObject || isArray}
          depth={depth}
          example={exampleValue}
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
  example?: any; // Add example value
}

const SchemaNode: React.FC<SchemaNodeProps> = ({
  path,
  name,
  type,
  format,
  isDraggable,
  isDroppable,
  isExpanded,
  onToggle,
  hasChildren,
  depth,
  example
}) => {
  // Use simple but distinctive prefixes to keep IDs stable
  const sourcePrefix = "SOURCE_";
  const targetPrefix = "TARGET_";
  
  // Create unique IDs for source and target that don't conflict
  const dragId = `${sourcePrefix}${path.replace(/\./g, '_')}`;
  const dropId = `${targetPrefix}${path.replace(/\./g, '_')}`;

  const {
    attributes: dragAttributes,
    listeners: dragListeners,
    setNodeRef: setDragRef,
    isDragging
  } = useDraggable({
    id: dragId,
    data: {
      type: 'source',
      path,
      fieldType: type
    },
    disabled: !isDraggable
  });

  // Force all droppable fields to remain enabled regardless of field names
  const {
    setNodeRef: setDropRef,
    isOver
  } = useDroppable({
    id: dropId,
    data: {
      type: 'target',
      path,
      fieldType: type
    },
    disabled: false // NEVER disable drop targets, allow all fields to receive drops
  });

  const nodeClassName = `
    flex items-center py-1 px-2 rounded cursor-pointer transition-all
    ${isDragging ? 'opacity-50' : ''}
    ${isOver ? 'bg-blue-100' : ''}
    ${isDraggable || isDroppable ? 'hover:bg-gray-100' : ''}
  `;
  
  // Never disable a droppable target, even during drag operations with the same field name

  const ref = isDraggable ? setDragRef : isDroppable ? setDropRef : undefined;
  const handlers = isDraggable ? { ...dragListeners } : {};

  return (
    <div
      ref={ref}
      {...dragAttributes}
      {...handlers}
      className={nodeClassName}
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
      
      <span className="font-medium text-gray-900">
        {isDraggable ? `src:${name}` : isDroppable ? `dst:${name}` : name}
      </span>
      
      <span className="ml-2 text-xs text-gray-500">
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
      
      {/* Added visual indicator for same-name fields that are enabled for dropping */}
      {isDraggable && (
        <span className="ml-2 text-xs px-1 bg-green-600 text-white rounded">v6.0</span>
      )}
    </div>
  );
};
