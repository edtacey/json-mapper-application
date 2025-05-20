import React, { useState, useEffect } from 'react';
import { PlusCircle, X, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

interface UniqueConstraintsEditorProps {
  entityId: string;
  upsertConfig: any;
  onClose: () => void;
  onUpdate: () => void;
}

export const UniqueConstraintsEditor: React.FC<UniqueConstraintsEditorProps> = ({
  entityId,
  upsertConfig,
  onClose,
  onUpdate
}) => {
  const [config, setConfig] = useState(upsertConfig || { enabled: false, uniqueFields: [], conflictResolution: 'update' });
  const [entity, setEntity] = useState<any>(null);
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newField, setNewField] = useState('');
  const [showArrayFields, setShowArrayFields] = useState(false);
  const [arrayFields, setArrayFields] = useState<string[]>([]);
  const [selectedArrayField, setSelectedArrayField] = useState('');
  const [selectedArrayItem, setSelectedArrayItem] = useState('');

  useEffect(() => {
    const fetchEntity = async () => {
      try {
        const data = await api.entities.getById(entityId);
        setEntity(data);
        
        // Extract all fields from schema including array fields
        const extractedFields = extractAllFields(data.outboundSchema);
        setAvailableFields(extractedFields.regularFields);
        setArrayFields(extractedFields.arrayFields);
        
        setLoading(false);
      } catch (error) {
        console.error('Failed to load entity data:', error);
        toast.error('Failed to load entity data');
        setLoading(false);
      }
    };
    
    fetchEntity();
  }, [entityId]);

  const extractAllFields = (schema: any, parentPath = ''): { regularFields: string[], arrayFields: string[] } => {
    const regularFields: string[] = [];
    const arrayFields: string[] = [];
    
    if (!schema || !schema.properties) return { regularFields, arrayFields };
    
    // Extract regular fields
    Object.entries(schema.properties).forEach(([key, value]: [string, any]) => {
      const path = parentPath ? `${parentPath}.${key}` : key;
      
      if (value.type === 'object' && value.properties) {
        // Recursively extract fields from nested objects
        const nestedFields = extractAllFields(value, path);
        regularFields.push(...nestedFields.regularFields);
        arrayFields.push(...nestedFields.arrayFields);
      } else if (value.type === 'array' && value.items) {
        // Add the array field
        arrayFields.push(path);
        
        // Extract fields from array items if they are objects
        if (value.items.type === 'object' && value.items.properties) {
          Object.entries(value.items.properties).forEach(([itemKey]: [string, any]) => {
            regularFields.push(`${path}[].${itemKey}`);
          });
        }
      } else {
        regularFields.push(path);
      }
    });
    
    return { regularFields, arrayFields };
  };

  const handleToggleEnabled = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({
      ...config,
      enabled: e.target.checked
    });
  };

  const handleChangeConflictResolution = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setConfig({
      ...config,
      conflictResolution: e.target.value
    });
  };

  const handleChangeMergeStrategy = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setConfig({
      ...config,
      mergeStrategy: e.target.value
    });
  };

  const handleAddField = () => {
    if (newField && !config.uniqueFields.includes(newField)) {
      setConfig({
        ...config,
        uniqueFields: [...config.uniqueFields, newField]
      });
      setNewField('');
    }
  };

  const handleAddArrayItemField = () => {
    if (selectedArrayField && selectedArrayItem) {
      const arrayItemField = `${selectedArrayField}[].${selectedArrayItem}`;
      
      if (!config.uniqueFields.includes(arrayItemField)) {
        setConfig({
          ...config,
          uniqueFields: [...config.uniqueFields, arrayItemField]
        });
      }
      
      setSelectedArrayField('');
      setSelectedArrayItem('');
    }
  };

  const handleRemoveField = (field: string) => {
    setConfig({
      ...config,
      uniqueFields: config.uniqueFields.filter((f: string) => f !== field)
    });
  };

  const handleSave = async () => {
    try {
      await api.entities.updateUpsertConfig(entityId, config);
      toast.success('Unique constraints updated successfully');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Failed to update unique constraints:', error);
      toast.error('Failed to update unique constraints');
    }
  };

  const getArrayItemFields = (arrayPath: string): string[] => {
    if (!entity || !arrayPath) return [];
    
    // Parse schema to get array item fields
    const parts = arrayPath.split('.');
    let current: any = entity.outboundSchema;
    
    // Navigate to the array in the schema
    for (let i = 0; i < parts.length; i++) {
      if (!current.properties || !current.properties[parts[i]]) return [];
      current = current.properties[parts[i]];
    }
    
    if (current.type !== 'array' || !current.items || !current.items.properties) return [];
    
    // Return the property names from the array items
    return Object.keys(current.items.properties);
  };

  if (loading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      {/* Panel */}
      <div className="relative ml-auto w-1/2 bg-white shadow-xl h-full overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Edit Unique Constraints</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Enabled Toggle */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="enabled"
              checked={config.enabled}
              onChange={handleToggleEnabled}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="enabled" className="text-sm font-medium text-gray-700">
              Enable Upsert Configuration
            </label>
          </div>

          {/* Conflict Resolution */}
          {config.enabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Conflict Resolution Strategy
              </label>
              <select
                value={config.conflictResolution}
                onChange={handleChangeConflictResolution}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="update">Update</option>
                <option value="merge">Merge</option>
                <option value="skip">Skip</option>
                <option value="error">Error</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                How to handle conflicts when records with the same unique keys are found
              </p>
            </div>
          )}

          {/* Merge Strategy */}
          {config.enabled && config.conflictResolution === 'merge' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Merge Strategy
              </label>
              <select
                value={config.mergeStrategy || 'shallow'}
                onChange={handleChangeMergeStrategy}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="shallow">Shallow</option>
                <option value="deep">Deep</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                How to merge existing and new data (shallow: top-level properties only, deep: recursive merge)
              </p>
            </div>
          )}

          {/* Unique Fields */}
          {config.enabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unique Fields
              </label>
              
              {/* Regular Field Selector */}
              <div className="mb-4">
                <div className="flex space-x-2">
                  <select
                    value={newField}
                    onChange={(e) => setNewField(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a field...</option>
                    {availableFields.map(field => (
                      <option key={field} value={field}>{field}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddField}
                    disabled={!newField}
                    className={`
                      px-3 py-2 rounded-md text-sm font-medium
                      ${!newField
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                      }
                    `}
                  >
                    <PlusCircle className="h-5 w-5" />
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Select regular fields to add as unique constraints
                </p>
              </div>

              {/* Toggle for Array Item Fields */}
              <div className="mb-4">
                <button
                  onClick={() => setShowArrayFields(!showArrayFields)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  {showArrayFields ? 'Hide Array Fields' : 'Show Array Fields'}
                </button>
                <p className="mt-1 text-xs text-gray-500">
                  Include array item fields in unique constraints
                </p>
              </div>

              {/* Array Item Field Selector */}
              {showArrayFields && (
                <div className="p-4 bg-gray-50 rounded-md mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Add Array Item Field
                  </h3>
                  
                  <div className="space-y-3">
                    {/* Array Field */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Select Array
                      </label>
                      <select
                        value={selectedArrayField}
                        onChange={(e) => setSelectedArrayField(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select an array field...</option>
                        {arrayFields.map(field => (
                          <option key={field} value={field}>{field}</option>
                        ))}
                      </select>
                    </div>

                    {/* Array Item Field */}
                    {selectedArrayField && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Select Item Field
                        </label>
                        <select
                          value={selectedArrayItem}
                          onChange={(e) => setSelectedArrayItem(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select an item field...</option>
                          {getArrayItemFields(selectedArrayField).map(field => (
                            <option key={field} value={field}>{field}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Add Button */}
                    <button
                      onClick={handleAddArrayItemField}
                      disabled={!selectedArrayField || !selectedArrayItem}
                      className={`
                        w-full px-3 py-2 rounded-md text-sm font-medium
                        ${!selectedArrayField || !selectedArrayItem
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                        }
                      `}
                    >
                      Add Array Item Field
                    </button>
                  </div>
                </div>
              )}

              {/* Selected Unique Fields */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700">
                  Selected Unique Fields
                </h3>
                
                {config.uniqueFields.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">
                    No unique fields selected
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {config.uniqueFields.map((field: string) => (
                      <li 
                        key={field}
                        className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md"
                      >
                        <span className="text-sm text-gray-700">
                          {field}
                          {field.includes('[]') && (
                            <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                              Array Item
                            </span>
                          )}
                        </span>
                        <button
                          onClick={() => handleRemoveField(field)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
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