import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import { api } from '../services/api';
import ImprovedSchemaTree from '../components/ImprovedSchemaTree';
import ImprovedMappingPanel from '../components/ImprovedMappingPanel';
import { MappingDetails } from '../components/MappingDetails';

// Define Mapping interface for type safety
interface Mapping {
  id: string;
  entityId: string;
  source: string;
  target: string;
  transformation: string;
  active: boolean;
  [key: string]: any;
}

export const ImprovedMappingEditor: React.FC = () => {
  const { id: entityId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [selectedMapping, setSelectedMapping] = useState<any>(null);
  const [showMappingDetails, setShowMappingDetails] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastEditTime, setLastEditTime] = useState<string>(new Date().toLocaleTimeString());
  
  const { data: entity, isLoading: entityLoading } = useQuery(
    ['entity', entityId],
    () => api.entities.getById(entityId!),
    { enabled: !!entityId }
  );

  const { data: mappings = [], isLoading: mappingsLoading } = useQuery(
    ['mappings', entityId],
    () => api.mappings.getByEntityId(entityId!),
    { enabled: !!entityId }
  );

  const { data: brokenMappings = [] } = useQuery(
    ['broken-mappings', entityId],
    () => api.mappings.validate(mappings || [], entityId!),
    { enabled: !!entityId && !!mappings }
  );

  const createMappingMutation = useMutation(
    (mapping: any) => api.mappings.create(mapping),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['mappings', entityId]);
        toast.success('Mapping created successfully');
        setLastEditTime(new Date().toLocaleTimeString());
      },
      onError: () => {
        toast.error('Failed to create mapping');
      }
    }
  );

  const updateMappingMutation = useMutation(
    ({ id, updates }: { id: string; updates: any }) => 
      api.mappings.update(id, updates),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['mappings', entityId]);
        toast.success('Mapping updated successfully');
        setLastEditTime(new Date().toLocaleTimeString());
      },
      onError: () => {
        toast.error('Failed to update mapping');
      }
    }
  );

  const deleteMappingMutation = useMutation(
    (id: string) => api.mappings.delete(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['mappings', entityId]);
        toast.success('Mapping deleted successfully');
        setSelectedMapping(null);
        setLastEditTime(new Date().toLocaleTimeString());
      },
      onError: () => {
        toast.error('Failed to delete mapping');
      }
    }
  );

  const refreshMappingsMutation = useMutation(
    (context?: string) => api.mappings.refresh(entityId!, context),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['mappings', entityId]);
        queryClient.invalidateQueries(['broken-mappings', entityId]);
        toast.success(`Refreshed ${data.mappings.length} mappings`);
        setIsRefreshing(false);
        setLastEditTime(new Date().toLocaleTimeString());
      },
      onError: () => {
        toast.error('Failed to refresh mappings');
        setIsRefreshing(false);
      }
    }
  );

  // This function handles drag end and mapping creation
  const handleFieldDrop = (result: any, item: any) => {
    if (!result) return;
    
    // Determine if this is an object or array mapping
    const isSourceObjectOrArray = item.fieldType === 'object' || item.fieldType === 'array';
    
    // Create a new mapping
    const newMapping = {
      entityId,
      source: item.jsonPath,
      target: result.targetJsonPath,
      transformation: isSourceObjectOrArray ? 'sub-child-replace' : 'direct',
      active: true
    };
    
    // Check if a mapping already exists for this target
    const existingMapping = mappings.find((m: Mapping) => m.target === result.targetJsonPath);
    
    if (existingMapping) {
      const confirm = window.confirm(
        'This target field is already mapped. Do you want to replace the existing mapping?'
      );
      
      if (!confirm) return;
      
      // Delete the existing mapping first
      deleteMappingMutation.mutate(existingMapping.id);
    }
    
    // Create the new mapping
    createMappingMutation.mutate(newMapping);
    
    // Select the new mapping and show details
    setSelectedMapping({
      ...newMapping,
      id: Date.now().toString() // Temporary ID until server response
    });
    setShowMappingDetails(true);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    refreshMappingsMutation.mutate('');
  };

  const handleEditMapping = (mapping: Mapping) => {
    setSelectedMapping(mapping);
    setShowMappingDetails(true);
  };

  if (entityLoading || mappingsLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!entity) {
    return <div className="p-8 text-center">Entity not found</div>;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen flex flex-col">
        <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Mapping Editor: {entity.name}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Define mappings between input and output fields
              <span className="ml-2 px-2 py-1 bg-green-700 text-white rounded-md text-xs font-bold">
                Field Mapper v2.0
              </span>
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {brokenMappings && brokenMappings.length > 0 && (
              <div className="flex items-center text-amber-600">
                <AlertCircle className="mr-2 h-5 w-5" />
                <span className="text-sm font-medium">
                  {brokenMappings.length} issues found
                </span>
              </div>
            )}
            <div className="flex items-center space-x-3">
              <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                Last edit: {lastEditTime}
              </div>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`
                  inline-flex items-center px-4 py-2 rounded-md text-sm font-medium
                  ${isRefreshing
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  }
                `}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh with AI
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Source Schema */}
          <div className="w-1/4 border-r bg-gray-50 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Input Schema
            </h2>
            <ImprovedSchemaTree
              schema={entity.inboundSchema}
              type="source"
              brokenMappings={brokenMappings}
              sampleData={entity.metadata?.sampleData}
              onDrop={handleFieldDrop}
              mappings={mappings}
            />
          </div>

          {/* Mappings Panel */}
          <div className="w-1/2 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Mappings
            </h2>
            <ImprovedMappingPanel
              mappings={mappings || []}
              selectedMapping={selectedMapping}
              onSelect={setSelectedMapping}
              onDelete={(id) => deleteMappingMutation.mutate(id)}
              onEdit={handleEditMapping}
              brokenMappings={brokenMappings}
            />
          </div>

          {/* Target Schema */}
          <div className="w-1/4 border-l bg-gray-50 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Output Schema
            </h2>
            <ImprovedSchemaTree
              schema={entity.outboundSchema}
              type="target"
              brokenMappings={brokenMappings}
              sampleData={entity.metadata?.sampleData}
              onDrop={handleFieldDrop}
              mappings={mappings}
            />
          </div>
        </div>

        {/* Mapping Details Panel */}
        {showMappingDetails && selectedMapping && (
          <MappingDetails
            mapping={selectedMapping}
            onUpdate={(updates) => 
              updateMappingMutation.mutate({ id: selectedMapping.id, updates })
            }
            onClose={() => setShowMappingDetails(false)}
          />
        )}
      </div>
    </DndProvider>
  );
};

export default ImprovedMappingEditor;