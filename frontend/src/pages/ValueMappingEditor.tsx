import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Plus, Trash2, Play } from 'lucide-react';
import Editor from '@monaco-editor/react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

export const ValueMappingEditor: React.FC = () => {
  const { id: entityId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  
  const [selectedMapping, setSelectedMapping] = useState<any>(null);
  const [testValue, setTestValue] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  
  const { data: entity } = useQuery(
    ['entity', entityId],
    () => api.entities.getById(entityId!)
  );
  
  const { data: valueMappings, isLoading } = useQuery(
    ['value-mappings', entityId],
    () => api.valueMappings.getByEntityId(entityId!),
    { enabled: !!entityId }
  );
  
  const createMutation = useMutation(
    (data: any) => api.valueMappings.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['value-mappings', entityId]);
        toast.success('Value mapping created');
      }
    }
  );
  
  const updateMutation = useMutation(
    ({ id, data }: any) => api.valueMappings.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['value-mappings', entityId]);
        toast.success('Value mapping updated');
      }
    }
  );
  
  const deleteMutation = useMutation(
    (id: string) => api.valueMappings.delete(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['value-mappings', entityId]);
        toast.success('Value mapping deleted');
        setSelectedMapping(null);
      }
    }
  );
  
  const testMutation = useMutation(
    ({ id, value }: any) => api.valueMappings.test(id, value),
    {
      onSuccess: (result) => {
        setTestResult(result);
      }
    }
  );
  
  const handleCreate = () => {
    const newMapping = {
      name: 'New Value Mapping',
      description: '',
      entityId,
      type: 'exact',
      mappings: {},
      defaultValue: 'UNKNOWN',
      caseSensitive: false
    };
    
    createMutation.mutate(newMapping);
  };
  
  const handleSave = () => {
    if (selectedMapping) {
      updateMutation.mutate({
        id: selectedMapping.id,
        data: selectedMapping
      });
    }
  };
  
  const handleTest = () => {
    if (selectedMapping && testValue) {
      testMutation.mutate({
        id: selectedMapping.id,
        value: testValue
      });
    }
  };
  
  if (isLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }
  
  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Value Mappings: {entity?.name}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Define value transformations for your data
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Value Mapping
        </button>
      </div>
      
      <div className="flex-1 flex">
        {/* List */}
        <div className="w-1/3 border-r bg-gray-50 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Value Mappings</h2>
          <div className="space-y-2">
            {valueMappings && valueMappings.length > 0 ? (
              valueMappings.map((mapping: any) => (
                <div
                  key={mapping.id}
                  onClick={() => setSelectedMapping(mapping)}
                  className={`
                    p-4 rounded-lg border cursor-pointer transition-all
                    ${selectedMapping?.id === mapping.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                    }
                  `}
                >
                  <div className="font-medium text-gray-900">{mapping.name}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Type: {mapping.type} • Mappings: {Object.keys(mapping.mappings).length}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No value mappings defined
              </div>
            )}
          </div>
        </div>
        
        {/* Editor */}
        {selectedMapping ? (
          <div className="flex-1 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Value Mapping</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={selectedMapping.name}
                    onChange={(e) => setSelectedMapping({
                      ...selectedMapping,
                      name: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={selectedMapping.type}
                    onChange={(e) => setSelectedMapping({
                      ...selectedMapping,
                      type: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="exact">Exact Match</option>
                    <option value="regex">Regular Expression</option>
                    <option value="range">Numeric Range</option>
                    <option value="contains">Contains</option>
                    <option value="prefix">Prefix</option>
                    <option value="suffix">Suffix</option>
                  </select>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={selectedMapping.description || ''}
                  onChange={(e) => setSelectedMapping({
                    ...selectedMapping,
                    description: e.target.value
                  })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Description of this value mapping"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Value
                  </label>
                  <input
                    type="text"
                    value={selectedMapping.defaultValue}
                    onChange={(e) => setSelectedMapping({
                      ...selectedMapping,
                      defaultValue: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Value when no match found"
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="caseSensitive"
                    checked={selectedMapping.caseSensitive}
                    onChange={(e) => setSelectedMapping({
                      ...selectedMapping,
                      caseSensitive: e.target.checked
                    })}
                    className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="caseSensitive" className="text-sm font-medium text-gray-700">
                    Case Sensitive
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mappings (JSON)
                </label>
                <div className="h-64 border border-gray-300 rounded-md overflow-hidden">
                  <Editor
                    language="json"
                    value={JSON.stringify(selectedMapping.mappings, null, 2)}
                    onChange={(value) => {
                      try {
                        const mappings = JSON.parse(value || '{}');
                        setSelectedMapping({
                          ...selectedMapping,
                          mappings
                        });
                      } catch (error) {
                        // Invalid JSON, don't update
                      }
                    }}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 12
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Define mappings as key-value pairs. Keys are patterns to match, values are the mapped results.
                </p>
              </div>
            </div>
            
            {/* Test Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Test Mapping</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Test Value
                  </label>
                  <input
                    type="text"
                    value={testValue}
                    onChange={(e) => setTestValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter value to test"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">&nbsp;</label>
                  <button
                    onClick={handleTest}
                    className="w-full inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Test
                  </button>
                </div>
                
                {testResult && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Result
                    </label>
                    <div className={`
                      px-3 py-2 rounded-md text-sm font-medium
                      ${testResult.matched
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                      }
                    `}>
                      {testResult.value}
                      {testResult.confidence && (
                        <span className="text-xs ml-2">
                          ({Math.round(testResult.confidence * 100)}% confidence)
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Actions */}
            <div className="mt-8 flex justify-between">
              <button
                onClick={() => deleteMutation.mutate(selectedMapping.id)}
                className="inline-flex items-center px-4 py-2 border border-red-300 text-red-700 rounded-md text-sm font-medium hover:bg-red-50"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
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
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a value mapping to edit or create a new one
          </div>
        )}
      </div>
    </div>
  );
};
