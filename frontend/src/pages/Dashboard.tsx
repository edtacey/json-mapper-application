import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, FileJson, GitBranch, Map, Activity } from 'lucide-react';
import { api } from '../services/api';

export const Dashboard: React.FC = () => {
  const { data: entities, isLoading: entitiesLoading } = useQuery(['entities'], 
    () => api.entities.list()
  );

  const { data: health } = useQuery(['health'], 
    () => api.health.check(),
    { refetchInterval: 30000 }
  );

  const stats = {
    entities: entities?.length || 0,
    mappings: entities?.reduce((acc: number, entity: any) => acc + (entity.mappingCount || 0), 0) || 0,
    valueMappings: entities?.reduce((acc: number, entity: any) => acc + (entity.valueMappingCount || 0), 0) || 0,
    status: health?.status || 'unknown'
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Manage your JSON mappings and transformations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Entities"
          value={stats.entities}
          icon={FileJson}
          color="blue"
        />
        <StatCard
          title="Mappings"
          value={stats.mappings}
          icon={GitBranch}
          color="green"
        />
        <StatCard
          title="Value Maps"
          value={stats.valueMappings}
          icon={Map}
          color="purple"
        />
        <StatCard
          title="System Status"
          value={stats.status}
          icon={Activity}
          color={stats.status === 'ok' ? 'green' : 'red'}
        />
      </div>

      {/* Recent Entities */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Recent Entities</h2>
          <Link
            to="/entities/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Entity
          </Link>
        </div>
        
        {entitiesLoading ? (
          <div className="p-6 text-center text-gray-500">Loading...</div>
        ) : entities && entities.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {entities.slice(0, 5).map((entity: any) => (
              <EntityRow key={entity.id} entity={entity} />
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            No entities found. Create your first entity to get started.
          </div>
        )}
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.FC<{ className?: string }>;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};

interface EntityRowProps {
  entity: any;
}

const EntityRow: React.FC<EntityRowProps> = ({ entity }) => {
  return (
    <div className="px-6 py-4 hover:bg-gray-50">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to={`/entities/${entity.id}`}
            className="text-sm font-medium text-gray-900 hover:text-blue-600"
          >
            {entity.name}
          </Link>
          <p className="text-sm text-gray-500">
            Version {entity.version} • Created {new Date(entity.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Link
            to={`/entities/${entity.id}/mappings`}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Mappings ({entity.mappingCount || 0})
          </Link>
          <Link
            to={`/entities/${entity.id}/generate`}
            className="text-sm text-green-600 hover:text-green-800"
          >
            Generate Code
          </Link>
        </div>
      </div>
    </div>
  );
};
