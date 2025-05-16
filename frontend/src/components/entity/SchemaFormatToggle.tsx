import React from 'react';
import { Switch } from '../ui/Switch';
import { HelpCircle } from 'lucide-react';

interface SchemaFormatToggleProps {
  format: 'json' | 'yaml';
  onChange: (format: 'json' | 'yaml') => void;
  label?: string;
  disabled?: boolean;
}

export const SchemaFormatToggle: React.FC<SchemaFormatToggleProps> = ({
  format,
  onChange,
  label = 'Schema Format',
  disabled = false
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked ? 'yaml' : 'json');
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center justify-between">
        <label className="flex items-center text-sm font-medium text-gray-700">
          {label}
          <div className="group relative inline-block ml-1">
            <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            <div className="invisible group-hover:visible absolute left-0 bottom-full mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg whitespace-nowrap z-10">
              <div className="absolute bottom-[-6px] left-3 w-3 h-3 bg-gray-900 rotate-45"></div>
              Choose between JSON and YAML format for schema editing and storage.
              <br />
              YAML is more human-readable, while JSON is more compact.
            </div>
          </div>
        </label>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium text-gray-600">JSON</span>
          <Switch
            checked={format === 'yaml'}
            onChange={handleChange}
            disabled={disabled}
          />
          <span className="text-xs font-medium text-gray-600">YAML</span>
        </div>
      </div>
    </div>
  );
};