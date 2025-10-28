import { DocumentMetadata } from "@shared/schema";
import { apiRequest } from "./queryClient";

export interface SignedUploadRequest {
  fileName: string;
  mimeType: string;
  size: number;
  auctionId?: string | null;
  apvDocumentId?: string | null;
}

export interface SignedUploadResponse {
  documentId: string;
  uploadUrl: string;
  storagePath: string;
  requiredHeaders?: Record<string, string>;
  expiresAt: number;
}

export interface ConfirmUploadRequest {
  documentId: string;
  name: string;
  mimeType: string;
  size: number;
  storagePath: string;
  auctionId?: string | null;
  apvDocumentId?: string | null;
}

export interface ConfirmUploadResponse {
  metadata: DocumentMetadata;
}

export async function requestSignedUpload(
  payload: SignedUploadRequest
): Promise<SignedUploadResponse> {
  return apiRequest("POST", "/api/documents/upload-url", payload);
}

export async function confirmDocumentUpload(
  payload: ConfirmUploadRequest
): Promise<ConfirmUploadResponse> {
  return apiRequest("POST", "/api/documents", payload);
}

export async function getDocumentDownloadUrl(
  auctionId: string,
  documentId: string
): Promise<{ downloadUrl: string; expiresAt: number }> {
  return apiRequest(
    "GET",
    `/api/auctions/${auctionId}/documents/${documentId}/download`
  );
}
