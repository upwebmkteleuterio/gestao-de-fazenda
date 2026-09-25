const DATABASE_NAME = 'farmnexus-offline';
const DATABASE_VERSION = 2;

const STORE_NAMES = {
  localRecords: 'localRecords',
  snapshots: 'snapshots',
  outbox: 'outbox',
} as const;

export type OfflineRecord = {
  key: string;
  userId: string;
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
  userId: string;
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

type OutboxOperationInput<TPayload> = Pick<OutboxOperation<TPayload>, 'userId' | 'entity' | 'operation' | 'payload'> & { id?: string };

export type OfflineRecordListOptions = { userId: string; entity?: string };
export type OutboxListOptions = { userId?: string; entity?: string; status?: OutboxOperationStatus };

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
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

let lastOperationTimestamp = 0;
const createOperationTimestamp = (): string => {
  const timestamp = Math.max(Date.now(), lastOperationTimestamp + 1);
  lastOperationTimestamp = timestamp;
  return new Date(timestamp).toISOString();
};

export const openOfflineDatabase = (): Promise<IDBDatabase> => {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB is not available in this browser'));

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAMES.localRecords)) {
        const recordsStore = database.createObjectStore(STORE_NAMES.localRecords, { keyPath: 'key' });
        recordsStore.createIndex('entity', 'entity', { unique: false });
        recordsStore.createIndex('entityId', 'entityId', { unique: false });
        recordsStore.createIndex('userId', 'userId', { unique: false });
      } else if (!request.transaction?.objectStore(STORE_NAMES.localRecords).indexNames.contains('userId')) {
        request.transaction?.objectStore(STORE_NAMES.localRecords).createIndex('userId', 'userId', { unique: false });
      }
      if (!database.objectStoreNames.contains(STORE_NAMES.snapshots)) {
        const snapshotsStore = database.createObjectStore(STORE_NAMES.snapshots, { keyPath: 'key' });
        snapshotsStore.createIndex('scope', 'scope', { unique: false });
      }
      if (!database.objectStoreNames.contains(STORE_NAMES.outbox)) {
        const outboxStore = database.createObjectStore(STORE_NAMES.outbox, { keyPath: 'id' });
        outboxStore.createIndex('status', 'status', { unique: false });
        outboxStore.createIndex('createdAt', 'createdAt', { unique: false });
        outboxStore.createIndex('userId', 'userId', { unique: false });
        outboxStore.createIndex('entity', 'entity', { unique: false });
      } else {
        const outboxStore = request.transaction!.objectStore(STORE_NAMES.outbox);
        if (!outboxStore.indexNames.contains('userId')) outboxStore.createIndex('userId', 'userId', { unique: false });
        if (!outboxStore.indexNames.contains('entity')) outboxStore.createIndex('entity', 'entity', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open IndexedDB'));
    request.onblocked = () => reject(new Error('IndexedDB está bloqueado por outra conexão'));
  });
};

export const saveOfflineRecord = async (record: OfflineRecord): Promise<void> => {
  const database = await openOfflineDatabase();
  const transaction = database.transaction(STORE_NAMES.localRecords, 'readwrite');
  transaction.objectStore(STORE_NAMES.localRecords).put(record);
  await transactionToPromise(transaction);
  database.close();
};

export const saveOfflineRecords = async (records: OfflineRecord[]): Promise<void> => {
  if (records.length === 0) return;
  const database = await openOfflineDatabase();
  const transaction = database.transaction(STORE_NAMES.localRecords, 'readwrite');
  const store = transaction.objectStore(STORE_NAMES.localRecords);
  records.forEach((record) => store.put(record));
  await transactionToPromise(transaction);
  database.close();
};

export const listOfflineRecords = async <TData = unknown>(options: OfflineRecordListOptions): Promise<Array<OfflineRecord & { data: TData }>> => {
  const database = await openOfflineDatabase();
  const records = await requestToPromise(database.transaction(STORE_NAMES.localRecords, 'readonly').objectStore(STORE_NAMES.localRecords).getAll()) as Array<OfflineRecord & { data: TData }>;
  database.close();
  return records.filter((record) => record.userId === options.userId && (!options.entity || record.entity === options.entity));
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

export const deleteOfflineRecords = async (keys: string[]): Promise<void> => {
  if (keys.length === 0) return;
  const database = await openOfflineDatabase();
  const transaction = database.transaction(STORE_NAMES.localRecords, 'readwrite');
  const store = transaction.objectStore(STORE_NAMES.localRecords);
  keys.forEach((key) => store.delete(key));
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
  const now = createOperationTimestamp();
  const operation: OutboxOperation<TPayload> = {
    id: input.id ?? createOperationId(), userId: input.userId, entity: input.entity, operation: input.operation, payload: input.payload,
    status: 'pending', createdAt: now, updatedAt: now, retryCount: 0, nextRetryAt: null, lastError: null,
  };
  const database = await openOfflineDatabase();
  const transaction = database.transaction(STORE_NAMES.outbox, 'readwrite');
  transaction.objectStore(STORE_NAMES.outbox).put(operation);
  await transactionToPromise(transaction);
  database.close();
  return operation;
};

export const saveOfflineRecordAndEnqueue = async <TPayload>(
  record: OfflineRecord,
  input: OutboxOperationInput<TPayload>,
): Promise<OutboxOperation<TPayload>> => {
  const now = createOperationTimestamp();
  const operation: OutboxOperation<TPayload> = {
    id: input.id ?? createOperationId(), userId: input.userId, entity: input.entity, operation: input.operation, payload: input.payload,
    status: 'pending', createdAt: now, updatedAt: now, retryCount: 0, nextRetryAt: null, lastError: null,
  };
  const database = await openOfflineDatabase();
  try {
    const transaction = database.transaction([STORE_NAMES.localRecords, STORE_NAMES.outbox], 'readwrite');
    const completion = transactionToPromise(transaction);
    transaction.objectStore(STORE_NAMES.localRecords).put(record);
    transaction.objectStore(STORE_NAMES.outbox).put(operation);
    await completion;
    return operation;
  } finally {
    database.close();
  }
};

export const listOutboxOperations = async <TPayload = unknown>(options: OutboxListOptions = {}): Promise<Array<OutboxOperation<TPayload>>> => {
  const database = await openOfflineDatabase();
  const store = database.transaction(STORE_NAMES.outbox, 'readonly').objectStore(STORE_NAMES.outbox);
  const operations = await requestToPromise(store.getAll()) as Array<OutboxOperation<TPayload>>;
  database.close();
  return operations
    .filter((operation) => (!options.userId || operation.userId === options.userId) && (!options.entity || operation.entity === options.entity) && (!options.status || operation.status === options.status))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
};

const updateOutboxOperation = async (id: string, update: (operation: OutboxOperation) => OutboxOperation): Promise<OutboxOperation | undefined> => {
  const database = await openOfflineDatabase();
  try {
    const transaction = database.transaction(STORE_NAMES.outbox, 'readwrite');
    const completion = transactionToPromise(transaction);
    const store = transaction.objectStore(STORE_NAMES.outbox);
    const current = await requestToPromise(store.get(id)) as OutboxOperation | undefined;
    if (!current) {
      await completion;
      return undefined;
    }
    const updated = update(current);
    store.put(updated);
    await completion;
    return updated;
  } finally {
    database.close();
  }
};

export const markOutboxOperationProcessing = (id: string): Promise<OutboxOperation | undefined> => updateOutboxOperation(id, (operation) => ({ ...operation, status: 'processing', updatedAt: new Date().toISOString(), lastError: null }));
export const markOutboxOperationFailed = (id: string, error: string, nextRetryAt: string | null = null): Promise<OutboxOperation | undefined> => updateOutboxOperation(id, (operation) => ({ ...operation, status: 'failed', updatedAt: new Date().toISOString(), retryCount: operation.retryCount + 1, nextRetryAt, lastError: error }));
export const markOutboxOperationPending = (id: string): Promise<OutboxOperation | undefined> => updateOutboxOperation(id, (operation) => ({ ...operation, status: 'pending', updatedAt: new Date().toISOString() }));

export const deleteOutboxOperation = async (id: string): Promise<void> => {
  const database = await openOfflineDatabase();
  const transaction = database.transaction(STORE_NAMES.outbox, 'readwrite');
  transaction.objectStore(STORE_NAMES.outbox).delete(id);
  await transactionToPromise(transaction);
  database.close();
};

export const OFFLINE_DATABASE = { name: DATABASE_NAME, version: DATABASE_VERSION, stores: STORE_NAMES } as const;
