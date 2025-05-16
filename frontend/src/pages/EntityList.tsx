import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, FileJson, GitBranch, Map, Edit, Trash2, Shield, Filter } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { EntitySchema } from '../types';

export const EntityList: React.FC = () => {
  const [filterAbstracted, setFilterAbstracted] = useState<'all' | 'abstracted' | 'non-abstracted'>('all');
  
  const { data: entities, isLoading, refetch } = useQuery(['entities'], 
    () => api.entities.list()
  );

  const filteredEntities = useMemo(() => {
    if (!entities) return [];
    
    switch (filterAbstracted) {
      case 'abstracted':
        return entities.filter((entity: EntitySchema) => entity.abstracted || entity.isAbstractedModel);
      case 'non-abstracted':
        return entities.filter((entity: EntitySchema) => !entity.abstracted && !entity.isAbstractedModel);
      case 'all':
      default:
        return entities;
    }
  }, [entities, filterAbstracted]);

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete entity "${name}"?`)) {
      try {
        await api.entities.delete(id);
        toast.success('Entity deleted successfully');
        refetch();
      } catch (error) {
        toast.error('Failed to delete entity');
      }
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading entities...</div>;
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Entities</h1>
          <p className="mt-2 text-gray-600">Manage your data entity schemas</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filterAbstracted}
              onChange={(e) => setFilterAbstracted(e.target.value as any)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1"
            >
              <option value="all">All Entities</option>
              <option value="abstracted">Abstracted Only</option>
              <option value="non-abstracted">Non-abstracted Only</option>
            </select>
          </div>
          <Link
            to="/entities/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Entity
          </Link>
        </div>
      </div>

      {filteredEntities && filteredEntities.length > 0 ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Version
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEntities.map((entity: EntitySchema) => (
                <tr key={entity.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileJson className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 flex items-center">
                          {entity.name}
                          {entity.isAbstractedModel && (
                            <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full flex items-center">
                              <Shield className="h-3 w-3 mr-1" />
                              Abstracted Model
                            </span>
                          )}
                          {entity.abstracted && !entity.isAbstractedModel && (
                            <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                              Abstracted
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {entity.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {entity.description || 'No description'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      v{entity.version}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(entity.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Link
                        to={`/entities/${entity.id}`}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit Entity"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/entities/${entity.id}/mappings`}
                        className="text-green-600 hover:text-green-800"
                        title="Edit Mappings"
                      >
                        <GitBranch className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/entities/${entity.id}/value-mappings`}
                        className="text-purple-600 hover:text-purple-800"
                        title="Value Mappings"
                      >
                        <Map className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(entity.id, entity.name)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete Entity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <FileJson className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500">No {filterAbstracted !== 'all' ? filterAbstracted + ' ' : ''}entities found.</p>
          <p className="text-gray-500 mt-2">Create your first entity to get started.</p>
          <Link
            to="/entities/new"
            className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Entity
          </Link>
        </div>
      )}
    </div>
  );
};
