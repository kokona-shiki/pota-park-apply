import { getOne } from '../../config/database.js';
import { checkUserPermission } from '../../utils/auth.js';
import { logPotaSync } from '../potaSyncLogService.js';
import {
  fetchAllChineseParks,
  fetchPotaParkDetail,
  getPotaReference,
  buildQueryParkFailureReason,
} from '../../api-clients/potaApiClient.js';
import { checkParkExistsByPotaId, createParkWithAudit } from './parkRepository.js';
import { identifyParkType } from './parkTypeResolver.js';
import {
  transformPotaParkToInternal,
  normalizeParksData,
  extractChineseName,
} from './parkTransformer.js';
import {
  enqueueImportTask,
  isImportQueueFull,
  getUserActiveTask,
  buildTaskResponse,
  importTaskQueue,
  importTaskRunning,
  setImportTaskRunning,
  deriveTaskStatusFromResult,
  cleanupImportTasks,
} from './potaImportTaskQueue.js';
import { setUnprocessedParks, clearUnprocessedParks } from './unprocessedParkService.js';
import type { PotaPark, UnprocessedPark, ImportResult } from './types.js';

// 定义导入任务类型
type ImportTask = {
  id: string;
  operatorId: number;
  operatorRole: string;
  operationType: string;
  status: string;
  startedAt?: string;
  finishedAt?: string;
  result?: ImportResult;
  error?: string;
};

/**
 * 导入单个 POTA 公园
 */
export const importSinglePotaPark = async (
  potaPark: PotaPark,
  operatorId: number,
  operatorRole: string,
  importTime: string,
  resolvedType: string | null = null
) => {
  const potaId = potaPark.reference;

  if (!potaId) {
    console.warn('公园数据缺少 POTA ID，跳过:', potaPark);
    return { success: false, error: '公园数据缺少POTA ID', park: potaPark };
  }

  try {
    // 检查公园是否已存在
    const existingPark = await checkParkExistsByPotaId(potaId);
    if (existingPark) {
      console.log(`公园 ${potaId} 已存在，跳过导入`);
      return { success: true, skipped: true, message: `公园 ${potaId} 已存在，跳过导入` };
    }

    // 转换数据格式
    const internalPark = await transformPotaParkToInternal(potaPark, resolvedType);

    // 创建公园并记录审核日志
    const createdPark = await createParkWithAudit(
      internalPark,
      operatorId,
      operatorRole,
      importTime
    );

    console.log(
      `成功导入公园: ${potaId} ID: ${createdPark.id} NAME: ${potaPark.name} TYPE: ${resolvedType} POTA_TYPE: ${potaPark.parktypeDesc}`
    );
    return {
      success: true,
      created: true,
      park: createdPark,
      message: `成功导入公园 ${potaId}`,
    };
  } catch (error) {
    console.error(`导入公园 ${potaId} 失败:`, error.message);
    return {
      success: false,
      error: error.message,
      park: potaPark,
      potaId,
    };
  }
};

/**
 * 处理查询公园详情失败的情况
 */
const handleParkDetailError = (
  potaId: string,
  listPark: PotaPark,
  error: unknown,
  results: ImportResult,
  unprocessedParks: UnprocessedPark[],
  parksImported: Array<{ reference: string; name: string; status: string; reason?: string; latitude?: number | null; longitude?: number | null }>
) => {
  const failureReason = (error as Error)?.message || buildQueryParkFailureReason(3, error);
  const fallbackName = extractChineseName(listPark.name) || listPark.name || potaId;
  const unprocessedPark: UnprocessedPark = {
    reference: potaId,
    name: fallbackName,
    activations: listPark.activations ?? null,
    qsos: listPark.qsos ?? null,
    failureReason,
  };
  results.needs_manual_confirmation.push(unprocessedPark);
  unprocessedParks.push(unprocessedPark);
  results.errors.push({ potaId, error: failureReason, park: listPark });
  parksImported.push({
    reference: potaId,
    name: fallbackName,
    status: 'failed',
    reason: failureReason,
    latitude: null,
    longitude: null,
  });
};

/**
 * 创建未处理的公园对象
 */
const createUnprocessedPark = (
  potaId: string,
  enrichedPark: PotaPark,
  listPark: PotaPark
): UnprocessedPark => {
  const parkName = getUnprocessedParkName(enrichedPark, listPark, potaId);
  const locationInfo = getLocationInfo(enrichedPark);
  const parkDetails = getParkDetails(enrichedPark);
  const activationInfo = getActivationInfo(listPark);

  return {
    reference: potaId,
    name: parkName,
    ...locationInfo,
    ...parkDetails,
    ...activationInfo,
    failureReason: '无法自动识别公园类型，需要手动确认',
  };
};

/**
 * 获取未处理公园的名称
 */
const getUnprocessedParkName = (
  enrichedPark: PotaPark,
  listPark: PotaPark,
  potaId: string
): string => {
  return enrichedPark.name || extractChineseName(listPark.name) || potaId;
};

/**
 * 获取位置信息
 */
const getLocationInfo = (enrichedPark: PotaPark) => {
  return {
    latitude: enrichedPark.latitude ?? null,
    longitude: enrichedPark.longitude ?? null,
    locationDesc: enrichedPark.locationDesc || '',
    grid: enrichedPark.grid6 || enrichedPark.grid4 || '',
  };
};

/**
 * 获取公园详情
 */
const getParkDetails = (enrichedPark: PotaPark) => {
  return {
    parkTypeDesc: enrichedPark.parktypeDesc || enrichedPark.parkTypeDesc || '',
    accessMethods: enrichedPark.accessMethods || '',
    activationMethods: enrichedPark.activationMethods || '',
    website: enrichedPark.website || '',
    parkComments: enrichedPark.parkComments || '',
  };
};

/**
 * 获取激活信息
 */
const getActivationInfo = (listPark: PotaPark) => {
  return {
    activations: listPark.activations ?? null,
    qsos: listPark.qsos ?? null,
  };
};

/**
 * 处理无法识别公园类型的情况
 */
const handleUnidentifiedParkType = (
  potaId: string,
  enrichedPark: PotaPark,
  listPark: PotaPark,
  results: ImportResult,
  unprocessedParks: UnprocessedPark[],
  parksImported: Array<{ reference: string; name: string; status: string; reason?: string; latitude?: number | null; longitude?: number | null }>
) => {
  const unprocessedPark = createUnprocessedPark(potaId, enrichedPark, listPark);
  results.needs_manual_confirmation.push(unprocessedPark);
  unprocessedParks.push(unprocessedPark);
  parksImported.push({
    reference: potaId,
    name: unprocessedPark.name || potaId,
    status: 'skipped',
    reason: 'Requires manual confirmation',
    latitude: enrichedPark.latitude ?? null,
    longitude: enrichedPark.longitude ?? null,
  });
};

/**
 * 添加导入结果到 parksImported 数组
 */
const addImportResult = (
  parksImported: Array<{ reference: string; name: string; status: string; reason?: string; latitude?: number | null; longitude?: number | null }>,
  potaId: string,
  enrichedPark: PotaPark,
  status: 'skipped' | 'success' | 'failed',
  reason?: string
) => {
  parksImported.push({
    reference: potaId,
    name: enrichedPark.name || potaId,
    status,
    reason,
    latitude: enrichedPark.latitude ?? null,
    longitude: enrichedPark.longitude ?? null,
  });
};

/**
 * 处理单个公园导入结果
 */
const handleParkImportResult = (
  potaId: string,
  enrichedPark: PotaPark,
  result: Awaited<ReturnType<typeof importSinglePotaPark>>,
  results: ImportResult,
  parksImported: Array<{ reference: string; name: string; status: string; reason?: string; latitude?: number | null; longitude?: number | null }>
) => {
  if (result.success) {
    if (result.skipped) {
      results.skipped++;
      addImportResult(parksImported, potaId, enrichedPark, 'skipped', 'Already exists');
    } else if (result.created) {
      results.imported++;
      addImportResult(parksImported, potaId, enrichedPark, 'success');
    }
  } else {
    results.errors.push(result);
    addImportResult(parksImported, result.potaId || potaId, enrichedPark, 'failed', result.error);
    console.error(`导入公园失败:`, result);
  }
};

/**
 * 处理单个公园的导入
 */
const processParkImport = async (
  listPark: PotaPark,
  operatorId: number,
  operatorRole: string,
  importTime: string,
  results: ImportResult,
  unprocessedParks: UnprocessedPark[],
  parksImported: Array<{ reference: string; name: string; status: string; reason?: string; latitude?: number | null; longitude?: number | null }>
) => {
  const potaId = getPotaReference(listPark);
  if (!potaId) {
    results.errors.push({ error: '公园数据缺少POTA ID', park: listPark });
    return;
  }

  if (await isParkAlreadyExists(potaId, listPark, results, parksImported)) {
    return;
  }

  const parkDetail = await fetchParkDetail(potaId, listPark, results, unprocessedParks, parksImported);
  if (!parkDetail) {
    return;
  }

  const enrichedPark = enrichParkData(parkDetail, listPark);
  const parkType = await identifyParkType(enrichedPark);

  if (!parkType) {
    handleUnidentifiedParkType(
      potaId,
      enrichedPark,
      listPark,
      results,
      unprocessedParks,
      parksImported
    );
    return;
  }

  const result = await importSinglePotaPark(
    enrichedPark,
    operatorId,
    operatorRole,
    importTime,
    parkType
  );

  handleParkImportResult(potaId, enrichedPark, result, results, parksImported);
};

/**
 * 检查公园是否已存在
 */
const isParkAlreadyExists = async (
  potaId: string,
  listPark: PotaPark,
  results: ImportResult,
  parksImported: Array<{ reference: string; name: string; status: string; reason?: string; latitude?: number | null; longitude?: number | null }>
) => {
  const existingPark = await checkParkExistsByPotaId(potaId);
  if (existingPark) {
    results.skipped++;
    parksImported.push({
      reference: potaId,
      name: listPark.name || potaId,
      status: 'skipped',
      reason: 'Already exists',
      latitude: listPark.latitude ?? null,
      longitude: listPark.longitude ?? null,
    });
    return true;
  }
  return false;
};

/**
 * 获取公园详情
 */
const fetchParkDetail = async (
  potaId: string,
  listPark: PotaPark,
  results: ImportResult,
  unprocessedParks: UnprocessedPark[],
  parksImported: Array<{ reference: string; name: string; status: string; reason?: string; latitude?: number | null; longitude?: number | null }>
) => {
  try {
    const detailResult = await fetchPotaParkDetail(potaId);
    return detailResult.data;
  } catch (error) {
    handleParkDetailError(potaId, listPark, error, results, unprocessedParks, parksImported);
    return null;
  }
};

/**
 * 丰富公园数据
 */
const enrichParkData = (parkDetail: PotaPark, listPark: PotaPark): PotaPark => {
  return {
    ...parkDetail,
    activations: listPark.activations ?? parkDetail?.activations,
    qsos: listPark.qsos ?? parkDetail?.qsos,
  };
};

/**
 * 获取操作员名称
 */
const getOperatorName = async (operatorId: number): Promise<string> => {
  if (operatorId === -1) {
    return '系统自动';
  }
  const userInfo = await getOne('SELECT callsign FROM users WHERE id = $1', [operatorId]) as { callsign: string };
  return userInfo ? userInfo.callsign : `用户ID: ${operatorId}`;
};

/**
 * 确定同步状态
 */
const determineSyncStatus = (results: ImportResult): 'success' | 'partial_success' | 'failed' => {
  if (results.errors.length > 0) {
    return results.imported > 0 ? 'partial_success' : 'failed';
  }
  return 'success';
};

/**
 * 执行 POTA 公园批量导入
 */
export const importPotaParks = async (operatorId: number, operatorRole: string) => {
  console.log(`开始执行 POTA 公园导入，操作员: ${operatorId}, 角色: ${operatorRole}`);

  const importTime = new Date().toISOString();
  const parksImported: Array<{ reference: string; name: string; status: string; reason?: string; latitude?: number | null; longitude?: number | null }> = [];

  try {
    const parksData = await fetchAndNormalizeParksData();
    const { results } = await processAllParks(
      parksData,
      operatorId,
      operatorRole,
      importTime,
      parksImported
    );

    await logImportResults(
      results,
      parksImported,
      operatorId,
      operatorRole
    );

    return results;
  } catch (error) {
    console.error('执行 POTA 公园导入失败:', error);
    throw error;
  }
};

/**
 * 获取并标准化公园数据
 */
const fetchAndNormalizeParksData = async () => {
  const rawParksData = await fetchAllChineseParks();
  const parksData = normalizeParksData(rawParksData);
  console.log(`准备导入 ${parksData.length} 个公园`);
  return parksData;
};

/**
 * 处理所有公园的导入
 */
const processAllParks = async (
  parksData: PotaPark[],
  operatorId: number,
  operatorRole: string,
  importTime: string,
  parksImported: Array<{ reference: string; name: string; status: string; reason?: string; latitude?: number | null; longitude?: number | null }>
) => {
  const results: ImportResult = {
    total: parksData.length,
    imported: 0,
    skipped: 0,
    errors: [],
    needs_manual_confirmation: [],
  };

  const unprocessedParks: UnprocessedPark[] = [];

  for (const listPark of parksData) {
    await processParkImport(
      listPark,
      operatorId,
      operatorRole,
      importTime,
      results,
      unprocessedParks,
      parksImported
    );
  }

  results.needs_manual_confirmation = unprocessedParks;
  return { results, unprocessedParks };
};

/**
 * 记录导入结果
 */
const logImportResults = async (
  results: ImportResult,
  parksImported: Array<{ reference: string; name: string; status: string; reason?: string; latitude?: number | null; longitude?: number | null }>,
  operatorId: number,
  _operatorRole: string
) => {
  const operatorName = await getOperatorName(operatorId);
  const operationType = operatorId === -1 ? 'auto' : 'manual';
  const syncStatus = determineSyncStatus(results);

  // 记录POTA同步日志
  const normalizeParkStatus = (status: string) => {
    if (status === 'skipped' || status === 'success' || status === 'failed') {
      return status;
    }

    return ['skipped', 'success', 'failed'].includes(status)
      ? (status as 'skipped' | 'success' | 'failed')
      : 'failed';
  };

  await logPotaSync(
    operatorName,
    operationType,
    parksImported.map((park) => ({
      ...park,
      status: normalizeParkStatus(park.status),
    })),
    syncStatus,
    `总计: ${results.total}, 导入: ${results.imported}, 跳过: ${results.skipped}, 错误: ${results.errors.length}`
  );

  console.log(
    `POTA 公园导入完成: 总计 ${results.total}, 导入 ${results.imported}, 跳过 ${results.skipped}, 错误 ${results.errors.length}`
  );
};

/**
 * 启动下一个导入任务
 */
const startNextImportTask = async () => {
  if (importTaskRunning || !hasPendingTasks()) {
    return;
  }

  const nextTask = importTaskQueue.find((task) => task.status === 'pending');
  if (!nextTask) {
    return;
  }

  setImportTaskRunning(true);
  nextTask.status = 'running';
  nextTask.startedAt = new Date().toISOString();

  try {
    await executeImportTask(nextTask);
  } catch (error) {
    handleImportTaskError(nextTask, error);
  } finally {
    finalizeImportTask(nextTask);
  }
};

/**
 * 检查是否有待处理的任务
 */
const hasPendingTasks = () => {
  return importTaskQueue.some((task) => task.status === 'pending');
};

/**
 * 执行导入任务
 */
const executeImportTask = async (task: ImportTask) => {
  const result = await importPotaParks(task.operatorId, task.operatorRole);
  task.result = result;
  task.status = deriveTaskStatusFromResult(result);
  await handleUnprocessedParks(result);
};

/**
 * 处理导入任务错误
 */
const handleImportTaskError = (task: ImportTask, error: unknown) => {
  task.error = (error as Error)?.message || '导入任务失败';
  task.status = 'failed';
};

/**
 * 处理未处理的公园
 */
const handleUnprocessedParks = async (result: ImportResult) => {
  if (result.needs_manual_confirmation && result.needs_manual_confirmation.length > 0) {
    await setUnprocessedParks(result.needs_manual_confirmation);
  } else {
    await clearUnprocessedParks();
  }
};

/**
 * 完成导入任务
 */
const finalizeImportTask = async (task: ImportTask) => {
  task.finishedAt = new Date().toISOString();
  setImportTaskRunning(false);
  cleanupImportTasks();
  await startNextImportTask();
};

/**
 * 自动触发 POTA 公园导入（供定时任务调用）
 */
export const autoTriggerPotaImport = async () => {
  // 对于自动导入，我们查找一个系统管理员或POTA代表作为操作员
  // 为了标识这是自动导入，我们仍将使用虚拟ID，但在备注中说明

  console.log('开始自动执行 POTA 公园导入...');

  try {
    // 使用虚拟操作员ID表示系统自动操作
    const systemOperatorId = -1; // 表示系统自动操作
    const systemOperatorRole = 'system'; // 表示系统自动操作

    if (isImportQueueFull()) {
      console.log('自动 POTA 导入任务队列已满，本次自动导入跳过');
      return {
        skipped: true,
        reason: 'queue_full',
      };
    }

    const task = enqueueImportTask({
      operatorId: systemOperatorId,
      operatorRole: systemOperatorRole,
      operationType: 'auto',
      startTaskCallback: () => {
        startNextImportTask().catch((error) => {
          console.error('启动导入任务失败:', error);
        });
      },
    });

    console.log('自动 POTA 公园导入任务已入队:', task.id);
    return {
      queued: true,
      task: buildTaskResponse(task),
    };
  } catch (error) {
    console.error('自动 POTA 公园导入失败:', error);
    // 记录错误但不抛出，避免定时任务中断
    return {
      error: error.message,
      success: false,
    };
  }
};

/**
 * 手动触发 POTA 公园导入（供 API 调用）
 */
export const manualTriggerPotaImport = async (userId: number) => {
  // 检查用户权限（必须是 POTA 代表且有导入权限）
  const hasImportPermission = await checkUserPermission(userId, 'pota_import');
  const hasSyncPermission = await checkUserPermission(userId, 'sync_to_pota');

  // 用户必须是 POTA 代表且具有导入权限或同步权限
  if (!hasImportPermission && !hasSyncPermission) {
    throw new Error('没有权限执行 POTA 公园导入');
  }

  // 获取用户信息
  const userInfo = await getOne('SELECT id, role FROM users WHERE id = $1', [userId]) as { id: number; role: string };
  if (!userInfo) {
    throw new Error('用户不存在');
  }

  const activeTask = getUserActiveTask(userId);
  if (activeTask) {
    return {
      rejected: true,
      reason: activeTask.status,
      message:
        activeTask.status === 'running'
          ? '您的 POTA 导入任务正在执行，请稍后再试'
          : '您的 POTA 导入任务正在等待执行，请稍后再试',
    };
  }

  if (isImportQueueFull()) {
    return {
      rejected: true,
      reason: 'queue_full',
      message: 'POTA 导入任务队列已满，请稍后再试',
    };
  }

  const task = enqueueImportTask({
    operatorId: userInfo.id,
    operatorRole: userInfo.role,
    operationType: 'manual',
    startTaskCallback: () => {
      startNextImportTask().catch((error) => {
        console.error('启动导入任务失败:', error);
      });
    },
  });

  return {
    task: buildTaskResponse(task),
  };
};

// 重新导出任务队列相关函数
export { getLatestImportTaskForUser, markImportTaskRead } from './potaImportTaskQueue.js';

// 重新导出未处理公园相关函数
export {
  getUnprocessedParks,
  setUnprocessedParks,
  clearUnprocessedParks,
  processUnprocessedPark,
  bulkProcessUnprocessedParks,
} from './unprocessedParkService.js';
