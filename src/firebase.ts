import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  JournalInteraction,
  UserProfile,
  CollaborativeVault,
  VaultMember,
  WeeklyDigest,
} from './types';

// Initialize Firebase SDK safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// ==========================================
// Firestore Standard Error Handling Support
// ==========================================
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
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Strips all undefined properties recursively from objects before persisting to Firestore.
 * Firestore will throw an error if undefined values are passed.
 */
export function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

// Authentication Helpers
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;

  // Persist / update user profile document in owner-bound /users/{userId} path
  const userRef = doc(db, 'users', user.uid);
  const profileData: UserProfile = {
    uid: user.uid,
    displayName: user.displayName || 'Anonymous User',
    email: user.email,
    photoURL: user.photoURL,
    lastLoginAt: new Date().toISOString(),
  };

  const path = `users/${user.uid}`;
  try {
    await setDoc(userRef, sanitizeForFirestore(profileData), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
  return user;
}

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

// ==========================================
// 1. User Isolated Personal Reflections CRUD
// ==========================================

export function subscribeToUserInteractions(
  userId: string,
  onUpdate: (interactions: JournalInteraction[]) => void,
  onError?: (err: Error) => void
) {
  const path = `users/${userId}/interactions`;
  const interactionsRef = collection(db, 'users', userId, 'interactions');
  const q = query(interactionsRef, orderBy('updatedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: JournalInteraction[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as JournalInteraction);
      });
      onUpdate(list);
    },
    (error) => {
      console.error('[Firestore Personal Interactions Snapshot Error]:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveJournalInteraction(
  userId: string,
  interaction: JournalInteraction
): Promise<void> {
  if (!userId || !interaction.id) {
    throw new Error('Missing userId or interactionId for persistence.');
  }

  const path = `users/${userId}/interactions/${interaction.id}`;
  const docRef = doc(db, 'users', userId, 'interactions', interaction.id);
  const sanitized = sanitizeForFirestore(interaction);
  try {
    await setDoc(docRef, sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteJournalInteraction(
  userId: string,
  interactionId: string
): Promise<void> {
  if (!userId || !interactionId) {
    throw new Error('Missing userId or interactionId for deletion.');
  }
  const path = `users/${userId}/interactions/${interactionId}`;
  const docRef = doc(db, 'users', userId, 'interactions', interactionId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// 2. Collaborative Reflection Vaults CRUD
// ==========================================

export function subscribeToUserVaults(
  user: User,
  onUpdate: (vaults: CollaborativeVault[]) => void,
  onError?: (err: Error) => void
) {
  const userEmail = user.email ? user.email.toLowerCase() : null;
  const vaultsMap = new Map<string, CollaborativeVault>();

  const emitCombinedList = () => {
    const list = Array.from(vaultsMap.values()).sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
    onUpdate(list);
  };

  // Query 1: Vaults where user is the owner
  const ownerQueryPath = 'vaults (where ownerId == user.uid)';
  const ownerQuery = query(
    collection(db, 'vaults'),
    where('ownerId', '==', user.uid)
  );

  const unsubOwner = onSnapshot(
    ownerQuery,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'removed') {
          // If removed and not also in member query, delete
          const existing = vaultsMap.get(change.doc.id);
          if (existing && existing.ownerId === user.uid) {
            vaultsMap.delete(change.doc.id);
          }
        } else {
          vaultsMap.set(change.doc.id, {
            ...(change.doc.data() as CollaborativeVault),
            id: change.doc.id,
          });
        }
      });
      emitCombinedList();
    },
    (error) => {
      console.error('[Firestore Owner Vaults Snapshot Error]:', error);
      if (onError) onError(error);
      try {
        handleFirestoreError(error, OperationType.LIST, ownerQueryPath);
      } catch (e) {
        // Log formatted error
      }
    }
  );

  // Query 2: Vaults where user is invited as a member via email (if email present)
  let unsubMember: (() => void) | null = null;
  if (userEmail) {
    const memberQueryPath = `vaults (where memberEmails array-contains ${userEmail})`;
    const memberQuery = query(
      collection(db, 'vaults'),
      where('memberEmails', 'array-contains', userEmail)
    );

    unsubMember = onSnapshot(
      memberQuery,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'removed') {
            const existing = vaultsMap.get(change.doc.id);
            if (existing && existing.ownerId !== user.uid) {
              vaultsMap.delete(change.doc.id);
            }
          } else {
            vaultsMap.set(change.doc.id, {
              ...(change.doc.data() as CollaborativeVault),
              id: change.doc.id,
            });
          }
        });
        emitCombinedList();
      },
      (error) => {
        console.error('[Firestore Member Vaults Snapshot Error]:', error);
        if (onError) onError(error);
        try {
          handleFirestoreError(error, OperationType.LIST, memberQueryPath);
        } catch (e) {
          // Log formatted error
        }
      }
    );
  }

  return () => {
    unsubOwner();
    if (unsubMember) {
      unsubMember();
    }
  };
}

export async function createCollaborativeVault(
  user: User,
  title: string,
  description?: string,
  initialMembers: { email: string; role: 'editor' | 'viewer' }[] = []
): Promise<string> {
  const vaultId = 'vault_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const path = `vaults/${vaultId}`;
  const vaultRef = doc(db, 'vaults', vaultId);

  const ownerEmail = (user.email || '').trim().toLowerCase();
  const membersMap: Record<string, VaultMember> = {
    [user.uid]: {
      uid: user.uid,
      email: ownerEmail,
      displayName: user.displayName || 'Owner',
      role: 'owner',
      addedAt: new Date().toISOString(),
    },
  };

  const memberEmails = ownerEmail ? [ownerEmail] : [];

  initialMembers.forEach((m) => {
    const cleanEmail = m.email.trim().toLowerCase();
    if (cleanEmail && !memberEmails.includes(cleanEmail)) {
      memberEmails.push(cleanEmail);
      const memberKey = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
      membersMap[memberKey] = {
        email: cleanEmail,
        role: m.role,
        addedAt: new Date().toISOString(),
      };
    }
  });

  const newVault: CollaborativeVault = {
    id: vaultId,
    title: title.trim(),
    description: description?.trim() || 'Shared strategic retrospective & mentorship vault',
    ownerId: user.uid,
    ownerEmail,
    members: membersMap,
    memberEmails,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(vaultRef, sanitizeForFirestore(newVault));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
  return vaultId;
}

export async function updateVaultMembers(
  vaultId: string,
  members: Record<string, VaultMember>,
  memberEmails: string[]
): Promise<void> {
  const path = `vaults/${vaultId}`;
  const vaultRef = doc(db, 'vaults', vaultId);
  const normalizedEmails = memberEmails.map((e) => e.trim().toLowerCase()).filter(Boolean);

  try {
    await setDoc(
      vaultRef,
      sanitizeForFirestore({
        members,
        memberEmails: normalizedEmails,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCollaborativeVault(vaultId: string): Promise<void> {
  const path = `vaults/${vaultId}`;
  const vaultRef = doc(db, 'vaults', vaultId);
  try {
    await deleteDoc(vaultRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToVaultInteractions(
  vaultId: string,
  onUpdate: (interactions: JournalInteraction[]) => void,
  onError?: (err: Error) => void
) {
  const path = `vaults/${vaultId}/interactions`;
  const interactionsRef = collection(db, 'vaults', vaultId, 'interactions');
  const q = query(interactionsRef, orderBy('updatedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: JournalInteraction[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as JournalInteraction);
      });
      onUpdate(list);
    },
    (error) => {
      console.error('[Firestore Vault Interactions Snapshot Error]:', error);
      if (onError) onError(error);
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e) {
        // Handled
      }
    }
  );
}

export async function saveVaultInteraction(
  vaultId: string,
  interaction: JournalInteraction
): Promise<void> {
  if (!vaultId || !interaction.id) {
    throw new Error('Missing vaultId or interactionId for persistence.');
  }
  const path = `vaults/${vaultId}/interactions/${interaction.id}`;
  const docRef = doc(db, 'vaults', vaultId, 'interactions', interaction.id);
  const sanitized = sanitizeForFirestore({ ...interaction, vaultId });
  try {
    await setDoc(docRef, sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteVaultInteraction(
  vaultId: string,
  interactionId: string
): Promise<void> {
  const path = `vaults/${vaultId}/interactions/${interactionId}`;
  const docRef = doc(db, 'vaults', vaultId, 'interactions', interactionId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// 3. Weekly Synthesis Digests CRUD
// ==========================================

export function subscribeToWeeklyDigests(
  userId: string,
  onUpdate: (digests: WeeklyDigest[]) => void,
  onError?: (err: Error) => void
) {
  const path = `users/${userId}/weekly_digests`;
  const digestsRef = collection(db, 'users', userId, 'weekly_digests');
  const q = query(digestsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: WeeklyDigest[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as WeeklyDigest);
      });
      onUpdate(list);
    },
    (error) => {
      console.error('[Firestore Weekly Digest Snapshot Error]:', error);
      if (onError) onError(error);
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e) {
        // Handled
      }
    }
  );
}

export async function saveWeeklyDigest(
  userId: string,
  digest: WeeklyDigest
): Promise<void> {
  if (!userId || !digest.id) {
    throw new Error('Missing userId or digestId for weekly digest.');
  }
  const path = `users/${userId}/weekly_digests/${digest.id}`;
  const docRef = doc(db, 'users', userId, 'weekly_digests', digest.id);
  try {
    await setDoc(docRef, sanitizeForFirestore(digest), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
