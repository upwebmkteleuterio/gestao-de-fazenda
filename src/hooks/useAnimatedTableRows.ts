import { useCallback, useEffect, useRef, useState } from 'react';

export const TABLE_ROW_REMOVAL_DELAY_MS = 500;
export const TABLE_ROW_EXIT_DURATION_MS = 500;

export interface AnimatedTableRow<T> {
  id: string;
  row: T;
}

interface ActiveRemoval {
  id: string;
  timer: ReturnType<typeof setTimeout>;
}

function createRows<T>(data: T[], getRowId: (row: T) => string): AnimatedTableRow<T>[] {
  const seenIds = new Set<string>();

  return data.reduce<AnimatedTableRow<T>[]>((rows, row) => {
    const id = getRowId(row);
    if (seenIds.has(id)) return rows;

    seenIds.add(id);
    rows.push({ id, row });
    return rows;
  }, []);
}

function rowsMatch<T>(left: AnimatedTableRow<T>[], right: AnimatedTableRow<T>[]) {
  return left.length === right.length && left.every((entry, index) => {
    const other = right[index];
    return other?.id === entry.id && other.row === entry.row;
  });
}

export function useAnimatedTableRows<T>(
  data: T[],
  getRowId: (row: T) => string,
  deleteIntentId: string | null,
  reduceMotion: boolean,
) {
  const [rows, setRows] = useState<AnimatedTableRow<T>[]>(() => createRows(data, getRowId));
  const previousDataRef = useRef(data);
  const activeRemovalRef = useRef<ActiveRemoval | null>(null);
  const handledDeleteIntentRef = useRef<string | null>(null);

  const clearActiveRemoval = useCallback(() => {
    const activeRemoval = activeRemovalRef.current;
    if (!activeRemoval) return;

    clearTimeout(activeRemoval.timer);
    activeRemovalRef.current = null;
  }, []);

  useEffect(() => {
    const currentRows = createRows(data, getRowId);
    const previousRows = createRows(previousDataRef.current, getRowId);
    const currentIds = new Set(currentRows.map((entry) => entry.id));
    const previousIds = new Set(previousRows.map((entry) => entry.id));
    const activeRemoval = activeRemovalRef.current;

    if (activeRemoval) {
      if (currentIds.has(activeRemoval.id)) {
        clearActiveRemoval();
        setRows((existingRows) => (rowsMatch(existingRows, currentRows) ? existingRows : currentRows));
      } else {
        setRows((existingRows) => {
          const removedRow = existingRows.find((entry) => entry.id === activeRemoval.id);
          if (!removedRow) return currentRows;

          const rowsWithoutRemoved = currentRows.filter((entry) => entry.id !== activeRemoval.id);
          const previousIndex = existingRows.findIndex((entry) => entry.id === activeRemoval.id);
          rowsWithoutRemoved.splice(Math.min(previousIndex, rowsWithoutRemoved.length), 0, removedRow);
          return rowsMatch(existingRows, rowsWithoutRemoved) ? existingRows : rowsWithoutRemoved;
        });
      }

      previousDataRef.current = data;
      return;
    }

    const requestedDeleteId = deleteIntentId && handledDeleteIntentRef.current !== deleteIntentId
      ? deleteIntentId
      : null;
    const removedRow = requestedDeleteId
      ? previousRows.find((entry) => entry.id === requestedDeleteId)
      : undefined;
    const removedIds = previousRows.filter((entry) => !currentIds.has(entry.id));
    const addedIds = currentRows.filter((entry) => !previousIds.has(entry.id));
    const isSingleRowRemoval = removedIds.length === 1 && addedIds.length === 0;

    if (removedRow && !currentIds.has(requestedDeleteId) && isSingleRowRemoval) {
      handledDeleteIntentRef.current = requestedDeleteId;
      const previousIndex = previousRows.findIndex((entry) => entry.id === requestedDeleteId);
      const rowsWithRemoved = [...currentRows];
      rowsWithRemoved.splice(Math.min(previousIndex, rowsWithRemoved.length), 0, removedRow);
      const timer = setTimeout(() => {
        if (activeRemovalRef.current?.id !== requestedDeleteId) return;

        activeRemovalRef.current = null;
        setRows((existingRows) => existingRows.filter((entry) => entry.id !== requestedDeleteId));
      }, reduceMotion ? 0 : TABLE_ROW_REMOVAL_DELAY_MS);

      activeRemovalRef.current = { id: requestedDeleteId, timer };
      setRows(rowsWithRemoved);
    } else {
      if (currentIds.has(deleteIntentId || '')) handledDeleteIntentRef.current = null;
      setRows((existingRows) => (rowsMatch(existingRows, currentRows) ? existingRows : currentRows));
    }

    previousDataRef.current = data;
  }, [clearActiveRemoval, data, deleteIntentId, getRowId, reduceMotion]);

  useEffect(() => () => clearActiveRemoval(), [clearActiveRemoval]);

  return { rows };
}
