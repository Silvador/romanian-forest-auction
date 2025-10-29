import { ref, uploadBytesResumable, getDownloadURL, deleteObject, type UploadTask } from 'firebase/storage';
import { storage } from './firebase';
import type { DocumentMetadata } from '@shared/schema';

/**
 * Upload a document to Firebase Storage with progress tracking
 */
export async function uploadDocument(
  file: File,
  auctionId: string,
  onProgress?: (progress: number) => void
): Promise<DocumentMetadata> {
  // Generate unique document ID
  const documentId = crypto.randomUUID();

  // Sanitize filename - remove special characters
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

  // Create storage path
  const storagePath = `auctions/${auctionId}/${documentId}-${sanitizedName}`;
  const storageRef = ref(storage, storagePath);

  // Start upload with resumable upload task
  const uploadTask: UploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // Calculate and report progress
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) {
          onProgress(progress);
        }
      },
      (error) => {
        // Handle upload errors
        console.error('Upload error:', error);
        reject(error);
      },
      async () => {
        // Upload completed successfully
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          // Build document metadata
          const metadata: DocumentMetadata = {
            id: documentId,
            fileName: file.name,
            storagePath,
            fileSize: file.size,
            mimeType: file.type,
            uploadedAt: Date.now(),
            isApvDocument: false,
            thumbnailUrl: file.type.startsWith('image/') ? downloadURL : undefined
          };

          resolve(metadata);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

/**
 * Delete a document from Firebase Storage
 */
export async function deleteDocument(storagePath: string): Promise<void> {
  const storageRef = ref(storage, storagePath);
  await deleteObject(storageRef);
}

/**
 * Get download URL for a document
 */
export async function getDocumentDownloadUrl(storagePath: string): Promise<string> {
  const storageRef = ref(storage, storagePath);
  return await getDownloadURL(storageRef);
}

/**
 * Cancel an ongoing upload
 */
export function cancelUpload(uploadTask: UploadTask): void {
  uploadTask.cancel();
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Validate file before upload
 */
export function validateFile(
  file: File,
  maxSizeMB: number = 10,
  allowedTypes: string[] = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
): { valid: boolean; error?: string } {
  // Check file size
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`
    };
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
    };
  }

  return { valid: true };
}
