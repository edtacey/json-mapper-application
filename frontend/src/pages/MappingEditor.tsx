import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  DndContext, 
  DragEndEvent, 
  DragStartEvent, 
  DragOverEvent,
  CollisionDetection,
  closestCenter,
  pointerWithin,
  rectIntersection
} from '@dnd-kit/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

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
import { api } from '../services/api';
import { MappingList } from '../components/MappingList';
import { SchemaTree } from '../components/SchemaTree';
import { MappingDetails } from '../components/MappingDetails';

export const MappingEditor: React.FC = () => {
  const { id: entityId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [selectedMapping, setSelectedMapping] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastEditTime, setLastEditTime] = useState<string>(new Date().toLocaleTimeString());
  
  // Simple and effective collision detection that allows all target fields
  // to be valid drop targets for any source field
  const customCollisionDetection: CollisionDetection = (args) => {
    // The active item is always the one being dragged
    const { active, droppableContainers } = args;
    
    if (!active || !droppableContainers) return [];
    
    // Get standard collisions from built-in algorithms
    const pointerCollisions = pointerWithin(args);
    
    // If we have at least one collision using standard detection, use it
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }
    
    // Otherwise, find valid target containers that are close to the pointer
    const nearestTargets = closestCenter(args);
    
    // If we have any closest targets, use them
    if (nearestTargets.length > 0) {
      return nearestTargets;
    }
    
    // Extract active data (if available)
    const activeData = active.data.current;
    
    // As a last resort, identify all valid drop targets
    const validTargets = [];
    
    for (const droppable of droppableContainers) {
      const droppableData = droppable.data?.current;
      
      // ONLY consider targets (not other sources) as valid drop areas
      if (droppableData && droppableData.type === 'target') {
        validTargets.push({
          id: droppable.id,
          data: droppable.data
        });
        
        // Log when we find same-named fields 
        if (activeData?.path && droppableData.path) {
          const activeName = activeData.path.split('.').pop();
          const droppableName = droppableData.path.split('.').pop();
          
          if (activeName === droppableName) {
            console.log('Same-named field mapping:', {
              source: activeData.path, 
              target: droppableData.path
            });
          }
        }
      }
    }
    
    // Return all valid targets if we found them
    return validTargets.length > 0 ? validTargets : [];
  };

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

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    console.log('Drag started:', active.id, active.data.current);
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    // Update last edit time whenever a drag and drop operation happens
    setLastEditTime(new Date().toLocaleTimeString());
    
    if (over) { // No need to check active.id !== over.id - we allow same-name field mappings
      const sourceField = active.data.current;
      const targetField = over.data.current;
      
      if(!sourceField || !targetField) return;
      console.log('Drag and drop: Source field:', sourceField, 'Target field:', targetField);
      
      // Ensure we're dragging from source to target
      if (sourceField.type !== 'source' || targetField.type !== 'target') {
        console.log('Invalid drag operation: Must drag from source to target');
        return;
      }
      
      // Check that both fields have the expected properties
      if (sourceField.path && targetField.path) {
        // Check if any existing mapping conflicts with this new one
        const existingMapping = mappings?.find((m: Mapping) => 
          m.source === sourceField.path && m.target === targetField.path);
          
        if (existingMapping) {
          console.log('Existing mapping found:', existingMapping);
          // Allow updating if there's an existing mapping between these fields
          toast.success('Mapping already exists between these fields - updating it');
          updateMappingMutation.mutate({ 
            id: existingMapping.id, 
            updates: {
              active: true,
              transformation: 'direct'
            } 
          });
          return;
        }
        
        createMappingMutation.mutate({
          entityId,
          source: sourceField.path,
          target: targetField.path,
          transformation: 'direct',
          active: true
        });
      } else {
        console.error('Missing path in sourceField or targetField');
        toast.error('Could not create mapping: Missing field path information');
      }
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    refreshMappingsMutation.mutate('');
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
            <span className="ml-2 px-2 py-1 bg-green-700 text-white rounded-md text-xs font-bold">
              Enhanced Collision Detection v6.0 (Simplified)
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
        <DndContext 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        // Use our custom collision detection strategy that always allows same-named fields
        collisionDetection={customCollisionDetection}
        // Force every drag operation to be independent
        autoScroll={true}
        measuring={{
          droppable: {
            strategy: "always"
          }
        }}
      >
          {/* Source Schema */}
          <div className="w-1/4 border-r bg-gray-50 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Input Schema
            </h2>
            <SchemaTree
              schema={entity.inboundSchema}
              type="source"
              brokenMappings={brokenMappings}
              sampleData={entity.metadata?.sampleData}
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
              sampleData={entity.metadata?.sampleData}
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
