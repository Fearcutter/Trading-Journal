import { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImagePlus, X, Upload } from 'lucide-react';

interface ImageUploadProps {
  label?: string;
  value: string; // base64 data URL
  onChange: (value: string) => void;
}

export default function ImageUpload({ label, value, onChange }: ImageUploadProps) {
  const [focused, setFocused] = useState(false);

  const readFileAsDataURL = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      onChange(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, [onChange]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    readFileAsDataURL(file);
  }, [readFileAsDataURL]);

  // Listen on document for paste when focused
  useEffect(() => {
    if (!focused) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) readFileAsDataURL(file);
          return;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [focused, readFileAsDataURL]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
    maxFiles: 1,
    multiple: false,
    noClick: true,
  });

  const rootProps = getRootProps();

  if (value) {
    return (
      <div className="space-y-1">
        {label && <label className="block text-sm font-medium text-slate-300">{label}</label>}
        <div
          tabIndex={0}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="relative group outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
        >
          <img src={value} alt={label || 'Screenshot'} className="w-full rounded-lg border border-slate-600 max-h-48 object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 p-1.5 bg-red-600/80 hover:bg-red-600 rounded-lg text-white transition-colors"
            title="Remove screenshot"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-slate-300">{label}</label>}
      <div
        {...rootProps}
        tabIndex={0}
        onFocus={(e) => { rootProps.onFocus?.(e); setFocused(true); }}
        onBlur={(e) => { rootProps.onBlur?.(e); setFocused(false); }}
        className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg transition-colors outline-none focus:border-blue-500 focus:bg-blue-500/10 ${
          isDragActive
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-slate-600 bg-slate-800/50'
        }`}
      >
        <input {...getInputProps()} />
        <ImagePlus size={24} className="text-slate-500 mb-2" />
        <p className="text-sm text-slate-400">
          {focused ? 'Now press Ctrl+V to paste' : 'Click here, then Ctrl+V to paste'}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">or drag & drop an image</p>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); open(); }}
          className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
        >
          <Upload size={12} /> Browse files
        </button>
      </div>
    </div>
  );
}
