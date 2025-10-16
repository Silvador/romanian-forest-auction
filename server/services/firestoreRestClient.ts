import { GoogleAuth } from 'google-auth-library';

const auth = new GoogleAuth({
  credentials: {
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: [
    'https://www.googleapis.com/auth/datastore',
    'https://www.googleapis.com/auth/cloud-platform',
  ],
});

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

async function getAccessToken(): Promise<string> {
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) {
    throw new Error('Failed to get access token');
  }
  return token.token;
}

export async function getDocument(collection: string, docId: string): Promise<any> {
  const token = await getAccessToken();
  const url = `${baseUrl}/${collection}/${docId}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Firestore REST API error: ${response.statusText}`);
  }

  const data = await response.json();
  return firestoreDocToObject(data);
}

export async function setDocument(collection: string, docId: string, data: any): Promise<void> {
  const token = await getAccessToken();
  const url = `${baseUrl}/${collection}/${docId}`;
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: objectToFirestoreDoc(data),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Firestore REST API error: ${response.statusText} - ${errorText}`);
  }
}

export async function createDocument(collection: string, data: any): Promise<string> {
  const token = await getAccessToken();
  const url = `${baseUrl}/${collection}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: objectToFirestoreDoc(data),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Firestore REST API error: ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  const name = result.name as string;
  const docId = name.split('/').pop() || '';
  return docId;
}

export async function listDocuments(collection: string): Promise<any[]> {
  const token = await getAccessToken();
  const url = `${baseUrl}/${collection}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Firestore REST API error: ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  if (!result.documents) {
    return [];
  }

  return result.documents.map((doc: any) => {
    const docId = doc.name.split('/').pop();
    return {
      id: docId,
      ...firestoreDocToObject(doc),
    };
  });
}

// Convert Firestore REST document to JavaScript object
function firestoreDocToObject(doc: any): any {
  if (!doc || !doc.fields) {
    return null;
  }

  const obj: any = {};
  for (const [key, value] of Object.entries(doc.fields)) {
    obj[key] = firestoreValueToJs(value);
  }
  return obj;
}

// Convert Firestore value to JavaScript value
function firestoreValueToJs(value: any): any {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.timestampValue !== undefined) return new Date(value.timestampValue).getTime();
  if (value.nullValue !== undefined) return null;
  if (value.arrayValue) {
    return (value.arrayValue.values || []).map(firestoreValueToJs);
  }
  if (value.mapValue) {
    const obj: any = {};
    for (const [k, v] of Object.entries(value.mapValue.fields || {})) {
      obj[k] = firestoreValueToJs(v);
    }
    return obj;
  }
  return null;
}

// Convert JavaScript object to Firestore document format
function objectToFirestoreDoc(obj: any): any {
  const fields: any = {};
  for (const [key, value] of Object.entries(obj)) {
    fields[key] = jsValueToFirestore(value);
  }
  return fields;
}

// Convert JavaScript value to Firestore value
function jsValueToFirestore(value: any): any {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }
  if (typeof value === 'string') {
    return { stringValue: value };
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return { integerValue: value.toString() };
    }
    return { doubleValue: value };
  }
  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }
  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(jsValueToFirestore),
      },
    };
  }
  if (typeof value === 'object') {
    const fields: any = {};
    for (const [k, v] of Object.entries(value)) {
      fields[k] = jsValueToFirestore(v);
    }
    return { mapValue: { fields } };
  }
  return { nullValue: null };
}
