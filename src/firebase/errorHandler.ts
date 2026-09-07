import { auth } from './config';

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
  timestamp: string;
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

let lastPermissionNotice: FirestoreErrorInfo | null = null;
const listeners = new Set<(info: FirestoreErrorInfo | null) => void>();

export function getLatestPermissionNotice() {
  return lastPermissionNotice;
}

export function subscribeToPermissionNotices(callback: (info: FirestoreErrorInfo | null) => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function clearPermissionNotice() {
  lastPermissionNotice = null;
  listeners.forEach(cb => cb(null));
}

/**
 * Gracefully logs Firestore errors without throwing fatal exceptions,
 * allowing services to utilize local storage and offline fallbacks seamlessly.
 */
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): void {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    operationType,
    path,
    timestamp: new Date().toISOString(),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map(provider => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
  };

  const isPermissionError =
    errMsg.includes('Missing or insufficient permissions') ||
    errMsg.includes('permission-denied') ||
    errMsg.includes('PERMISSION_DENIED');

  if (isPermissionError) {
    console.warn(`[Firestore Permission Notice] ${operationType.toUpperCase()} on "${path}":`, errMsg);
    lastPermissionNotice = errInfo;
    listeners.forEach(cb => cb(errInfo));
  } else {
    console.warn(`[Firestore Notice] ${operationType.toUpperCase()} on "${path}":`, errMsg);
  }
}
