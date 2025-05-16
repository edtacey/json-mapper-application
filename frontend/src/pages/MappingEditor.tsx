import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { MappingList } from '../components/MappingList';
import { SchemaTree } from '../components/SchemaTree';
import { MappingDetails } from '../components/MappingDetails';

export const MappingEditor: React.FC = () => {
  const { id: entityId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [selectedMapping, setSelectedMapping] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: entity, isLoading: entityLoading } = useQuery(
    ['entity', entityId],
    () => api.entities.getById(entityId!),
    { enabled: !!entityId }
  );

  const { data: mappings, isLoading: mappingsLoading } = useQuery(
    ['mappings', entityId],
    () => api.mappings.getByEntityId(entityId!),
    { enabled: !!entityId }
  );

  const { data: brokenMappings } = useQuery(
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
      },
      onError: () => {
        toast.error('Failed to refresh mappings');
        setIsRefreshing(false);
      }
    }
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const sourceField = active.data.current;
      const targetField = over.data.current;
      
      createMappingMutation.mutate({
        entityId,
        source: sourceField.path,
        target: targetField.path,
        transformation: 'direct',
        active: true
      });
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    refreshMappingsMutation.mutate();
  };

  if (entityLoading || mappingsLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!entity) {
    return <div className="p-8 text-center">Entity not found</div>;
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Mapping Editor: {entity.name}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Define mappings between input and output fields
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

      <div className="flex-1 flex">
        <DndContext onDragEnd={handleDragEnd}>
          {/* Source Schema */}
          <div className="w-1/4 border-r bg-gray-50 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Input Schema
            </h2>
            <SchemaTree
              schema={entity.inboundSchema}
              type="source"
              brokenMappings={brokenMappings}
            />
          </div>

          {/* Mappings */}
          <div className="w-1/2 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Mappings
            </h2>
            <MappingList
              mappings={mappings || []}
              selectedMapping={selectedMapping}
              onSelect={setSelectedMapping}
              onDelete={(id) => deleteMappingMutation.mutate(id)}
              brokenMappings={brokenMappings}
            />
          </div>

          {/* Target Schema */}
          <div className="w-1/4 border-l bg-gray-50 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Output Schema
            </h2>
            <SchemaTree
              schema={entity.outboundSchema}
              type="target"
              brokenMappings={brokenMappings}
            />
          </div>
        </DndContext>
      </div>

      {/* Mapping Details Panel */}
      {selectedMapping && (
        <MappingDetails
          mapping={selectedMapping}
          onUpdate={(updates) => 
            updateMappingMutation.mutate({ id: selectedMapping.id, updates })
          }
          onClose={() => setSelectedMapping(null)}
        />
      )}
    </div>
  );
};
