import Dexie, { type Table } from 'dexie';

const DATABASE_NAME = 'farmnexus-offline';
const DATABASE_VERSION = 3;

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
  coverageStart?: string;
  coverageEnd?: string;
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

class FarmNexusOfflineDatabase extends Dexie {
  localRecords!: Table<OfflineRecord, string>;
  snapshots!: Table<OfflineSnapshot, string>;
  outbox!: Table<OutboxOperation, string>;

  constructor() {
    super(DATABASE_NAME);
    this.version(DATABASE_VERSION).stores({
      localRecords: 'key,userId,entity,entityId',
      snapshots: 'key,scope',
      outbox: 'id,userId,entity,status,createdAt',
    });
  }
}

export const offlineDb = new FarmNexusOfflineDatabase();

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

export const saveOfflineRecord = async (record: OfflineRecord): Promise<void> => {
  await offlineDb.localRecords.put(record);
};

export const saveOfflineRecords = async (records: OfflineRecord[]): Promise<void> => {
  if (records.length === 0) return;
  await offlineDb.localRecords.bulkPut(records);
};

export const listOfflineRecords = async <TData = unknown>(
  options: OfflineRecordListOptions,
): Promise<Array<OfflineRecord & { data: TData }>> => {
  const records = await offlineDb.localRecords
    .where('userId')
    .equals(options.userId)
    .toArray() as Array<OfflineRecord & { data: TData }>;
  return options.entity
    ? records.filter((record) => record.entity === options.entity)
    : records;
};

export const getOfflineRecord = async <TData = unknown>(
  key: string,
): Promise<(OfflineRecord & { data: TData }) | undefined> => (
  await offlineDb.localRecords.get(key) as (OfflineRecord & { data: TData }) | undefined
);

export const deleteOfflineRecord = async (key: string): Promise<void> => {
  await offlineDb.localRecords.delete(key);
};

export const deleteOfflineRecords = async (keys: string[]): Promise<void> => {
  if (keys.length === 0) return;
  await offlineDb.localRecords.bulkDelete(keys);
};

export const saveOfflineSnapshot = async (snapshot: OfflineSnapshot): Promise<void> => {
  await offlineDb.snapshots.put(snapshot);
};

export const getOfflineSnapshot = async <TData = unknown>(
  key: string,
): Promise<(OfflineSnapshot & { data: TData }) | undefined> => (
  await offlineDb.snapshots.get(key) as (OfflineSnapshot & { data: TData }) | undefined
);

export const replaceOfflineRecordsAndSnapshot = async (
  options: {
    userId: string;
    entity: string;
    records: OfflineRecord[];
    snapshot: OfflineSnapshot;
  },
): Promise<void> => {
  await offlineDb.transaction('rw', offlineDb.localRecords, offlineDb.snapshots, async () => {
    const existingRecords = await offlineDb.localRecords
      .where('userId')
      .equals(options.userId)
      .toArray();
    const keysToDelete = existingRecords
      .filter((record) => record.entity === options.entity)
      .map((record) => record.key);
    if (keysToDelete.length > 0) await offlineDb.localRecords.bulkDelete(keysToDelete);
    if (options.records.length > 0) await offlineDb.localRecords.bulkPut(options.records);
    await offlineDb.snapshots.put(options.snapshot);
  });
};

export const deleteOfflineSnapshot = async (key: string): Promise<void> => {
  await offlineDb.snapshots.delete(key);
};

export const enqueueOutboxOperation = async <TPayload>(
  input: OutboxOperationInput<TPayload>,
): Promise<OutboxOperation<TPayload>> => {
  const now = createOperationTimestamp();
  const operation: OutboxOperation<TPayload> = {
    id: input.id ?? createOperationId(),
    userId: input.userId,
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
  await offlineDb.outbox.put(operation);
  return operation;
};

export const saveOfflineRecordAndEnqueue = async <TPayload>(
  record: OfflineRecord,
  input: OutboxOperationInput<TPayload>,
): Promise<OutboxOperation<TPayload>> => {
  const now = createOperationTimestamp();
  const operation: OutboxOperation<TPayload> = {
    id: input.id ?? createOperationId(),
    userId: input.userId,
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

  await offlineDb.transaction(
    'rw',
    offlineDb.localRecords,
    offlineDb.outbox,
    async () => {
      await offlineDb.localRecords.put(record);
      await offlineDb.outbox.put(operation);
    },
  );

  return operation;
};

export const saveOfflineRecordsAndEnqueue = async <TPayload>(
  records: OfflineRecord[],
  inputs: Array<OutboxOperationInput<TPayload>>,
): Promise<void> => {
  if (records.length !== inputs.length) throw new Error('Registros e operações offline inconsistentes.');
  const operations = inputs.map((input) => {
    const now = createOperationTimestamp();
    return {
      id: input.id ?? createOperationId(),
      userId: input.userId,
      entity: input.entity,
      operation: input.operation,
      payload: input.payload,
      status: 'pending' as const,
      createdAt: now,
      updatedAt: now,
      retryCount: 0,
      nextRetryAt: null,
      lastError: null,
    };
  });
  await offlineDb.transaction('rw', offlineDb.localRecords, offlineDb.outbox, async () => {
    await offlineDb.localRecords.bulkPut(records);
    await offlineDb.outbox.bulkPut(operations);
  });
};

export const listOutboxOperations = async <TPayload = unknown>(
  options: OutboxListOptions = {},
): Promise<Array<OutboxOperation<TPayload>>> => {
  const operations = await offlineDb.outbox.toArray() as Array<OutboxOperation<TPayload>>;
  return operations
    .filter((operation) => (
      (!options.userId || operation.userId === options.userId)
      && (!options.entity || operation.entity === options.entity)
      && (!options.status || operation.status === options.status)
    ))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
};

const updateOutboxOperation = async (
  id: string,
  update: (operation: OutboxOperation) => OutboxOperation,
): Promise<OutboxOperation | undefined> => (
  offlineDb.transaction(
    'rw',
    offlineDb.outbox,
    async (): Promise<OutboxOperation | undefined> => {
      const current = await offlineDb.outbox.get(id);
      if (!current) return undefined;
      const updated = update(current);
      await offlineDb.outbox.put(updated);
      return updated;
    },
  )
);

export const markOutboxOperationProcessing = (
  id: string,
): Promise<OutboxOperation | undefined> => updateOutboxOperation(
  id,
  (operation) => ({
    ...operation,
    status: 'processing',
    updatedAt: new Date().toISOString(),
    lastError: null,
  }),
);

export const markOutboxOperationFailed = (
  id: string,
  error: string,
  nextRetryAt: string | null = null,
): Promise<OutboxOperation | undefined> => updateOutboxOperation(
  id,
  (operation) => ({
    ...operation,
    status: 'failed',
    updatedAt: new Date().toISOString(),
    retryCount: operation.retryCount + 1,
    nextRetryAt,
    lastError: error,
  }),
);

export const markOutboxOperationPending = (
  id: string,
): Promise<OutboxOperation | undefined> => updateOutboxOperation(
  id,
  (operation) => ({
    ...operation,
    status: 'pending',
    updatedAt: new Date().toISOString(),
  }),
);

export const deleteOutboxOperation = async (id: string): Promise<void> => {
  await offlineDb.outbox.delete(id);
};

export const OFFLINE_DATABASE = {
  name: DATABASE_NAME,
  version: DATABASE_VERSION,
  stores: STORE_NAMES,
} as const;
