import React, { useState, useEffect } from 'react';
import { EntitySchema, UniquenessConstraint } from '../../types';
import { apiClient } from '../../services/apiClient';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Checkbox } from '../ui/Checkbox';
import { Plus, Trash2, Shield, Key, AlertCircle } from 'lucide-react';

interface AbstractedModelManagerProps {
  entity: EntitySchema;
  onUpdate: (entity: EntitySchema) => void;
}

export const AbstractedModelManager: React.FC<AbstractedModelManagerProps> = ({ entity, onUpdate }) => {
  const [constraints, setConstraints] = useState<UniquenessConstraint[]>(
    entity.metadata?.uniquenessConstraints || []
  );
  const [newConstraint, setNewConstraint] = useState<{
    name: string;
    fields: string[];
    type: 'primary' | 'unique';
    description: string;
  }>({
    name: '',
    fields: [],
    type: 'primary',
    description: ''
  });
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; errors: string[] } | null>(null);

  useEffect(() => {
    extractFields();
  }, [entity]);

  const extractFields = () => {
    const fields: string[] = [];
    const extractFromSchema = (schema: any, prefix: string = '') => {
      if (schema.type === 'object' && schema.properties) {
        Object.keys(schema.properties).forEach(key => {
          const fullPath = prefix ? `${prefix}.${key}` : key;
          fields.push(fullPath);
          
          if (schema.properties[key].type === 'object') {
            extractFromSchema(schema.properties[key], fullPath);
          }
        });
      }
    };
    
    extractFromSchema(entity.inboundSchema);
    setAvailableFields(fields);
  };

  const handleSetAsAbstractedModel = async () => {
    if (constraints.length === 0) {
      setErrors(['At least one uniqueness constraint is required']);
      return;
    }

    setLoading(true);
    setErrors([]);

    try {
      const response = await apiClient.post(`/entities/${entity.id}/abstracted-model`, {
        constraints: constraints.map(c => ({
          name: c.name,
          fields: c.fields,
          type: c.type,
          description: c.description,
          active: c.active !== false
        }))
      });

      onUpdate(response.data);
      setValidationResult({ valid: true, errors: [] });
    } catch (error: any) {
      setErrors([error.message || 'Failed to set as abstracted model']);
    } finally {
      setLoading(false);
    }
  };

  const addConstraint = () => {
    if (!newConstraint.name || newConstraint.fields.length === 0) {
      setErrors(['Constraint name and at least one field are required']);
      return;
    }

    const constraint: UniquenessConstraint = {
      id: `temp_${Date.now()}`,
      name: newConstraint.name,
      fields: newConstraint.fields,
      type: newConstraint.type,
      description: newConstraint.description,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setConstraints([...constraints, constraint]);
    setNewConstraint({
      name: '',
      fields: [],
      type: 'unique',
      description: ''
    });
    setErrors([]);
  };

  const removeConstraint = (id: string) => {
    setConstraints(constraints.filter(c => c.id !== id));
  };

  const validateModel = async () => {
    setLoading(true);
    setErrors([]);

    try {
      const response = await apiClient.post(`/entities/${entity.id}/validate-abstracted`);
      setValidationResult(response.data);
    } catch (error: any) {
      setErrors([error.message || 'Failed to validate model']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Abstracted Model Configuration</h3>
          </div>
          {entity.isAbstractedModel && (
            <span className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full">
              Active Model
            </span>
          )}
        </div>

        {errors.length > 0 && (
          <Alert variant="error" className="mb-4">
            <ul className="list-disc pl-5">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </Alert>
        )}

        {validationResult && (
          <Alert 
            variant={validationResult.valid ? 'success' : 'warning'} 
            className="mb-4"
          >
            {validationResult.valid ? (
              <p>Model validation passed successfully!</p>
            ) : (
              <div>
                <p className="font-semibold mb-2">Validation issues:</p>
                <ul className="list-disc pl-5">
                  {validationResult.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </Alert>
        )}

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Abstracted models serve as the central data model that all inputs and outputs map to. 
            At least one uniqueness constraint must be defined.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold flex items-center">
            <Key className="h-4 w-4 mr-2" />
            Uniqueness Constraints
          </h4>

          {constraints.map((constraint) => (
            <div key={constraint.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{constraint.name}</span>
                    <span className={`px-2 py-1 text-xs rounded ${
                      constraint.type === 'primary' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {constraint.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{constraint.description}</p>
                  <div className="mt-2">
                    <span className="text-sm font-medium">Fields: </span>
                    <span className="text-sm text-gray-700">
                      {constraint.fields.join(', ')}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeConstraint(constraint.id)}
                  disabled={entity.isAbstractedModel}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {!entity.isAbstractedModel && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <h5 className="font-medium mb-3">Add New Constraint</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Constraint Name"
                  value={newConstraint.name}
                  onChange={(e) => setNewConstraint({ ...newConstraint, name: e.target.value })}
                  placeholder="e.g., primary_key"
                />
                <Select
                  label="Type"
                  value={newConstraint.type}
                  onChange={(e) => setNewConstraint({ ...newConstraint, type: e.target.value as 'primary' | 'unique' })}
                >
                  <option value="primary">Primary Key</option>
                  <option value="unique">Unique Constraint</option>
                </Select>
                <div className="md:col-span-2">
                  <Input
                    label="Description"
                    value={newConstraint.description}
                    onChange={(e) => setNewConstraint({ ...newConstraint, description: e.target.value })}
                    placeholder="Describe the purpose of this constraint"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fields
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2">
                    {availableFields.map((field) => (
                      <label key={field} className="flex items-center space-x-2">
                        <Checkbox
                          checked={newConstraint.fields.includes(field)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewConstraint({
                                ...newConstraint,
                                fields: [...newConstraint.fields, field]
                              });
                            } else {
                              setNewConstraint({
                                ...newConstraint,
                                fields: newConstraint.fields.filter(f => f !== field)
                              });
                            }
                          }}
                        />
                        <span className="text-sm">{field}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <Button
                  onClick={addConstraint}
                  disabled={!newConstraint.name || newConstraint.fields.length === 0}
                  className="w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Constraint
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          {!entity.isAbstractedModel ? (
            <Button
              onClick={handleSetAsAbstractedModel}
              disabled={loading || constraints.length === 0}
              className="flex-1 sm:flex-initial"
            >
              {loading ? 'Setting...' : 'Set as Abstracted Model'}
            </Button>
          ) : (
            <Button
              onClick={validateModel}
              disabled={loading}
              variant="secondary"
              className="flex-1 sm:flex-initial"
            >
              {loading ? 'Validating...' : 'Validate Model'}
            </Button>
          )}
        </div>
      </Card>

      {entity.isAbstractedModel && (
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <h3 className="text-lg font-semibold">Abstracted Model Information</h3>
          </div>
          <div className="space-y-3">
            <div>
              <span className="font-medium">Model Type:</span>
              <span className="ml-2">Central Data Model</span>
            </div>
            <div>
              <span className="font-medium">Constraints:</span>
              <span className="ml-2">{constraints.length} defined</span>
            </div>
            <div>
              <span className="font-medium">Status:</span>
              <span className="ml-2 text-green-600">Active</span>
            </div>
            <div className="pt-2 border-t">
              <p className="text-sm text-gray-600">
                All inbound and outbound mappings should reference this model as the central point of data transformation.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
