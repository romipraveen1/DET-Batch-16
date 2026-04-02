import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { createPortal } from 'react-dom';

interface SearchableMultiSelectOption {
  value: string;
  label: string;
}

interface SearchableMultiSelectProps {
  options: SearchableMultiSelectOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const SearchableMultiSelect: React.FC<SearchableMultiSelectProps> = ({
  options,
  selectedValues,
  onChange,
  placeholder = "Select options...",
  className = "",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      const isOutsidePortal = portalRef.current && !portalRef.current.contains(target);
      
      if (isOutsideDropdown && isOutsidePortal) {
        setIsOpen(false);
        setSearchTerm("");
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
      setDropdownPosition({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
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

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Filter options based on search term
  const filteredOptions = options.filter(option => {
    const searchLower = searchTerm.toLowerCase();
    const labelLower = option.label.toLowerCase();
    return labelLower.includes(searchLower);
  });

  const handleSelectAll = () => {
    if (selectedValues.length === filteredOptions.length) {
      // If all filtered options are selected, deselect all
      onChange([]);
    } else {
      // Select all filtered options
      const newValues = [...new Set([...selectedValues, ...filteredOptions.map(opt => opt.value)])];
      onChange(newValues);
    }
  };

  const handleToggleOption = (value: string) => {
    if (selectedValues.includes(value)) {
      const newValues = selectedValues.filter(v => v !== value);
      onChange(newValues);
    } else {
      const newValues = [...selectedValues, value];
      onChange(newValues);
    }
  };

  const handleRemoveSelected = (value: string) => {
    const newValues = selectedValues.filter(v => v !== value);
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

  const allSelected = selectedValues.length === filteredOptions.length && filteredOptions.length > 0;
  const someSelected = selectedValues.length > 0 && selectedValues.length < filteredOptions.length;

     return (
     <div className={cn("relative", className)} ref={dropdownRef} style={{ zIndex: isOpen ? 999999 : 'auto' }}>
      <div
        className={cn(
          "flex items-center justify-between w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white cursor-pointer min-h-[32px]",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "ring-2 ring-blue-500 border-blue-500"
        )}
        onClick={() => {
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
           className="fixed bg-white border border-gray-300 rounded-md shadow-lg z-[999999] max-h-80 overflow-hidden"
           style={{
             top: dropdownPosition.top,
             left: dropdownPosition.left,
             width: dropdownPosition.width,
             zIndex: 999999
           }}
           ref={portalRef}
         >
           {/* Search Input */}
           <div className="p-2 border-b border-gray-200">
             <div className="relative">
               <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
               <input
                 ref={searchInputRef}
                 type="text"
                 placeholder="Search..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                 onClick={(e) => e.stopPropagation()}
               />
             </div>
             {searchTerm && (
               <div className="text-xs text-gray-500 mt-1">
                 {filteredOptions.length} result{filteredOptions.length !== 1 ? 's' : ''} found
               </div>
             )}
           </div>

           {/* Select All Option */}
           {filteredOptions.length > 0 && (
             <div className="border-b border-gray-200">
               <button
                 type="button"
                 className="flex items-center w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 font-medium"
                 onClick={(e) => {
                   e.preventDefault();
                   e.stopPropagation();
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
           )}

           {/* Options */}
           <div className="max-h-60 overflow-y-auto">
             {filteredOptions.length === 0 ? (
               <div className="px-3 py-2 text-sm text-gray-500">No options found</div>
             ) : (
               filteredOptions.map((option) => {
                 const isSelected = selectedValues.includes(option.value);
                 return (
                   <button
                     key={option.value}
                     type="button"
                     className="flex items-center w-full px-3 py-2 text-sm hover:bg-gray-50 text-left"
                     onClick={(e) => {
                       e.preventDefault();
                       e.stopPropagation();
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
               })
             )}
           </div>
         </div>,
         document.body
       )}
    </div>
  );
}; 