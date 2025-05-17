import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Upload, Code, Shield, Copy } from 'lucide-react';
import Editor from '@monaco-editor/react';
import toast from 'react-hot-toast';
import * as yaml from 'js-yaml';
import { api } from '../services/api';
import { AbstractedModelManager } from '../components/AbstractedModel';
import { AbstractedFlagsGroup } from '../components/entity/AbstractedFlag';
import { SchemaFormatToggle } from '../components/entity/SchemaFormatToggle';
import { EntitySchema } from '../types';
import { UniqueConstraintsEditor } from '../components/UniqueConstraintsEditor';

export const EntityEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === 'new';

  const [entityData, setEntityData] = useState({
    name: '',
    description: '',
    abstracted: false,
    inboundAbstracted: false,
    outboundAbstracted: false,
    samplePayload: JSON.stringify({
      "exampleField": "value",
      "anotherField": 123,
      "nestedObject": {
        "property": "test"
      }
    }, null, 2)
  });

  const [showUniqueConstraintsEditor, setShowUniqueConstraintsEditor] = useState(false);
  const [activeTab, setActiveTab] = useState<'sample' | 'api' | 'schema' | 'abstracted' | 'outputConfig'>('sample');
  const [inboundSchema, setInboundSchema] = useState<string>('{}');
  const [outboundSchema, setOutboundSchema] = useState<string>('{}');
  const [schemaFormat, setSchemaFormat] = useState<'json' | 'yaml'>('json');
  const [schemaEditMode, setSchemaEditMode] = useState(false);

  const { data: entity, isLoading } = useQuery(
    ['entity', id],
    () => api.entities.getById(id!),
    { enabled: !isNew }
  );

  useEffect(() => {
    if (entity) {
      setEntityData({
        name: entity.name,
        description: entity.description || '',
        abstracted: entity.abstracted || false,
        inboundAbstracted: entity.inboundAbstracted || false,
        outboundAbstracted: entity.outboundAbstracted || false,
        samplePayload: JSON.stringify(entity.metadata?.sampleData || {}, null, 2)
      });
      
      // Use the entity's schema format preference if available
      if (entity.schemaFormat) {
        setSchemaFormat(entity.schemaFormat);
      }
      
      if (schemaFormat === 'json' || !entity.schemaFormat) {
        setInboundSchema(JSON.stringify(entity.inboundSchema, null, 2));
        setOutboundSchema(JSON.stringify(entity.outboundSchema, null, 2));
      } else {
        setInboundSchema(yaml.dump(entity.inboundSchema, { indent: 2 }));
        setOutboundSchema(yaml.dump(entity.outboundSchema, { indent: 2 }));
      }
    }
  }, [entity, schemaFormat]);

  const createEntityMutation = useMutation(
    (data: any) => api.entities.create(data),
    {
      onSuccess: (response) => {
        toast.success('Entity created successfully');
        navigate(`/entities/${response.entity.id}`);
      },
      onError: (error: any) => {
        const errorMessage = error?.response?.data?.error || 'Failed to create entity';
        toast.error(`Error: ${errorMessage}`);
      }
    }
  );

  const updateEntityMutation = useMutation(
    (data: any) => api.entities.update(id!, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['entity', id]);
        toast.success('Entity updated successfully');
        setSchemaEditMode(false);
      },
      onError: (error: any) => {
        const errorMessage = error?.response?.data?.error || 'Failed to update entity';
        toast.error(`Error: ${errorMessage}`);
      }
    }
  );

  const updateSchemaMutation = useMutation(
    (data: { inboundSchema: any; outboundSchema: any }) => 
      api.entities.updateSchemas(id!, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['entity', id]);
        toast.success('Schemas updated successfully');
        setSchemaEditMode(false);
      },
      onError: (error: any) => {
        const errorMessage = error?.response?.data?.error || 'Failed to update schemas';
        toast.error(`Error: ${errorMessage}`);
      }
    }
  );

  const handleSave = async () => {
    if (isNew) {
      try {
        const samplePayload = JSON.parse(entityData.samplePayload);
        createEntityMutation.mutate({
          samplePayload,
          entityName: entityData.name,
          description: entityData.description,
          abstracted: entityData.abstracted,
          inboundAbstracted: entityData.inboundAbstracted,
          outboundAbstracted: entityData.outboundAbstracted,
          schemaFormat: schemaFormat
        });
      } catch (error) {
        toast.error('Invalid JSON in sample payload');
      }
    } else {
      updateEntityMutation.mutate({
        name: entityData.name,
        description: entityData.description,
        abstracted: entityData.abstracted,
        inboundAbstracted: entityData.inboundAbstracted,
        outboundAbstracted: entityData.outboundAbstracted,
        schemaFormat: schemaFormat
      });
    }
  };

  const handleSaveSchemas = async () => {
    try {
      let inbound, outbound;
      
      if (schemaFormat === 'json') {
        inbound = JSON.parse(inboundSchema);
        outbound = JSON.parse(outboundSchema);
      } else {
        inbound = yaml.load(inboundSchema);
        outbound = yaml.load(outboundSchema);
      }
      
      updateSchemaMutation.mutate({
        inboundSchema: inbound,
        outboundSchema: outbound
      });
    } catch (error) {
      toast.error(`Invalid ${schemaFormat.toUpperCase()} format`);
    }
  };

  const handleCloneToDestination = () => {
    const confirmDelete = window.confirm('Cloning source schema to destination will invalidate existing mappings. Do you want to remove all downstream mappings for this entity?');
    
    setOutboundSchema(inboundSchema);
    
    // Enable edit mode if not already enabled
    if (!schemaEditMode) {
      setSchemaEditMode(true);
    }
    
    try {
      // Parse the schemas
      let inbound, outbound;
      
      if (schemaFormat === 'json') {
        inbound = JSON.parse(inboundSchema);
        // Use inbound for outbound since we're cloning
        outbound = inbound;
      } else {
        inbound = yaml.load(inboundSchema);
        // Use inbound for outbound since we're cloning
        outbound = inbound;
      }
      
      // Automatically save the schemas to the backend
      updateSchemaMutation.mutate({
        inboundSchema: inbound,
        outboundSchema: outbound
      });
      
      // If user agreed to delete mappings, do that via API
      if (confirmDelete && id) {
        // Delete all mappings for this entity
        api.mappings.deleteAllForEntity(id)
          .then(() => {
            toast.success('Source schema cloned to destination and existing mappings removed');
            queryClient.invalidateQueries(['entity', id]);
            
            // Generate new default mappings if needed
            return api.mappings.generateDefaults(id);
          })
          .then(() => {
            toast.success('New default mappings generated');
            queryClient.invalidateQueries(['mappings', id]);
          })
          .catch(error => {
            toast.error('Failed to process mappings: ' + error.message);
          });
      } else {
        toast.success('Source schema cloned to destination and saved');
      }
    } catch (error) {
      toast.error(`Invalid ${schemaFormat.toUpperCase()} format`);
    }
  };

  const toggleSchemaFormat = () => {
    try {
      if (schemaFormat === 'json') {
        const inbound = JSON.parse(inboundSchema);
        const outbound = JSON.parse(outboundSchema);
        setInboundSchema(yaml.dump(inbound, { indent: 2 }));
        setOutboundSchema(yaml.dump(outbound, { indent: 2 }));
        setSchemaFormat('yaml');
      } else {
        const inbound = yaml.load(inboundSchema) as any;
        const outbound = yaml.load(outboundSchema) as any;
        setInboundSchema(JSON.stringify(inbound, null, 2));
        setOutboundSchema(JSON.stringify(outbound, null, 2));
        setSchemaFormat('json');
      }
    } catch (error) {
      toast.error(`Failed to convert between formats`);
    }
  };

  const handleImportFromAPI = async (apiConfig: any) => {
    const importMutation = await api.entities.import(apiConfig);
    if (importMutation.entity) {
      navigate(`/entities/${importMutation.entity.id}`);
      toast.success('Entity imported successfully');
    }
  };

  if (!isNew && isLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {isNew ? 'Create New Entity' : `Edit Entity: ${entity?.name}`}
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entity Name
              </label>
              <input
                type="text"
                value={entityData.name}
                onChange={(e) => setEntityData({ ...entityData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Order, Customer, Product"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={entityData.description}
                onChange={(e) => setEntityData({ ...entityData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Brief description of this entity"
              />
            </div>
          </div>
          <div className="mt-4">
            <AbstractedFlagsGroup
              abstracted={entityData.abstracted}
              inboundAbstracted={entityData.inboundAbstracted}
              outboundAbstracted={entityData.outboundAbstracted}
              onAbstractedChange={(checked) => setEntityData({ ...entityData, abstracted: checked })}
              onInboundAbstractedChange={(checked) => setEntityData({ ...entityData, inboundAbstracted: checked })}
              onOutboundAbstractedChange={(checked) => setEntityData({ ...entityData, outboundAbstracted: checked })}
              disabled={false}
            />
          </div>
        </div>

        {isNew && (
          <div className="p-6">
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('sample')}
                  className={`
                    py-2 px-1 border-b-2 font-medium text-sm
                    ${activeTab === 'sample'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  From Sample JSON
                </button>
                <button
                  onClick={() => setActiveTab('api')}
                  className={`
                    py-2 px-1 border-b-2 font-medium text-sm
                    ${activeTab === 'api'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  From External API
                </button>
              </nav>
            </div>

            {activeTab === 'sample' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sample Payload (JSON)
                </label>
                <div className="h-96 border border-gray-300 rounded-md overflow-hidden">
                  <Editor
                    language="json"
                    value={entityData.samplePayload}
                    onChange={(value) => setEntityData({ ...entityData, samplePayload: value || '{}' })}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14
                    }}
                  />
                </div>
              </div>
            )}

            {activeTab === 'api' && (
              <ApiImportForm onImport={handleImportFromAPI} />
            )}
          </div>
        )}

        {!isNew && entity && (
          <div className="p-6">
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('schema')}
                  className={`
                    py-2 px-1 border-b-2 font-medium text-sm
                    ${activeTab === 'schema'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  Schema
                </button>
                <button
                  onClick={() => setActiveTab('sample')}
                  className={`
                    py-2 px-1 border-b-2 font-medium text-sm
                    ${activeTab === 'sample'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  Sample Data
                </button>
                <button
                  onClick={() => setActiveTab('abstracted')}
                  className={`
                    py-2 px-1 border-b-2 font-medium text-sm
                    ${activeTab === 'abstracted'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <span className="flex items-center">
                    <Shield className="h-4 w-4 mr-1" />
                    Abstracted Model
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('outputConfig')}
                  className={`
                    py-2 px-1 border-b-2 font-medium text-sm
                    ${activeTab === 'outputConfig'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <span className="flex items-center">
                    <Shield className="h-4 w-4 mr-1" />
                    Output Configuration
                  </span>
                </button>
              </nav>
            </div>

            {activeTab === 'schema' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-4">
                    <h3 className="text-lg font-medium text-gray-900">Schema Editor</h3>
                    <div className="flex items-center space-x-2">
                      <SchemaFormatToggle
                        format={schemaFormat}
                        onChange={(format) => {
                          // Update format in API
                          api.entities.updateSchemaFormat(id!, { schemaFormat: format });
                          // Then update locally
                          toggleSchemaFormat();
                        }}
                      />
                      <button
                        onClick={() => setSchemaEditMode(!schemaEditMode)}
                        className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${
                          schemaEditMode 
                            ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <Code className="mr-1 h-4 w-4" />
                        {schemaEditMode ? 'Editing' : 'View Only'}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={handleCloneToDestination}
                    className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    <Copy className="mr-1 h-4 w-4" />
                    Clone Source to Destination
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-md font-medium text-gray-700 mb-2">Source Schema (Inbound)</h4>
                    <div className="h-96 border border-gray-300 rounded-md overflow-hidden">
                      <Editor
                        language={schemaFormat}
                        value={inboundSchema}
                        onChange={(value) => setInboundSchema(value || '{}')}
                        options={{
                          readOnly: !schemaEditMode,
                          minimap: { enabled: false },
                          fontSize: 12
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-md font-medium text-gray-700 mb-2">Destination Schema (Outbound)</h4>
                    <div className="h-96 border border-gray-300 rounded-md overflow-hidden">
                      <Editor
                        language={schemaFormat}
                        value={outboundSchema}
                        onChange={(value) => setOutboundSchema(value || '{}')}
                        options={{
                          readOnly: !schemaEditMode,
                          minimap: { enabled: false },
                          fontSize: 12
                        }}
                      />
                    </div>
                  </div>
                </div>

                {schemaEditMode && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={handleSaveSchemas}
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save Schema Changes
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'sample' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Sample Data</h3>
                <div className="h-96 border border-gray-300 rounded-md overflow-hidden">
                  <Editor
                    language="json"
                    value={entityData.samplePayload}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 14
                    }}
                  />
                </div>
              </div>
            )}

            {activeTab === 'abstracted' && (
              <AbstractedModelManager
                entity={entity}
                onUpdate={(updatedEntity: EntitySchema) => {
                  queryClient.setQueryData(['entity', id], updatedEntity);
                  toast.success('Entity updated successfully');
                }}
              />
            )}

            {activeTab === 'outputConfig' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Output Configuration</h3>
                
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-md font-medium text-gray-700 mb-3">Unique Constraints &amp; Upsert Configuration</h3>
                      <p className="text-sm text-gray-500 mb-3">
                        Configure how records are identified and updated when existing records are found.
                        You can use fields from your schema to uniquely identify records, including array item fields.
                      </p>
                      
                      <button
                        onClick={() => setShowUniqueConstraintsEditor(true)}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        {entity?.upsertConfig?.enabled 
                          ? 'Edit Unique Constraints' 
                          : 'Configure Unique Constraints'}
                      </button>
                      
                      {entity?.upsertConfig?.enabled && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-md">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Current Configuration</h4>
                          
                          <div className="space-y-3">
                            <div>
                              <span className="text-sm font-medium text-gray-500">Conflict Resolution:</span>
                              <span className="ml-2 text-sm text-gray-900 capitalize">{entity.upsertConfig.conflictResolution}</span>
                            </div>
                            
                            {entity.upsertConfig.conflictResolution === 'merge' && (
                              <div>
                                <span className="text-sm font-medium text-gray-500">Merge Strategy:</span>
                                <span className="ml-2 text-sm text-gray-900 capitalize">{entity.upsertConfig.mergeStrategy || 'shallow'}</span>
                              </div>
                            )}
                            
                            <div>
                              <span className="text-sm font-medium text-gray-500">Unique Fields:</span>
                              {entity.upsertConfig.uniqueFields?.length > 0 ? (
                                <ul className="mt-2 space-y-1">
                                  {entity.upsertConfig.uniqueFields.map((field: string) => (
                                    <li key={field} className="text-sm text-gray-900">
                                      {field}
                                      {field.includes('[]') && (
                                        <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                                          Array Item
                                        </span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="ml-2 text-sm text-gray-500 italic">No unique fields specified</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Additional output configuration sections can be added here */}
                  </div>
                </div>
              </div>
            )}
            
            {showUniqueConstraintsEditor && id && entity && (
              <UniqueConstraintsEditor
                entityId={id}
                upsertConfig={entity.upsertConfig || { enabled: false, uniqueFields: [], conflictResolution: 'update' }}
                onClose={() => setShowUniqueConstraintsEditor(false)}
                onUpdate={() => queryClient.invalidateQueries(['entity', id])}
              />
            )}
          </div>
        )}

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
          <div>
            {!isNew && (
              <div className="flex space-x-2">
                <button
                  onClick={() => navigate(`/entities/${id}/mappings`)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Edit Mappings
                </button>
                <button
                  onClick={() => navigate(`/entities/${id}/legacy-mappings`)}
                  className="inline-flex items-center px-4 py-2 border border-indigo-300 rounded-md text-sm font-medium text-gray-500 bg-white hover:bg-gray-50"
                >
                  Legacy Mapper
                </button>
              </div>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              <Save className="mr-2 h-4 w-4" />
              {isNew ? 'Create Entity' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ApiImportFormProps {
  onImport: (config: any) => void;
}

const ApiImportForm: React.FC<ApiImportFormProps> = ({ onImport }) => {
  const [apiConfig, setApiConfig] = useState({
    apiEndpoint: '',
    method: 'GET',
    headers: '{}',
    sampleRequest: '{}',
    entityName: ''
  });

  const handleImport = () => {
    try {
      const headers = JSON.parse(apiConfig.headers);
      const sampleRequest = JSON.parse(apiConfig.sampleRequest);
      
      onImport({
        ...apiConfig,
        headers,
        sampleRequest
      });
    } catch (error) {
      toast.error('Invalid JSON in headers or sample request');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          API Endpoint
        </label>
        <input
          type="text"
          value={apiConfig.apiEndpoint}
          onChange={(e) => setApiConfig({ ...apiConfig, apiEndpoint: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder="https://api.example.com/endpoint"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            HTTP Method
          </label>
          <select
            value={apiConfig.method}
            onChange={(e) => setApiConfig({ ...apiConfig, method: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Entity Name
          </label>
          <input
            type="text"
            value={apiConfig.entityName}
            onChange={(e) => setApiConfig({ ...apiConfig, entityName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Order"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Headers (JSON)
        </label>
        <div className="h-32 border border-gray-300 rounded-md overflow-hidden">
          <Editor
            language="json"
            value={apiConfig.headers}
            onChange={(value) => setApiConfig({ ...apiConfig, headers: value || '{}' })}
            options={{
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: 'off'
            }}
          />
        </div>
      </div>

      {apiConfig.method !== 'GET' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sample Request Body (JSON)
          </label>
          <div className="h-32 border border-gray-300 rounded-md overflow-hidden">
            <Editor
              language="json"
              value={apiConfig.sampleRequest}
              onChange={(value) => setApiConfig({ ...apiConfig, sampleRequest: value || '{}' })}
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                lineNumbers: 'off'
              }}
            />
          </div>
        </div>
      )}

      <div className="pt-4">
        <button
          onClick={handleImport}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
        >
          <Upload className="mr-2 h-4 w-4" />
          Import from API
        </button>
      </div>
    </div>
  );
};
