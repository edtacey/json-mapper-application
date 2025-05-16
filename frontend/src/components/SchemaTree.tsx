import React, { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useDraggable, useDroppable } from '@dnd-kit/core';

interface SchemaTreeProps {
  schema: any;
  type: 'source' | 'target';
  brokenMappings?: any[];
  path?: string;
}

export const SchemaTree: React.FC<SchemaTreeProps> = ({
  schema,
  type,
  brokenMappings = [],
  path = ''
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
  depth
}) => {
  const {
    attributes: dragAttributes,
    listeners: dragListeners,
    setNodeRef: setDragRef,
    isDragging
  } = useDraggable({
    id: `source-${path}`,
    data: {
      type: 'source',
      path,
      fieldType: type
    },
    disabled: !isDraggable
  });

  const {
    setNodeRef: setDropRef,
    isOver
  } = useDroppable({
    id: `target-${path}`,
    data: {
      type: 'target',
      path,
      fieldType: type
    },
    disabled: !isDroppable
  });

  const nodeClassName = `
    flex items-center py-1 px-2 rounded cursor-pointer transition-all
    ${isDragging ? 'opacity-50' : ''}
    ${isOver ? 'bg-blue-100' : ''}
    ${isDraggable || isDroppable ? 'hover:bg-gray-100' : ''}
  `;

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
      
      <span className="font-medium text-gray-900">{name}</span>
      
      <span className="ml-2 text-xs text-gray-500">
        {type}
        {format && ` (${format})`}
      </span>
      
      {isDroppable && isOver && (
        <span className="ml-auto text-xs text-blue-600">Drop here</span>
      )}
    </div>
  );
};
