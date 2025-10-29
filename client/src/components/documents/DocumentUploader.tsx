import { useState, useRef } from 'react';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { uploadDocument, validateFile, formatFileSize } from '@/lib/storage';
import type { DocumentMetadata } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

interface DocumentUploaderProps {
  auctionId: string;
  onUploadComplete: (doc: DocumentMetadata) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: string;
  allowedTypes?: string[];
  disabled?: boolean;
}

export function DocumentUploader({
  auctionId,
  onUploadComplete,
  maxFiles = 10,
  maxSizeMB = 10,
  accept = '.pdf,.jpg,.jpeg,.png',
  allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
  disabled = false
}: DocumentUploaderProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || disabled) return;

    const fileArray = Array.from(files).slice(0, maxFiles);

    for (const file of fileArray) {
      // Validate file
      const validation = validateFile(file, maxSizeMB, allowedTypes);
      if (!validation.valid) {
        toast({
          title: 'Invalid file',
          description: `${file.name}: ${validation.error}`,
          variant: 'destructive'
        });
        continue;
      }

      // Add to uploading queue
      const fileId = `${file.name}-${Date.now()}-${Math.random()}`;
      const uploadingFile: UploadingFile = {
        id: fileId,
        file,
        progress: 0,
        status: 'uploading'
      };

      setUploadingFiles(prev => [...prev, uploadingFile]);

      // Start upload
      try {
        const metadata = await uploadDocument(
          file,
          auctionId,
          (progress) => {
            setUploadingFiles(prev =>
              prev.map(f =>
                f.id === fileId ? { ...f, progress } : f
              )
            );
          }
        );

        // Mark as completed
        setUploadingFiles(prev =>
          prev.map(f =>
            f.id === fileId ? { ...f, status: 'completed', progress: 100 } : f
          )
        );

        // Notify parent
        onUploadComplete(metadata);

        // Show success toast
        toast({
          title: 'Upload complete',
          description: `${file.name} uploaded successfully`
        });

        // Remove from queue after 2 seconds
        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
        }, 2000);
      } catch (error) {
        console.error('Upload failed:', error);

        // Mark as error
        setUploadingFiles(prev =>
          prev.map(f =>
            f.id === fileId
              ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
              : f
          )
        );

        // Show error toast
        toast({
          title: 'Upload failed',
          description: `Failed to upload ${file.name}`,
          variant: 'destructive'
        });
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const removeUploadingFile = (fileId: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
  };

  return (
    <div className="space-y-4">
      {/* Drag-and-drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer",
          isDragging && "border-primary bg-primary/5",
          !isDragging && "border-border hover:border-primary hover:bg-accent/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Upload className={cn(
          "w-12 h-12 mx-auto mb-4",
          isDragging ? "text-primary" : "text-muted-foreground"
        )} />
        <p className="text-sm font-medium mb-2">
          {isDragging ? 'Drop files here' : 'Drop files here or click to browse'}
        </p>
        <p className="text-xs text-muted-foreground">
          PDF, JPG, PNG up to {maxSizeMB}MB each (max {maxFiles} files)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* Upload progress */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-3">
          {uploadingFiles.map((uploadingFile) => (
            <div
              key={uploadingFile.id}
              className="flex items-center gap-3 p-3 bg-card border rounded-lg"
            >
              {uploadingFile.status === 'uploading' && (
                <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
              )}
              {uploadingFile.status === 'completed' && (
                <FileText className="w-4 h-4 text-primary flex-shrink-0" />
              )}
              {uploadingFile.status === 'error' && (
                <X className="w-4 h-4 text-destructive flex-shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-medium truncate">
                    {uploadingFile.file.name}
                  </p>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {formatFileSize(uploadingFile.file.size)}
                  </span>
                </div>

                {uploadingFile.status === 'uploading' && (
                  <div className="space-y-1">
                    <Progress value={uploadingFile.progress} className="h-1" />
                    <p className="text-xs text-muted-foreground">
                      {Math.round(uploadingFile.progress)}%
                    </p>
                  </div>
                )}

                {uploadingFile.status === 'completed' && (
                  <p className="text-xs text-primary">Upload complete</p>
                )}

                {uploadingFile.status === 'error' && (
                  <p className="text-xs text-destructive">
                    {uploadingFile.error || 'Upload failed'}
                  </p>
                )}
              </div>

              {uploadingFile.status === 'error' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeUploadingFile(uploadingFile.id);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
