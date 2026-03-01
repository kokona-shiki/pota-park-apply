import type { ImportTask, ImportResult } from './types.js';

export const IMPORT_TASK_QUEUE_MAX = 5;

export const importTaskQueue: ImportTask[] = [];
export let importTaskRunning = false;
export let importTaskSequence = 1;

export const setImportTaskRunning = (value: boolean) => {
  importTaskRunning = value;
};

export const incrementTaskSequence = () => {
  importTaskSequence++;
};

const getActiveImportTasks = () =>
  importTaskQueue.filter((task) => task.status === 'pending' || task.status === 'running');

export const isImportQueueFull = () => getActiveImportTasks().length >= IMPORT_TASK_QUEUE_MAX;

const getPendingQueuePosition = (taskId: string) => {
  const pending = importTaskQueue.filter((task) => task.status === 'pending');
  const index = pending.findIndex((task) => task.id === taskId);
  return index === -1 ? 0 : index + 1;
};

const formatTaskResultSummary = (result: ImportResult | null) => {
  if (!result) {
    return null;
  }
  return {
    total: result.total ?? 0,
    imported: result.imported ?? 0,
    skipped: result.skipped ?? 0,
    errors: result.errors?.length ?? 0,
    needsManual: result.needs_manual_confirmation?.length ?? 0,
  };
};

export const buildTaskResponse = (task: ImportTask) => ({
  id: task.id,
  status: task.status,
  operationType: task.operationType,
  createdAt: task.createdAt,
  startedAt: task.startedAt,
  finishedAt: task.finishedAt,
  queuePosition: task.status === 'pending' ? getPendingQueuePosition(task.id) : 0,
  result: formatTaskResultSummary(task.result),
  error: task.error,
  readAt: task.readAt,
});

export const deriveTaskStatusFromResult = (result: ImportResult | null) => {
  if (!result) {
    return 'failed';
  }
  if (result.errors && result.errors.length > 0) {
    return result.imported > 0 ? 'partial_success' : 'failed';
  }
  return 'success';
};

export const cleanupImportTasks = () => {
  const maxKeep = 50;
  if (importTaskQueue.length <= maxKeep) {
    return;
  }
  const activeTasks = importTaskQueue.filter(
    (task) => task.status === 'pending' || task.status === 'running'
  );
  const completedTasks = importTaskQueue.filter(
    (task) => task.status !== 'pending' && task.status !== 'running'
  );
  const remainingSlots = Math.max(0, maxKeep - activeTasks.length);
  const keepCompleted = completedTasks.slice(-remainingSlots);
  importTaskQueue.splice(0, importTaskQueue.length, ...activeTasks, ...keepCompleted);
};

export const enqueueImportTask = ({
  operatorId,
  operatorRole,
  operationType,
  startTaskCallback,
}: {
  operatorId: number;
  operatorRole: string;
  operationType: 'manual' | 'auto';
  startTaskCallback?: () => void;
}) => {
  const task: ImportTask = {
    id: `pota-import-${importTaskSequence++}`,
    operatorId,
    operatorRole,
    operationType,
    status: 'pending',
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
    result: null,
    error: null,
    readAt: null,
  };

  importTaskQueue.push(task);
  if (startTaskCallback) {
    startTaskCallback();
  }
  return task;
};

export const getUserActiveTask = (userId: number) =>
  importTaskQueue.find(
    (task) => task.operatorId === userId && (task.status === 'pending' || task.status === 'running')
  );

export const getLatestImportTaskForUser = async (userId: number) => {
  const userTasks = importTaskQueue.filter(
    (task) => task.operatorId === userId && task.operationType === 'manual'
  );
  if (userTasks.length === 0) {
    return null;
  }
  const latestTask = userTasks.at(-1);
  if (!latestTask) {
    return null;
  }
  return buildTaskResponse(latestTask);
};

export const markImportTaskRead = async (userId: number, taskId: string) => {
  const task = importTaskQueue.find(
    (item) => item.id === taskId && item.operatorId === userId && item.operationType === 'manual'
  );
  if (!task) {
    return null;
  }
  task.readAt = new Date().toISOString();
  return buildTaskResponse(task);
};
