import { getMany, query, transaction } from '../../config/database.js';
import type { UnprocessedPark, PotaPark } from './types.js';
import { fetchPotaParkDetail } from '../../api-clients/potaApiClient.js';
import { transformPotaParkToInternal } from './parkTransformer.js';
import { resolveParkTypeId } from './parkTypeResolver.js';
import { createParkWithAudit } from './parkRepository.js';

export const normalizeUnprocessedParks = (parks: UnprocessedPark[] = []) => {
  const uniqueParks = new Map<string, UnprocessedPark>();

  for (const park of parks) {
    if (!park?.reference) {
      continue;
    }
    uniqueParks.set(park.reference, park);
  }

  return Array.from(uniqueParks.values());
};

/**
 * 获取需要手动处理的公园列表
 */
export const getUnprocessedParks = async () => {
  const rows = await getMany(
    `
      SELECT payload
      FROM pota_unprocessed_parks
      ORDER BY created_at DESC
    `
  );

  const parks = rows.map((row) => row.payload || {});
  console.log('获取未处理公园列表，当前数量:', parks.length);
  return parks;
};

/**
 * 设置未处理的公园列表
 */
export const setUnprocessedParks = async (parks: UnprocessedPark[]) => {
  const normalizedParks = normalizeUnprocessedParks(parks);

  return transaction(async (client) => {
    await client.query('DELETE FROM pota_unprocessed_parks');

    if (normalizedParks.length === 0) {
      console.log('设置未处理公园列表，数量: 0');
      return [];
    }

    const values: unknown[] = [];
    const placeholders = normalizedParks
      .map((park, index) => {
        const baseIndex = index * 2;
        values.push(park.reference, park);
        return `($${baseIndex + 1}, $${baseIndex + 2}::jsonb)`;
      })
      .join(', ');

    await client.query(
      `
        INSERT INTO pota_unprocessed_parks (reference, payload)
        VALUES ${placeholders}
      `,
      values
    );

    console.log('设置未处理公园列表，数量:', normalizedParks.length);
    return normalizedParks;
  });
};

/**
 * 清空未处理的公园列表
 */
export const clearUnprocessedParks = async () => {
  await query('DELETE FROM pota_unprocessed_parks');
  console.log('清空未处理公园列表');
  return [];
};

/**
 * 处理单个未处理的公园
 */
export const processUnprocessedPark = async (
  parkData: UnprocessedPark,
  operatorId: number,
  operatorRole: string
) => {
  try {
    console.log(`处理未处理公园: ${parkData.reference}, 指定类型: ${parkData.manualType}`);

    const manualTypeId = await resolveParkTypeId(parkData.manualType);
    if (!manualTypeId) {
      throw new Error(`无法识别公园类型: ${parkData.manualType}`);
    }

    const parkDetail = await fetchParkDetail(parkData.reference);
    if (!parkDetail) {
      return {
        success: false,
        error: `查询 POTA 公园失败: ${parkData.reference}`,
        reference: parkData.reference,
      };
    }

    const enrichedPark = enrichParkData(parkDetail, parkData);
    const createdPark = await createAndProcessPark(
      enrichedPark,
      manualTypeId,
      operatorId,
      operatorRole
    );

    await removeUnprocessedPark(parkData.reference);

    console.log(`成功处理公园: ${parkData.reference} (ID: ${createdPark.id})`);

    return {
      success: true,
      park: createdPark,
      message: `成功处理公园 ${parkData.reference}`,
    };
  } catch (error) {
    console.error(`处理公园 ${parkData.reference} 失败:`, error.message);
    return {
      success: false,
      error: error.message,
      reference: parkData.reference,
    };
  }
};

/**
 * 获取公园详情
 */
const fetchParkDetail = async (reference: string) => {
  try {
    const detailResult = await fetchPotaParkDetail(reference || '');
    return detailResult.data;
  } catch (error) {
    console.error(`获取公园详情失败: ${reference}`, error.message);
    return null;
  }
};

/**
 * 丰富公园数据
 */
const enrichParkData = (parkDetail: PotaPark, parkData: UnprocessedPark): PotaPark => {
  return {
    ...parkDetail,
    reference: parkData.reference,
    name: parkDetail?.name || parkData.name || parkData.reference,
    activations: parkData.activations ?? parkDetail?.activations,
    qsos: parkData.qsos ?? parkDetail?.qsos,
  };
};

/**
 * 创建并处理公园
 */
const createAndProcessPark = async (
  enrichedPark: PotaPark,
  manualTypeId: string,
  operatorId: number,
  operatorRole: string
) => {
  // 使用指定的类型创建公园数据
  const internalPark = await transformPotaParkToInternal(enrichedPark, manualTypeId);
  internalPark.park_type = manualTypeId; // 使用手动指定的类型ID

  // 创建公园并记录审核日志
  return await createParkWithAudit(
    internalPark,
    operatorId,
    operatorRole,
    new Date().toISOString()
  );
};

/**
 * 移除未处理的公园
 */
const removeUnprocessedPark = async (reference: string) => {
  await query('DELETE FROM pota_unprocessed_parks WHERE reference = $1', [reference]);
};

/**
 * 批量处理未处理的公园
 */
export const bulkProcessUnprocessedParks = async (
  parksData: UnprocessedPark[],
  operatorId: number,
  operatorRole: string
) => {
  const results = [];

  for (const parkData of parksData) {
    const result = await processUnprocessedPark(parkData, operatorId, operatorRole);
    results.push(result);
  }

  return results;
};
