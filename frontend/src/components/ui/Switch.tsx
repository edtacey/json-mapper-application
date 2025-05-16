import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({ 
  checked, 
  onChange, 
  disabled = false,
  id,
  className = ''
}) => {
  return (
    <label className={`relative inline-flex items-center cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-blue-600 
        peer-focus:ring-2 peer-focus:ring-blue-300 
        after:content-[''] after:absolute after:top-0.5 after:left-0.5 
        after:bg-white after:rounded-full after:h-5 after:w-5 
        after:transition-all after:duration-300 peer-checked:after:translate-x-5"
      >
      </div>
    </label>
  );
};