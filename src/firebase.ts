import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDoc, setDoc, collection, query, where, getDocs, onSnapshot, addDoc, orderBy, limit, deleteDoc } from 'firebase/firestore';

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Error handling helper
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}


export const getDocWrapped = async (docRef: any, path: string) => {
  try {
    return await getDoc(docRef);
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, path);
  }
};

export const setDocWrapped = async (docRef: any, data: any, path: string) => {
  try {
    return await setDoc(docRef, data);
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, path);
  }
};

export const getDocsWrapped = async (queryRef: any, path: string) => {
  try {
    return await getDocs(queryRef);
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, path);
  }
};

export const addDocWrapped = async (collectionRef: any, data: any, path: string) => {
  try {
    return await addDoc(collectionRef, data);
  } catch (e) {
    handleFirestoreError(e, OperationType.CREATE, path);
  }
};

export const deleteDocWrapped = async (docRef: any, path: string) => {
  try {
    return await deleteDoc(docRef);
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, path);
  }
};

export { signInWithPopup, signOut, onAuthStateChanged, doc, getDoc, setDoc, collection, query, where, getDocs, onSnapshot, addDoc, signInAnonymously, orderBy, limit, deleteDoc };
