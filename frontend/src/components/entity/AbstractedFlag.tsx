import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Checkbox } from '../ui/Checkbox';

interface AbstractedFlagProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  tooltipText?: string;
  id?: string;
}

export const AbstractedFlag: React.FC<AbstractedFlagProps> = ({
  checked,
  onChange,
  disabled = false,
  label = 'Abstracted',
  tooltipText,
  id = 'abstracted-flag'
}) => {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <label 
        htmlFor={id} 
        className="flex items-center text-sm font-medium text-gray-700 cursor-pointer"
      >
        {label}
        <div className="group relative inline-block ml-1">
          <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600" data-testid="help-icon" />
          <div className="invisible group-hover:visible absolute left-0 bottom-full mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg whitespace-nowrap z-10">
            <div className="absolute bottom-[-6px] left-3 w-3 h-3 bg-gray-900 rotate-45"></div>
            {tooltipText || `Marks this entity as abstracted for mapping purposes.
            Abstracted entities serve as intermediate data models.`}
          </div>
        </div>
      </label>
    </div>
  );
};

interface AbstractedFlagsGroupProps {
  abstracted: boolean;
  inboundAbstracted: boolean;
  outboundAbstracted: boolean;
  onAbstractedChange: (checked: boolean) => void;
  onInboundAbstractedChange: (checked: boolean) => void;
  onOutboundAbstractedChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const AbstractedFlagsGroup: React.FC<AbstractedFlagsGroupProps> = ({
  abstracted,
  inboundAbstracted,
  outboundAbstracted,
  onAbstractedChange,
  onInboundAbstractedChange,
  onOutboundAbstractedChange,
  disabled = false
}) => {
  return (
    <div className="space-y-2 p-3 bg-gray-50 rounded-md">
      <h3 className="text-sm font-medium text-gray-700">Abstracted Model Configuration</h3>
      
      <AbstractedFlag
        id="abstracted-flag"
        checked={abstracted}
        onChange={onAbstractedChange}
        disabled={disabled}
        label="Mark as Abstracted Model"
        tooltipText="Mark this entity as an abstracted model that serves as a canonical data model."
      />
      
      <AbstractedFlag
        id="inbound-abstracted-flag"
        checked={inboundAbstracted}
        onChange={onInboundAbstractedChange}
        disabled={disabled}
        label="Inbound Schema is Abstracted"
        tooltipText="When enabled, other entities can link to this entity's inbound schema."
      />
      
      <AbstractedFlag
        id="outbound-abstracted-flag"
        checked={outboundAbstracted}
        onChange={onOutboundAbstractedChange}
        disabled={disabled}
        label="Outbound Schema is Abstracted"
        tooltipText="When enabled, other entities can link to this entity's outbound schema."
      />
    </div>
  );
};
