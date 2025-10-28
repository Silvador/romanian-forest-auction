import { randomUUID } from "crypto";
import admin from "firebase-admin";
import type { DocumentMetadata } from "@shared/schema";

interface SignedUrlResult {
  url: string;
  expiresAt: number;
  headers?: Record<string, string>;
}

export interface UploadUrlOptions {
  ownerId: string;
  auctionId?: string | null;
  fileName: string;
  mimeType: string;
  size: number;
  apvDocumentId?: string | null;
}

export interface PersistMetadataOptions {
  documentId: string;
  ownerId: string;
  auctionId?: string | null;
  name: string;
  mimeType: string;
  size: number;
  storagePath: string;
  apvDocumentId?: string | null;
}

export interface AttachOptions {
  auctionId: string;
  ownerId: string;
  metadata: DocumentMetadata;
  replaceApv: boolean;
}

export interface RefreshDownloadOptions {
  auctionId: string;
  documentId: string;
}

const FALLBACK_HOST = "https://storage.local";
const SIGNED_URL_TTL = 15 * 60 * 1000; // 15 minutes

export class DocumentService {
  private bucket = this.resolveBucket();

  constructor(
    private readonly db: admin.firestore.Firestore,
    private readonly bucketName: string,
  ) {}

  private resolveBucket() {
    if (!admin.apps.length || typeof admin.storage !== "function") {
      return null;
    }

    try {
      return admin.storage().bucket(this.bucketName);
    } catch (error) {
      console.warn("DocumentService: unable to access storage bucket, falling back to mock URLs", error);
      return null;
    }
  }

  private sanitizeFileName(fileName: string): string {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  }

  private async generateSignedUpload(path: string, mimeType: string): Promise<SignedUrlResult> {
    const expiresAt = Date.now() + SIGNED_URL_TTL;

    if (this.bucket) {
      const file = this.bucket.file(path);
      const [url] = await file.getSignedUrl({
        action: "write",
        expires: expiresAt,
        contentType: mimeType,
      });
      return {
        url,
        expiresAt,
        headers: {
          "Content-Type": mimeType,
        },
      };
    }

    return {
      url: `${FALLBACK_HOST}/${encodeURIComponent(path)}?uploadToken=${randomUUID()}&expires=${expiresAt}`,
      expiresAt,
      headers: {
        "Content-Type": mimeType,
      },
    };
  }

  private async generateSignedDownload(path: string): Promise<SignedUrlResult> {
    const expiresAt = Date.now() + SIGNED_URL_TTL;

    if (this.bucket) {
      const file = this.bucket.file(path);
      const [url] = await file.getSignedUrl({
        action: "read",
        expires: expiresAt,
      });
      return { url, expiresAt };
    }

    return {
      url: `${FALLBACK_HOST}/${encodeURIComponent(path)}?downloadToken=${randomUUID()}&expires=${expiresAt}`,
      expiresAt,
    };
  }

  private async deleteObject(path: string): Promise<void> {
    if (!this.bucket) return;
    try {
      await this.bucket.file(path).delete({ ignoreNotFound: true });
    } catch (error) {
      console.warn(`Unable to delete object ${path}:`, error);
    }
  }

  async requestSignedUpload(options: UploadUrlOptions) {
    const documentId = randomUUID();
    const safeFileName = this.sanitizeFileName(options.fileName);

    const storagePath = options.auctionId
      ? `auctions/${options.auctionId}/${documentId}-${safeFileName}`
      : `owners/${options.ownerId}/pending/${documentId}-${safeFileName}`;

    const signed = await this.generateSignedUpload(storagePath, options.mimeType);

    return {
      documentId,
      storagePath,
      uploadUrl: signed.url,
      requiredHeaders: signed.headers,
      expiresAt: signed.expiresAt,
    };
  }

  async persistMetadata(options: PersistMetadataOptions) {
    const now = Date.now();
    const signed = await this.generateSignedDownload(options.storagePath);

    const metadata: DocumentMetadata = {
      id: options.documentId,
      name: options.name,
      mimeType: options.mimeType,
      size: options.size,
      storagePath: options.storagePath,
      downloadUrl: signed.url,
      ...(options.apvDocumentId ? { apvDocumentId: options.apvDocumentId } : {}),
    };

    const docRef = this.db.collection("auctionDocuments").doc(options.documentId);
    await docRef.set(
      {
        ...metadata,
        ownerId: options.ownerId,
        auctionId: options.auctionId ?? null,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true },
    );

    return { metadata, expiresAt: signed.expiresAt };
  }

  async attachToAuction({ auctionId, ownerId, metadata, replaceApv }: AttachOptions) {
    const auctionRef = this.db.collection("auctions").doc(auctionId);

    const removedDocuments: DocumentMetadata[] = await this.db.runTransaction(async (transaction) => {
      const auctionSnap = await transaction.get(auctionRef);
      if (!auctionSnap.exists) {
        throw new Error("Auction not found");
      }

      const auctionData = auctionSnap.data() as { ownerId?: string; documents?: DocumentMetadata[] };
      if (auctionData.ownerId !== ownerId) {
        const error: any = new Error("Forbidden");
        error.status = 403;
        throw error;
      }

      const existingDocuments: DocumentMetadata[] = Array.isArray(auctionData.documents)
        ? auctionData.documents
        : [];

      let updatedDocuments = existingDocuments.filter((doc) => doc.id !== metadata.id);
      const removed: DocumentMetadata[] = [];

      if (replaceApv && metadata.apvDocumentId) {
        for (const doc of updatedDocuments) {
          if (doc.apvDocumentId) {
            removed.push(doc);
          }
        }
        if (removed.length) {
          updatedDocuments = updatedDocuments.filter((doc) => !doc.apvDocumentId);
        }
      }

      updatedDocuments.push(metadata);

      transaction.update(auctionRef, {
        documents: updatedDocuments,
      });

      return removed;
    });

    if (removedDocuments.length > 0) {
      await Promise.all(
        removedDocuments.map(async (doc) => {
          await this.db.collection("auctionDocuments").doc(doc.id).update({
            auctionId: null,
            updatedAt: Date.now(),
          });
          await this.deleteObject(doc.storagePath);
        }),
      );
    }

    await this.db.collection("auctionDocuments").doc(metadata.id).set(
      {
        auctionId,
        downloadUrl: metadata.downloadUrl,
        updatedAt: Date.now(),
      },
      { merge: true },
    );
  }

  async refreshDownloadUrl({ auctionId, documentId }: RefreshDownloadOptions) {
    const docRef = this.db.collection("auctionDocuments").doc(documentId);
    const snap = await docRef.get();
    if (!snap.exists) {
      const error: any = new Error("Document not found");
      error.status = 404;
      throw error;
    }

    const data = snap.data() as any;
    if (data.auctionId && data.auctionId !== auctionId) {
      const error: any = new Error("Document does not belong to this auction");
      error.status = 403;
      throw error;
    }

    const signed = await this.generateSignedDownload(data.storagePath);

    const updatedMetadata: Partial<DocumentMetadata> = {
      downloadUrl: signed.url,
    };

    await docRef.set(
      {
        downloadUrl: signed.url,
        auctionId: data.auctionId ?? auctionId ?? null,
        updatedAt: Date.now(),
      },
      { merge: true },
    );

    if (auctionId) {
      const auctionRef = this.db.collection("auctions").doc(auctionId);
      await this.db.runTransaction(async (transaction) => {
        const auctionSnap = await transaction.get(auctionRef);
        if (!auctionSnap.exists) return;
        const auctionData = auctionSnap.data() as any;
        const existingDocuments: DocumentMetadata[] = Array.isArray(auctionData.documents)
          ? auctionData.documents
          : [];

        const nextDocuments = existingDocuments.map((doc) =>
          doc.id === documentId ? { ...doc, ...updatedMetadata } : doc,
        );

        transaction.update(auctionRef, {
          documents: nextDocuments,
        });
      });
    }

    return { downloadUrl: signed.url, expiresAt: signed.expiresAt };
  }
}
