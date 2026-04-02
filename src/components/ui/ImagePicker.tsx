import React, { useRef, useState } from 'react';

interface ImagePickerProps {
  label?: string;
  value?: File | null;
  existingAttachment?: string | null; // Add prop for existing attachment
  isEditing?: boolean;
  onChange: (value: File | null) => void;
  className?: string;
}

export const ImagePicker: React.FC<ImagePickerProps> = ({ 
  label = 'Attachment', 
  value, 
  existingAttachment,
  isEditing,
  onChange, 
  className = '' 
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      setPreview(null);
      onChange(null);
      return;
    }

    // Only allow images
    if (!file.type.startsWith('image/')) {
      setPreview(null);
      onChange(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      setPreview(result);
      onChange(file);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setPreview(null);
    onChange(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  // Get the file name to display
  const getFileName = () => {
    if (value?.name) {
      return value.name;
    }
    // When editing and no new image is chosen, show placeholder instead of existing filename
    if (!isEditing && existingAttachment) {
      // Extract filename from URL or path
      const fileName = existingAttachment.split('/').pop() || existingAttachment;
      return fileName;
    }
    return '';
  };

  // Check if we have any attachment (new file or existing)
  const hasAttachment = value || existingAttachment;

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">{label}</label>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="px-3 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50 bg-white"
        >
          Choose File
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          type="text"
          value={getFileName()}
          readOnly
          placeholder={isEditing ? 'No Image Chosen' : 'No Image Attached'}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
        />
        {hasAttachment && (
          <button
            type="button"
            onClick={clearImage}
            className="px-3 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50"
          >
            Remove
          </button>
        )}
      </div>
      {(preview || existingAttachment) && (
        <div className="mt-2">
          <img
            src={preview || existingAttachment || ''}
            alt="Selected attachment preview"
            className="max-h-32 rounded-md border border-gray-200"
          />
        </div>
      )}
    </div>
  );
};

export default ImagePicker;


