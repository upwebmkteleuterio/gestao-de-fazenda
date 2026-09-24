const DATABASE_NAME = 'farmnexus-offline';
const DATABASE_VERSION = 1;

const STORE_NAMES = {
  localRecords: 'localRecords',
  snapshots: 'snapshots',
  outbox: 'outbox',
} as const;

export type OfflineRecord = {
  key: string;
  entity: string;
  entityId: string;
  data: unknown;
  updatedAt: string;
};

export type OfflineSnapshot = {
  key: string;
  scope: string;
  data: unknown;
  capturedAt: string;
};

export type OutboxOperationStatus = 'pending' | 'processing' | 'failed';
export type OutboxOperationKind = 'create' | 'update' | 'delete';

export type OutboxOperation<TPayload = unknown> = {
  id: string;
  entity: string;
  operation: OutboxOperationKind;
  payload: TPayload;
  status: OutboxOperationStatus;
  createdAt: string;
  updatedAt: string;
  retryCount: number;
  nextRetryAt: string | null;
  lastError: string | null;
};

type OutboxOperationInput<TPayload> = Pick<OutboxOperation<TPayload>, 'entity' | 'operation' | 'payload'> & {
  id?: string;
};

export type OutboxListOptions = {
  status?: OutboxOperationStatus;
};

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
});

const transactionToPromise = (transaction: IDBTransaction): Promise<void> => new Promise((resolve, reject) => {
  transaction.oncomplete = () => resolve();
  transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
  transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
});

const createOperationId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const openOfflineDatabase = (): Promise<IDBDatabase> => {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available in this browser'));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAMES.localRecords)) {
        const recordsStore = database.createObjectStore(STORE_NAMES.localRecords, { keyPath: 'key' });
        recordsStore.createIndex('entity', 'entity', { unique: false });
        recordsStore.createIndex('entityId', 'entityId', { unique: false });
      }

      if (!database.objectStoreNames.contains(STORE_NAMES.snapshots)) {
        const snapshotsStore = database.createObjectStore(STORE_NAMES.snapshots, { keyPath: 'key' });
        snapshotsStore.createIndex('scope', 'scope', { unique: false });
      }

      if (!database.objectStoreNames.contains(STORE_NAMES.outbox)) {
        const outboxStore = database.createObjectStore(STORE_NAMES.outbox, { keyPath: 'id' });
        outboxStore.createIndex('status', 'status', { unique: false });
        outboxStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open IndexedDB'));
  });
};

export const saveOfflineRecord = async (record: OfflineRecord): Promise<void> => {
  const database = await openOfflineDatabase();
  const transaction = database.transaction(STORE_NAMES.localRecords, 'readwrite');
  transaction.objectStore(STORE_NAMES.localRecords).put(record);
  await transactionToPromise(transaction);
  database.close();
};

export const getOfflineRecord = async <TData = unknown>(key: string): Promise<OfflineRecord & { data: TData } | undefined> => {
  const database = await openOfflineDatabase();
  const record = await requestToPromise(database.transaction(STORE_NAMES.localRecords, 'readonly').objectStore(STORE_NAMES.localRecords).get(key)) as (OfflineRecord & { data: TData }) | undefined;
  database.close();
  return record;
};

export const deleteOfflineRecord = async (key: string): Promise<void> => {
  const database = await openOfflineDatabase();
  const transaction = database.transaction(STORE_NAMES.localRecords, 'readwrite');
  transaction.objectStore(STORE_NAMES.localRecords).delete(key);
  await transactionToPromise(transaction);
  database.close();
};

export const saveOfflineSnapshot = async (snapshot: OfflineSnapshot): Promise<void> => {
  const database = await openOfflineDatabase();
  const transaction = database.transaction(STORE_NAMES.snapshots, 'readwrite');
  transaction.objectStore(STORE_NAMES.snapshots).put(snapshot);
  await transactionToPromise(transaction);
  database.close();
};

export const getOfflineSnapshot = async <TData = unknown>(key: string): Promise<OfflineSnapshot & { data: TData } | undefined> => {
  const database = await openOfflineDatabase();
  const snapshot = await requestToPromise(database.transaction(STORE_NAMES.snapshots, 'readonly').objectStore(STORE_NAMES.snapshots).get(key)) as (OfflineSnapshot & { data: TData }) | undefined;
  database.close();
  return snapshot;
};

export const deleteOfflineSnapshot = async (key: string): Promise<void> => {
  const database = await openOfflineDatabase();
  const transaction = database.transaction(STORE_NAMES.snapshots, 'readwrite');
  transaction.objectStore(STORE_NAMES.snapshots).delete(key);
  await transactionToPromise(transaction);
  database.close();
};

export const enqueueOutboxOperation = async <TPayload>(input: OutboxOperationInput<TPayload>): Promise<OutboxOperation<TPayload>> => {
  const now = new Date().toISOString();
  const operation: OutboxOperation<TPayload> = {
    id: input.id ?? createOperationId(),
    entity: input.entity,
    operation: input.operation,
    payload: input.payload,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    retryCount: 0,
    nextRetryAt: null,
    lastError: null,
  };
  const database = await openOfflineDatabase();
  const transaction = database.transaction(STORE_NAMES.outbox, 'readwrite');
  transaction.objectStore(STORE_NAMES.outbox).put(operation);
  await transactionToPromise(transaction);
  database.close();
  return operation;
};

export const listOutboxOperations = async <TPayload = unknown>(options: OutboxListOptions = {}): Promise<Array<OutboxOperation<TPayload>>> => {
  const database = await openOfflineDatabase();
  const store = database.transaction(STORE_NAMES.outbox, 'readonly').objectStore(STORE_NAMES.outbox);
  const operations = await requestToPromise(store.getAll()) as Array<OutboxOperation<TPayload>>;
  database.close();

  return operations
    .filter((operation) => !options.status || operation.status === options.status)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
};

const updateOutboxOperation = async (
  id: string,
  update: (operation: OutboxOperation) => OutboxOperation,
): Promise<OutboxOperation | undefined> => {
  const database = await openOfflineDatabase();
  const transaction = database.transaction(STORE_NAMES.outbox, 'readwrite');
  const store = transaction.objectStore(STORE_NAMES.outbox);
  const current = await requestToPromise(store.get(id)) as OutboxOperation | undefined;

  if (!current) {
    transaction.abort();
    database.close();
    return undefined;
  }

  const updated = update(current);
  store.put(updated);
  await transactionToPromise(transaction);
  database.close();
  return updated;
};

export const markOutboxOperationProcessing = (id: string): Promise<OutboxOperation | undefined> => updateOutboxOperation(id, (operation) => ({
  ...operation,
  status: 'processing',
  updatedAt: new Date().toISOString(),
  lastError: null,
}));

export const markOutboxOperationFailed = (id: string, error: string, nextRetryAt: string | null = null): Promise<OutboxOperation | undefined> => updateOutboxOperation(id, (operation) => ({
  ...operation,
  status: 'failed',
  updatedAt: new Date().toISOString(),
  retryCount: operation.retryCount + 1,
  nextRetryAt,
  lastError: error,
}));

export const markOutboxOperationPending = (id: string): Promise<OutboxOperation | undefined> => updateOutboxOperation(id, (operation) => ({
  ...operation,
  status: 'pending',
  updatedAt: new Date().toISOString(),
}));

export const deleteOutboxOperation = async (id: string): Promise<void> => {
  const database = await openOfflineDatabase();
  const transaction = database.transaction(STORE_NAMES.outbox, 'readwrite');
  transaction.objectStore(STORE_NAMES.outbox).delete(id);
  await transactionToPromise(transaction);
  database.close();
};

export const OFFLINE_DATABASE = {
  name: DATABASE_NAME,
  version: DATABASE_VERSION,
  stores: STORE_NAMES,
} as const;
