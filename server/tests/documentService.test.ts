import test from "node:test";
import assert from "node:assert/strict";
import { DocumentService } from "../services/documentService";

class MockDocumentSnapshot {
  constructor(private readonly value: any) {}

  get exists() {
    return this.value !== undefined;
  }

  data() {
    if (this.value === undefined) return undefined;
    return { ...this.value };
  }
}

class MockDocRef {
  constructor(private readonly store: Map<string, any>, private readonly key: string) {}

  get path() {
    return this.key;
  }

  async set(data: any, options?: { merge?: boolean }) {
    if (options?.merge && this.store.has(this.key)) {
      const existing = this.store.get(this.key);
      this.store.set(this.key, { ...existing, ...data });
      return;
    }
    this.store.set(this.key, { ...data });
  }

  async update(data: any) {
    if (!this.store.has(this.key)) {
      throw new Error(`Document ${this.key} does not exist`);
    }
    const existing = this.store.get(this.key);
    this.store.set(this.key, { ...existing, ...data });
  }

  async get() {
    return new MockDocumentSnapshot(this.store.get(this.key));
  }
}

class MockCollectionRef {
  constructor(private readonly store: Map<string, any>, private readonly name: string) {}

  doc(id: string) {
    return new MockDocRef(this.store, `${this.name}/${id}`);
  }
}

class MockTransaction {
  constructor(private readonly store: Map<string, any>) {}

  async get(docRef: MockDocRef) {
    return docRef.get();
  }

  update(docRef: MockDocRef, data: any) {
    if (!this.store.has(docRef.path)) {
      throw new Error(`Document ${docRef.path} does not exist`);
    }
    const existing = this.store.get(docRef.path);
    this.store.set(docRef.path, { ...existing, ...data });
  }
}

class MockFirestore {
  private readonly store = new Map<string, any>();

  collection(name: string) {
    return new MockCollectionRef(this.store, name);
  }

  async runTransaction<T>(fn: (transaction: MockTransaction) => Promise<T>): Promise<T> {
    const transaction = new MockTransaction(this.store);
    return fn(transaction);
  }
}

test("document metadata lifecycle", async () => {
  const db = new MockFirestore();
  const service = new DocumentService(db as any, "test-bucket");

  const ownerId = "owner-123";
  const auctionId = "auction-xyz";

  const upload = await service.requestSignedUpload({
    ownerId,
    fileName: "apv.pdf",
    mimeType: "application/pdf",
    size: 1024,
    auctionId: null,
    apvDocumentId: "APV-42",
  });

  assert.ok(upload.documentId);
  assert.ok(upload.uploadUrl.includes("storage"));
  assert.equal(upload.storagePath.includes(ownerId), true);

  const persisted = await service.persistMetadata({
    documentId: upload.documentId,
    ownerId,
    auctionId: null,
    name: "apv.pdf",
    mimeType: "application/pdf",
    size: 1024,
    storagePath: upload.storagePath,
    apvDocumentId: "APV-42",
  });

  assert.equal(persisted.metadata.name, "apv.pdf");
  assert.ok(persisted.metadata.downloadUrl.includes("storage"));

  await db.collection("auctions").doc(auctionId).set({
    ownerId,
    status: "upcoming",
    documents: [],
  });

  await service.attachToAuction({
    auctionId,
    ownerId,
    metadata: persisted.metadata,
    replaceApv: true,
  });

  const auctionDoc = await db.collection("auctions").doc(auctionId).get();
  assert.ok(auctionDoc.exists);
  const auctionData = auctionDoc.data()!;
  assert.equal(Array.isArray(auctionData.documents), true);
  assert.equal(auctionData.documents.length, 1);
  assert.equal(auctionData.documents[0].id, persisted.metadata.id);

  const reassigned = await db.collection("auctionDocuments").doc(persisted.metadata.id).get();
  assert.equal(reassigned.data()!.auctionId, auctionId);

  const refreshed = await service.refreshDownloadUrl({
    auctionId,
    documentId: persisted.metadata.id,
  });

  assert.ok(refreshed.downloadUrl.includes("storage"));
  assert.ok(refreshed.expiresAt > Date.now());

  const updatedAuction = await db.collection("auctions").doc(auctionId).get();
  assert.equal(updatedAuction.data()!.documents[0].downloadUrl, refreshed.downloadUrl);

  const replacementUpload = await service.requestSignedUpload({
    ownerId,
    fileName: "apv-new.pdf",
    mimeType: "application/pdf",
    size: 2048,
    auctionId,
    apvDocumentId: "APV-42",
  });

  const replacementPersisted = await service.persistMetadata({
    documentId: replacementUpload.documentId,
    ownerId,
    auctionId,
    name: "apv-new.pdf",
    mimeType: "application/pdf",
    size: 2048,
    storagePath: replacementUpload.storagePath,
    apvDocumentId: "APV-42",
  });

  await service.attachToAuction({
    auctionId,
    ownerId,
    metadata: replacementPersisted.metadata,
    replaceApv: true,
  });

  const finalAuction = await db.collection("auctions").doc(auctionId).get();
  assert.equal(finalAuction.data()!.documents.length, 1);
  assert.equal(finalAuction.data()!.documents[0].name, "apv-new.pdf");

  const oldDoc = await db.collection("auctionDocuments").doc(persisted.metadata.id).get();
  assert.equal(oldDoc.data()!.auctionId, null);
});
