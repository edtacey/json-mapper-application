import React from 'react';
import { GitBranch, AlertTriangle, Trash2 } from 'lucide-react';

interface MappingListProps {
  mappings: any[];
  selectedMapping: any;
  onSelect: (mapping: any) => void;
  onDelete: (id: string) => void;
  brokenMappings?: any[];
}

export const MappingList: React.FC<MappingListProps> = ({
  mappings,
  selectedMapping,
  onSelect,
  onDelete,
  brokenMappings = []
}) => {
  const isBroken = (mappingId: string) => {
    return brokenMappings.some(bm => bm.mapping.id === mappingId);
  };

  const getTransformationIcon = (type: string) => {
    switch (type) {
      case 'direct':
        return '→';
      case 'template':
        return '📝';
      case 'function':
        return 'ƒ';
      case 'value-mapping':
        return '🗺️';
      case 'aggregate':
        return '∑';
      default:
        return '?';
    }
  };

  return (
    <div className="space-y-2">
      {mappings.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <GitBranch className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p>No mappings defined</p>
          <p className="text-sm mt-2">
            Drag fields from the input schema to the output schema to create mappings
          </p>
        </div>
      ) : (
        mappings.map((mapping) => {
          const isSelected = selectedMapping?.id === mapping.id;
          const broken = isBroken(mapping.id);

          return (
            <div
              key={mapping.id}
              onClick={() => onSelect(mapping)}
              className={`
                p-4 rounded-lg border cursor-pointer transition-all
                ${isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : broken
                  ? 'border-red-300 bg-red-50 hover:border-red-400'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-mono
                    ${broken ? 'bg-red-200' : 'bg-gray-200'}
                  `}>
                    {getTransformationIcon(mapping.transformation)}
                  </div>
                  <div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">
                        {mapping.source}
                      </span>
                      <span className="mx-2 text-gray-400">→</span>
                      <span className="text-sm font-medium text-gray-900">
                        {mapping.target}
                      </span>
                    </div>
                    <div className="flex items-center mt-1 space-x-2">
                      <span className="text-xs text-gray-500">
                        {mapping.transformation}
                      </span>
                      {mapping.valueMapId && (
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                          Value Map
                        </span>
                      )}
                      {!mapping.active && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {broken && (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(mapping.id);
                    }}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
