import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Download, Eye, Code as CodeIcon, FileText, FlaskConical } from 'lucide-react';
import Editor from '@monaco-editor/react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

export const CodeGenerator: React.FC = () => {
  const { id: entityId } = useParams<{ id: string }>();
  
  const [platform, setPlatform] = useState<'azure' | 'node-red' | 'both'>('azure');
  const [options, setOptions] = useState({
    includeTests: true,
    includeDocumentation: true
  });
  const [previewType, setPreviewType] = useState<string>('interfaces');
  const [previewCode, setPreviewCode] = useState<string>('');
  const [previewLanguage, setPreviewLanguage] = useState<string>('typescript');
  
  const { data: entity } = useQuery(
    ['entity', entityId],
    () => api.entities.getById(entityId!)
  );
  
  const generateMutation = useMutation(
    (data: any) => api.generation.generateEntity(data),
    {
      onSuccess: () => {
        toast.success('Code generated successfully');
        // Could implement download logic here
      },
      onError: () => {
        toast.error('Failed to generate code');
      }
    }
  );
  
  const previewMutation = useMutation(
    (data: any) => api.generation.preview(data),
    {
      onSuccess: (result) => {
        setPreviewCode(result.preview);
        setPreviewLanguage(result.language);
      },
      onError: () => {
        toast.error('Failed to preview code');
      }
    }
  );
  
  const handleGenerate = () => {
    generateMutation.mutate({
      entityId,
      platform,
      ...options
    });
  };
  
  const handlePreview = (type: string) => {
    setPreviewType(type);
    previewMutation.mutate({
      entityId,
      platform,
      codeType: type
    });
  };
  
  const previewOptions = [
    { value: 'interfaces', label: 'TypeScript Interfaces', icon: CodeIcon },
    { value: 'mapper', label: 'Mapper Class', icon: CodeIcon },
    { value: 'azure-function', label: 'Azure Function', icon: CodeIcon },
    { value: 'node-red', label: 'Node-RED Flow', icon: FlaskConical },
    { value: 'tests', label: 'Test Suite', icon: FlaskConical },
    { value: 'documentation', label: 'Documentation', icon: FileText }
  ];
  
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Generate Code: {entity?.name}
        </h1>
        <p className="mt-2 text-gray-600">
          Generate platform-specific code from your entity mappings
        </p>
      </div>
      
      <div className="grid grid-cols-3 gap-8">
        {/* Options Panel */}
        <div className="col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Generation Options</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Platform
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="azure">Azure Functions</option>
                  <option value="node-red">Node-RED</option>
                  <option value="both">Both Platforms</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.includeTests}
                    onChange={(e) => setOptions({
                      ...options,
                      includeTests: e.target.checked
                    })}
                    className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Include Tests</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.includeDocumentation}
                    onChange={(e) => setOptions({
                      ...options,
                      includeDocumentation: e.target.checked
                    })}
                    className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Include Documentation</span>
                </label>
              </div>
              
              <div className="pt-4">
                <button
                  onClick={handleGenerate}
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Generate & Download
                </button>
              </div>
            </div>
          </div>
          
          {/* Preview Options */}
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Preview Code</h2>
            
            <div className="space-y-2">
              {previewOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => handlePreview(option.value)}
                    className={`
                      w-full flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors
                      ${previewType === option.value
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50 border border-gray-200'
                      }
                    `}
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Code Preview */}
        <div className="col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Code Preview: {previewOptions.find(o => o.value === previewType)?.label}
              </h2>
              <div className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-500">
                  {previewLanguage}
                </span>
              </div>
            </div>
            
            <div className="h-[600px] border-b border-gray-200">
              {previewCode ? (
                <Editor
                  language={previewLanguage}
                  value={previewCode}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 14
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Select a preview option to see generated code
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 bg-gray-50 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {previewCode && `${previewCode.split('\n').length} lines`}
              </div>
              <button
                onClick={() => {
                  if (previewCode) {
                    navigator.clipboard.writeText(previewCode);
                    toast.success('Code copied to clipboard');
                  }
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
