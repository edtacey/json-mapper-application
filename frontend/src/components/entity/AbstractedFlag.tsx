import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Checkbox } from '../ui/Checkbox';

interface AbstractedFlagProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export const AbstractedFlag: React.FC<AbstractedFlagProps> = ({
  checked,
  onChange,
  disabled = false,
  label = 'Abstracted'
}) => {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id="abstracted-flag"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <label 
        htmlFor="abstracted-flag" 
        className="flex items-center text-sm font-medium text-gray-700 cursor-pointer"
      >
        {label}
        <div className="group relative inline-block ml-1">
          <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600" data-testid="help-icon" />
          <div className="invisible group-hover:visible absolute left-0 bottom-full mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg whitespace-nowrap z-10">
            <div className="absolute bottom-[-6px] left-3 w-3 h-3 bg-gray-900 rotate-45"></div>
            Marks this entity as abstracted for mapping purposes.
            <br />
            Abstracted entities serve as intermediate data models.
          </div>
        </div>
      </label>
    </div>
  );
};
