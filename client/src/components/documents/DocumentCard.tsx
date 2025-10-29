import { FileText, Download, Trash2, FileCheck, Image as ImageIcon } from 'lucide-react';
import type { DocumentMetadata } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getDocumentDownloadUrl, formatFileSize } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface DocumentCardProps {
  document: DocumentMetadata;
  onDelete?: () => void;
  showDelete?: boolean;
  compact?: boolean;
}

export function DocumentCard({
  document,
  onDelete,
  showDelete = false,
  compact = false
}: DocumentCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // Get download URL from Firebase Storage
      const url = await getDocumentDownloadUrl(document.storagePath);

      // Trigger download
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.fileName;
      a.target = '_blank';
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);

      toast({
        title: 'Download started',
        description: document.fileName
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: 'Download failed',
        description: 'Could not download the file',
        variant: 'destructive'
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const isImage = document.mimeType.startsWith('image/');
  const isPdf = document.mimeType === 'application/pdf';

  if (compact) {
    // Compact view for lists
    return (
      <div className="flex items-center gap-3 p-2 hover:bg-accent/50 rounded-md transition-colors">
        <div className="flex-shrink-0">
          {isPdf ? (
            <FileText className="w-5 h-5 text-destructive" />
          ) : isImage ? (
            <ImageIcon className="w-5 h-5 text-primary" />
          ) : (
            <FileText className="w-5 h-5 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{document.fileName}</p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(document.fileSize)}
          </p>
        </div>

        {document.isApvDocument && (
          <Badge variant="secondary" className="flex-shrink-0">
            <FileCheck className="w-3 h-3 mr-1" />
            APV
          </Badge>
        )}

        <div className="flex gap-1 flex-shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            <Download className="w-4 h-4" />
          </Button>
          {showDelete && onDelete && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Full card view
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {/* Thumbnail or icon */}
        <div className="flex-shrink-0">
          {isImage && document.thumbnailUrl ? (
            <div className="w-16 h-16 rounded overflow-hidden bg-muted">
              <img
                src={document.thumbnailUrl}
                alt={document.fileName}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
              {isPdf ? (
                <FileText className="w-8 h-8 text-destructive" />
              ) : (
                <FileText className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
          )}
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-2">
            <p className="text-sm font-medium truncate flex-1">
              {document.fileName}
            </p>
            {document.isApvDocument && (
              <Badge variant="secondary" className="flex-shrink-0">
                <FileCheck className="w-3 h-3 mr-1" />
                APV
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{formatFileSize(document.fileSize)}</span>
            <span>•</span>
            <span>{new Date(document.uploadedAt).toLocaleDateString()}</span>
            {isPdf && (
              <>
                <span>•</span>
                <span className="text-destructive font-medium">PDF</span>
              </>
            )}
            {isImage && (
              <>
                <span>•</span>
                <span className="text-primary font-medium">Image</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          {showDelete && onDelete && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
