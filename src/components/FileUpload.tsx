import { useState, useRef, useCallback } from 'react';
import { UploadCloud, FileSpreadsheet, Loader2 } from 'lucide-react';

interface FileUploadProps {
  onFileLoaded: (file: File) => void;
  loading: boolean;
  fileName: string | null;
  compact?: boolean;
}

export default function FileUpload({ onFileLoaded, loading, fileName, compact = false }: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      onFileLoaded(file);
    }
  }, [onFileLoaded]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileLoaded(file);
  }, [onFileLoaded]);

  if (compact) {
    return (
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !loading && inputRef.current?.click()}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-300 ${
          dragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleChange}
          className="hidden"
        />
        <div className="flex items-center justify-center gap-3 px-6 py-5 text-center">
          {loading ? (
            <>
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              <p className="text-slate-600 font-medium text-sm">Analysing file...</p>
            </>
          ) : (
            <>
              <UploadCloud className={`w-6 h-6 transition-colors ${dragOver ? 'text-blue-500' : 'text-slate-400'}`} />
              <div className="text-left">
                <p className="text-slate-600 font-medium text-sm">Drop file here or click to upload</p>
                <p className="text-slate-400 text-xs">CSV or Excel (.xlsx)</p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !loading && inputRef.current?.click()}
      className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 ${
        dragOver
          ? 'border-blue-500 bg-blue-50 scale-[1.01]'
          : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleChange}
        className="hidden"
      />
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        {loading ? (
          <>
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <p className="text-slate-700 font-semibold text-lg">Analysing file...</p>
            <p className="text-slate-400 text-sm mt-1">Pivoting data and generating dashboards</p>
          </>
        ) : fileName ? (
          <>
            <FileSpreadsheet className="w-12 h-12 text-emerald-500 mb-4" />
            <p className="text-slate-700 font-semibold text-lg">{fileName}</p>
            <p className="text-slate-400 text-sm mt-1">Click or drag to upload a new file</p>
          </>
        ) : (
          <>
            <UploadCloud className={`w-12 h-12 mb-4 transition-colors ${dragOver ? 'text-blue-500' : 'text-slate-400'}`} />
            <p className="text-slate-700 font-semibold text-lg">Drop your file here</p>
            <p className="text-slate-400 text-sm mt-1">CSV or Excel (.xlsx) — same schema every time</p>
          </>
        )}
      </div>
    </div>
  );
}
