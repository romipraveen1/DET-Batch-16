import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { createPortal } from 'react-dom';

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selectedValues,
  onChange,
  placeholder = "Select options...",
  className = "",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  // Debug logging
  console.log('MultiSelect props:', { options, selectedValues, disabled });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      const isOutsidePortal = portalRef.current && !portalRef.current.contains(target);
      
      if (isOutsideDropdown && isOutsidePortal) {
        console.log('Click outside detected, closing dropdown');
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const position = {
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      };
      console.log('Dropdown position calculated:', position);
      console.log('Element rect:', rect);
      setDropdownPosition(position);
    }
  }, [isOpen]);

  // Update dropdown position on scroll
  useEffect(() => {
    const updatePosition = () => {
      if (isOpen && dropdownRef.current) {
        const rect = dropdownRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom,
          left: rect.left,
          width: rect.width
        });
      }
    };

    if (isOpen) {
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  const handleSelectAll = () => {
    console.log('handleSelectAll called');
    if (selectedValues.length === options.length) {
      // If all are selected, deselect all
      onChange([]);
    } else {
      // Select all
      onChange(options.map(option => option.value));
    }
  };

  const handleToggleOption = (value: string) => {
    console.log('handleToggleOption called with:', value);
    console.log('current selectedValues:', selectedValues);
    
    if (selectedValues.includes(value)) {
      const newValues = selectedValues.filter(v => v !== value);
      console.log('removing value, new values:', newValues);
      onChange(newValues);
    } else {
      const newValues = [...selectedValues, value];
      console.log('adding value, new values:', newValues);
      onChange(newValues);
    }
  };

  const handleRemoveSelected = (value: string) => {
    console.log('handleRemoveSelected called with:', value);
    const newValues = selectedValues.filter(v => v !== value);
    console.log('new values after remove:', newValues);
    onChange(newValues);
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) {
      return placeholder;
    }
    if (selectedValues.length === 1) {
      const option = options.find(opt => opt.value === selectedValues[0]);
      return option?.label || selectedValues[0];
    }
    return `${selectedValues.length} selected`;
  };

  const allSelected = selectedValues.length === options.length;
  const someSelected = selectedValues.length > 0 && selectedValues.length < options.length;

  return (
    <div className={cn("relative", className)} ref={dropdownRef} style={{ zIndex: isOpen ? 999999 : 'auto' }}>
      <div
        className={cn(
          "flex items-center justify-between w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white cursor-pointer min-h-[32px]",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "ring-2 ring-blue-500 border-blue-500"
        )}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Main dropdown clicked, disabled:', disabled);
          if (!disabled) {
            setIsOpen(!isOpen);
          }
        }}
      >
        <div className="flex flex-wrap gap-1 flex-1 min-h-6">
          {selectedValues.length === 0 ? (
            <span className="text-gray-500">{placeholder}</span>
          ) : (
            <>
              {selectedValues.slice(0, 2).map(value => {
                const option = options.find(opt => opt.value === value);
                return (
                  <span
                    key={value}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-md"
                  >
                    {option?.label || value}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveSelected(value);
                      }}
                      className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
              {selectedValues.length > 2 && (
                <span className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-md">
                  +{selectedValues.length - 2} more
                </span>
              )}
            </>
          )}
        </div>
        <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", isOpen && "rotate-180")} />
      </div>

      {isOpen && createPortal(
        <div 
          ref={portalRef}
          className="fixed bg-white border border-gray-300 rounded-md shadow-lg overflow-y-auto"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            zIndex: 999999,
            maxHeight: '800px',
            minHeight: '600px',
            height: '700px'
          }}
        >
          {/* Select All Option */}
          <div className="sticky top-0 bg-gray-50 border-b border-gray-200">
            <button
              type="button"
              className="flex items-center w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 font-medium"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Select All clicked');
                handleSelectAll();
              }}
            >
              <div className={cn(
                "w-4 h-4 border rounded mr-2 flex items-center justify-center",
                allSelected ? "bg-blue-600 border-blue-600" : "border-gray-300"
              )}>
                {allSelected && <Check className="w-3 h-3 text-white" />}
              </div>
              SELECT ALL
            </button>
          </div>

          {/* Options */}
          <div className="py-1">
            {options.map((option) => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  className="flex items-center w-full px-3 py-2 text-sm hover:bg-gray-50"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('option clicked:', option.value);
                    handleToggleOption(option.value);
                  }}
                >
                  <div className={cn(
                    "w-4 h-4 border rounded mr-2 flex items-center justify-center",
                    isSelected ? "bg-blue-600 border-blue-600" : "border-gray-300"
                  )}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};