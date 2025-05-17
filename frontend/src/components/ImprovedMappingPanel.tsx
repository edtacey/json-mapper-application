import React from 'react';
import { ArrowRight, Edit, Trash2 } from 'lucide-react';

interface Mapping {
  id: string;
  source: string;
  target: string;
  transformation: string;
  active: boolean;
  valueMapId?: string;
  template?: string;
  customFunction?: string;
  [key: string]: any;
}

interface ImprovedMappingPanelProps {
  mappings: Mapping[];
  selectedMapping: Mapping | null;
  onSelect: (mapping: Mapping) => void;
  onDelete: (id: string) => void;
  onEdit: (mapping: Mapping) => void;
  brokenMappings?: any[];
}

const ImprovedMappingPanel: React.FC<ImprovedMappingPanelProps> = ({
  mappings,
  selectedMapping,
  onSelect,
  onDelete,
  onEdit,
  brokenMappings = []
}) => {
  const getTransformationLabel = (transformation: string) => {
    switch (transformation) {
      case 'template': return 'Template';
      case 'function': return 'Custom Function';
      case 'lookup': return 'Lookup';
      case 'aggregate': return 'Aggregate';
      case 'conditional': return 'Conditional';
      case 'value-mapping': return 'Value Mapping';
      case 'sub-child': return 'Sub-child';
      case 'sub-child-merge': return 'Sub Child Merge';
      case 'sub-child-replace': return 'Sub Child Replace';
      default: return 'Direct';
    }
  };

  const getTransformationColor = (transformation: string) => {
    switch (transformation) {
      case 'template': return 'bg-purple-100 text-purple-800';
      case 'function': return 'bg-green-100 text-green-800';
      case 'lookup': return 'bg-yellow-100 text-yellow-800';
      case 'aggregate': return 'bg-orange-100 text-orange-800';
      case 'conditional': return 'bg-red-100 text-red-800';
      case 'value-mapping': return 'bg-indigo-100 text-indigo-800';
      case 'sub-child': return 'bg-pink-100 text-pink-800';
      case 'sub-child-merge': return 'bg-teal-100 text-teal-800';
      case 'sub-child-replace': return 'bg-cyan-100 text-cyan-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const isMappingBroken = (mappingId: string) => {
    return brokenMappings.some(broken => broken.id === mappingId);
  };

  const getSourceFieldName = (path: string) => {
    // Extract the last part of the path
    const parts = path.replace(/^\$\./, '').split('.');
    return parts[parts.length - 1];
  };

  const getTargetFieldName = (path: string) => {
    // Extract the last part of the path
    const parts = path.replace(/^\$\./, '').split('.');
    return parts[parts.length - 1];
  };

  return (
    <div className="h-full border rounded-md bg-white shadow-sm flex flex-col">
      <div className="px-4 py-3 border-b bg-gray-50">
        <h3 className="font-medium">Field Mappings</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {mappings.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <p>No mappings defined yet</p>
            <p className="text-sm mt-1">Drag fields from source to target to create mappings</p>
          </div>
        ) : (
          <ul className="divide-y">
            {mappings.map((mapping) => (
              <li 
                key={mapping.id}
                className={`px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                  selectedMapping?.id === mapping.id ? 'bg-blue-50' : ''
                } ${!mapping.active ? 'opacity-60' : ''} ${
                  isMappingBroken(mapping.id) ? 'border-l-4 border-red-500' : ''
                }`}
                onClick={() => onSelect(mapping)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-sm text-gray-600">
                      {getSourceFieldName(mapping.source)}
                    </span>
                    <ArrowRight size={16} className="text-gray-400" />
                    <span className="font-mono text-sm text-gray-600">
                      {getTargetFieldName(mapping.target)}
                    </span>
                  </div>
                  
                  <div className="flex space-x-1">
                    <button 
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(mapping);
                      }}
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(mapping.id);
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${getTransformationColor(mapping.transformation)}`}>
                    {getTransformationLabel(mapping.transformation)}
                  </span>
                  
                  {!mapping.active && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full text-xs">
                      Inactive
                    </span>
                  )}
                  
                  {mapping.template && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs">
                      Template
                    </span>
                  )}
                  
                  {mapping.customFunction && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">
                      Function
                    </span>
                  )}
                  
                  {mapping.valueMapId && (
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-xs">
                      Value Map
                    </span>
                  )}
                </div>
                
                {isMappingBroken(mapping.id) && (
                  <div className="mt-2 text-xs text-red-600">
                    {brokenMappings.find(b => b.id === mapping.id)?.errors?.join(', ') || 'Error in mapping'}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ImprovedMappingPanel;