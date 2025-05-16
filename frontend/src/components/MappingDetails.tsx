import React, { useState, useEffect } from 'react';
import { X, Play, Save } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

interface MappingDetailsProps {
  mapping: any;
  onUpdate: (updates: any) => void;
  onClose: () => void;
}

export const MappingDetails: React.FC<MappingDetailsProps> = ({
  mapping,
  onUpdate,
  onClose
}) => {
  const [editedMapping, setEditedMapping] = useState(mapping);
  const [testInput, setTestInput] = useState('{}');
  const [testOutput, setTestOutput] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [valueMappings, setValueMappings] = useState<any[]>([]);

  useEffect(() => {
    setEditedMapping(mapping);
    // Load value mappings if needed
    if (mapping.entityId) {
      api.valueMappings.getByEntityId(mapping.entityId)
        .then(setValueMappings)
        .catch(() => {});
    }
  }, [mapping]);

  const transformationTypes = [
    { value: 'direct', label: 'Direct' },
    { value: 'template', label: 'Template' },
    { value: 'function', label: 'Function' },
    { value: 'value-mapping', label: 'Value Mapping' },
    { value: 'aggregate', label: 'Aggregate' },
    { value: 'conditional', label: 'Conditional' }
  ];

  const handleSave = () => {
    onUpdate(editedMapping);
    onClose();
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const result = await api.mappings.test({
        mapping: editedMapping,
        input: JSON.parse(testInput)
      });
      setTestOutput(JSON.stringify(result.output, null, 2));
      toast.success('Test completed successfully');
    } catch (error: any) {
      setTestOutput(`Error: ${error.message}`);
      toast.error('Test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setEditedMapping(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      {/* Panel */}
      <div className="relative ml-auto w-1/2 bg-white shadow-xl h-full overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Mapping Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Properties */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source Path
              </label>
              <input
                type="text"
                value={editedMapping.source}
                onChange={(e) => updateField('source', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Path
              </label>
              <input
                type="text"
                value={editedMapping.target}
                onChange={(e) => updateField('target', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transformation Type
              </label>
              <select
                value={editedMapping.transformation}
                onChange={(e) => updateField('transformation', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {transformationTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="active"
                checked={editedMapping.active}
                onChange={(e) => updateField('active', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="active" className="text-sm font-medium text-gray-700">
                Active
              </label>
            </div>
          </div>

          {/* Transformation-specific fields */}
          {editedMapping.transformation === 'template' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template
              </label>
              <input
                type="text"
                value={editedMapping.template || ''}
                onChange={(e) => updateField('template', e.target.value)}
                placeholder="e.g., ${field1}-${field2}"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Use ${'{'}fieldName{'}'} to reference fields from the source
              </p>
            </div>
          )}

          {editedMapping.transformation === 'function' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Function
              </label>
              <div className="h-48 border border-gray-300 rounded-md overflow-hidden">
                <Editor
                  language="javascript"
                  value={editedMapping.customFunction || '// return modified value\nreturn value;'}
                  onChange={(value) => updateField('customFunction', value)}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 12,
                    lineNumbers: 'off'
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Function receives 'value' and 'data' parameters
              </p>
            </div>
          )}

          {editedMapping.transformation === 'value-mapping' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Value Mapping
              </label>
              <select
                value={editedMapping.valueMapId || ''}
                onChange={(e) => updateField('valueMapId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a value mapping...</option>
                {valueMappings.map(vm => (
                  <option key={vm.id} value={vm.id}>
                    {vm.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Test Section */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Test Transformation</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Input (JSON)
                </label>
                <div className="h-32 border border-gray-300 rounded-md overflow-hidden">
                  <Editor
                    language="json"
                    value={testInput}
                    onChange={(value) => setTestInput(value || '{}')}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 12,
                      lineNumbers: 'off'
                    }}
                  />
                </div>
              </div>

              <button
                onClick={handleTest}
                disabled={isTesting}
                className={`
                  w-full inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium
                  ${isTesting
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                  }
                `}
              >
                <Play className="mr-2 h-4 w-4" />
                {isTesting ? 'Testing...' : 'Test Transformation'}
              </button>

              {testOutput && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Output
                  </label>
                  <div className="h-32 border border-gray-300 rounded-md overflow-hidden">
                    <Editor
                      language="json"
                      value={testOutput}
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 12,
                        lineNumbers: 'off'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
          >
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
