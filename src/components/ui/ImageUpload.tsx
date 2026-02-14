import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImagePlus, X } from 'lucide-react';

interface ImageUploadProps {
  label?: string;
  value: string; // base64 data URL
  onChange: (value: string) => void;
}

export default function ImageUpload({ label, value, onChange }: ImageUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onChange(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, [onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
    maxFiles: 1,
    multiple: false,
  });

  if (value) {
    return (
      <div className="space-y-1">
        {label && <label className="block text-sm font-medium text-slate-300">{label}</label>}
        <div className="relative group">
          <img src={value} alt={label || 'Screenshot'} className="w-full rounded-lg border border-slate-600 max-h-48 object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 p-1 bg-slate-900/80 rounded-lg text-slate-300 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
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
        {...getRootProps()}
        className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-slate-600 hover:border-slate-500 bg-slate-800/50'
        }`}
      >
        <input {...getInputProps()} />
        <ImagePlus size={24} className="text-slate-500 mb-2" />
        <p className="text-sm text-slate-400">Drop image or click to upload</p>
      </div>
    </div>
  );
}
