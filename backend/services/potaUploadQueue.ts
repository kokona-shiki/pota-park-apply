import { query, getOne } from '../config/database.js';
import potaAuthService from './potaAuthService.js';
import {
  searchPotaPark,
  createPotaPark,
  mapChineseParkTypeToEnglish,
  type PotaCreateParkRequest,
  type PotaSearchResult,
} from '../api-clients/potaApiClient.js';

const MAX_RETRIES = parseInt(process.env.POTA_UPLOAD_MAX_RETRIES || '3', 10);

type UploadTask = {
  parkId: number;
  userId: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  retryCount: number;
  error: string | null;
  createdAt: Date;
};

const uploadQueue: UploadTask[] = [];
let isProcessing = false;
let currentTask: UploadTask | null = null;

export const getQueueLength = () => uploadQueue.filter((t) => t.status === 'pending').length;

export const isQueueProcessing = () => isProcessing;

export const getCurrentTask = () => currentTask;

export const getQueuePosition = (parkId: number): number => {
  const pending = uploadQueue.filter((t) => t.status === 'pending');
  const index = pending.findIndex((t) => t.parkId === parkId);
  return index === -1 ? 0 : index + 1;
};

export const addToUploadQueue = async (parkId: number, userId: number): Promise<void> => {
  const existingTask = uploadQueue.find(
    (t) => t.parkId === parkId && (t.status === 'pending' || t.status === 'running')
  );
  
  if (existingTask) {
    return;
  }

  const task: UploadTask = {
    parkId,
    userId,
    status: 'pending',
    retryCount: 0,
    error: null,
    createdAt: new Date(),
  };

  uploadQueue.push(task);

  await query(
    `UPDATE park_applications 
     SET status = 'pota_pending_upload', 
         upload_retry_count = 0, 
         upload_failure_reason = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [parkId]
  );

  processQueue();
};

export const removeFromQueue = async (parkId: number): Promise<boolean> => {
  const taskIndex = uploadQueue.findIndex(
    (t) => t.parkId === parkId && t.status === 'pending'
  );

  if (taskIndex === -1) {
    return false;
  }

  uploadQueue.splice(taskIndex, 1);

  await query(
    `UPDATE park_applications 
     SET status = 'approved', 
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND status = 'pota_pending_upload'`,
    [parkId]
  );

  return true;
};

export const retryUpload = async (parkId: number, userId: number): Promise<void> => {
  const park = await getOne(
    'SELECT status, upload_retry_count FROM park_applications WHERE id = $1',
    [parkId]
  ) as { status: string; upload_retry_count: number } | null;

  if (!park || park.status !== 'pota_upload_failed') {
    throw new Error('公园状态不允许重试');
  }

  await query(
    `UPDATE park_applications 
     SET status = 'pota_pending_upload', 
         upload_retry_count = 0,
         upload_failure_reason = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [parkId]
  );

  const task: UploadTask = {
    parkId,
    userId,
    status: 'pending',
    retryCount: 0,
    error: null,
    createdAt: new Date(),
  };

  uploadQueue.push(task);
  processQueue();
};

export const batchRetry = async (parkIds: number[], userId: number): Promise<void> => {
  for (const parkId of parkIds) {
    try {
      await retryUpload(parkId, userId);
    } catch (error) {
      console.error(`批量重试失败 (parkId: ${parkId}):`, error);
    }
  }
};

const processQueue = async (): Promise<void> => {
  if (isProcessing) {
    return;
  }

  const nextTask = uploadQueue.find((t) => t.status === 'pending');
  if (!nextTask) {
    return;
  }

  isProcessing = true;
  currentTask = nextTask;
  nextTask.status = 'running';

  try {
    await processTask(nextTask);
  } catch (error) {
    console.error('处理上传任务失败:', error);
  } finally {
    isProcessing = false;
    currentTask = null;
    processQueue();
  }
};

const processTask = async (task: UploadTask): Promise<void> => {
  const { parkId, userId } = task;

  try {
    await query(
      `UPDATE park_applications 
       SET status = 'pota_uploading', 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [parkId]
    );

    const park = await getOne(
      `SELECT pa.park_name, pa.park_type, pa.provinces, pa.latitude, pa.longitude, 
              pa.website, pa.description, pa.access_methods, pa.activation_methods
       FROM park_applications pa
       WHERE pa.id = $1`,
      [parkId]
    ) as {
      park_name: string;
      park_type: string;
      provinces: string[];
      latitude: number;
      longitude: number;
      website: string | null;
      description: string | null;
      access_methods: string[];
      activation_methods: string[];
    } | null;

    if (!park) {
      throw new Error('公园不存在');
    }

    const user = await getOne(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    ) as { password_hash: string } | null;

    if (!user) {
      throw new Error('用户不存在');
    }

    const idToken = await potaAuthService.getValidToken(userId, user.password_hash);

    const requestData: PotaCreateParkRequest = {
      prefix: 'CN',
      entity: 'China',
      name: park.park_name,
      parktype: mapChineseParkTypeToEnglish(park.park_type),
      locations: park.provinces,
      latitude: park.latitude.toFixed(4),
      longitude: park.longitude.toFixed(4),
      website: park.website || '',
      accessMethods: park.access_methods,
      activationMethods: park.activation_methods,
      comments: park.description || '',
      active: true,
    };

    try {
      const result = await createPotaPark(requestData, idToken);

      await query(
        `UPDATE park_applications 
         SET status = 'pota_uploaded', 
             pota_id = $1,
             pota_synced_at = CURRENT_TIMESTAMP,
             pota_synced_by = $2,
             upload_failure_reason = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [result.reference, userId, parkId]
      );

      task.status = 'completed';
      task.error = null;
    } catch (createError) {
      console.warn('创建公园失败，尝试搜索匹配:', createError);

      const searchResults = await searchPotaPark(park.park_name);
      const matched = findMatchingPark(searchResults, park.park_name);

      if (matched) {
        await query(
          `UPDATE park_applications 
           SET status = 'pota_uploaded', 
               pota_id = $1,
               pota_synced_at = CURRENT_TIMESTAMP,
               pota_synced_by = $2,
               upload_failure_reason = NULL,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [matched.value, userId, parkId]
        );

        task.status = 'completed';
        task.error = null;
      } else {
        throw createError;
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    task.retryCount++;

    if (task.retryCount < MAX_RETRIES) {
      task.status = 'pending';
      task.error = errorMessage;

      await query(
        `UPDATE park_applications 
         SET status = 'pota_pending_upload', 
             upload_retry_count = $1,
             upload_failure_reason = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [task.retryCount, errorMessage, parkId]
      );
    } else {
      task.status = 'failed';
      task.error = errorMessage;

      await query(
        `UPDATE park_applications 
         SET status = 'pota_upload_failed', 
             upload_retry_count = $1,
             upload_failure_reason = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [task.retryCount, errorMessage, parkId]
      );
    }
  }
};

const findMatchingPark = (
  results: PotaSearchResult[],
  parkName: string
): PotaSearchResult | null => {
  for (const result of results) {
    const displayName = result.display.toLowerCase();
    const name = parkName.toLowerCase();
    
    if (displayName.includes(name) || name.includes(displayName.split('  ')[1]?.split(' ')[0] || '')) {
      return result;
    }
  }
  return null;
};

export const getUploadQueueStatus = () => ({
  queueLength: getQueueLength(),
  isProcessing: isQueueProcessing(),
  currentTask: currentTask
    ? {
        parkId: currentTask.parkId,
        status: currentTask.status,
        retryCount: currentTask.retryCount,
      }
    : null,
});

export default {
  addToUploadQueue,
  removeFromQueue,
  retryUpload,
  batchRetry,
  getQueueLength,
  isQueueProcessing,
  getCurrentTask,
  getQueuePosition,
  getUploadQueueStatus,
};
