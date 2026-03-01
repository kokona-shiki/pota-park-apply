import { query } from '../../config/database.js';
import { getParkTypeIndex } from './parkTypeResolver.js';
import type { ParkTypeIndex } from './types.js';

/**
 * 标准化字符串用于比较（转小写、去空格）
 */
const normalizeString = (str: string | null | undefined): string => {
  if (!str) return '';
  return str.toLowerCase().trim().replaceAll(/\s+/g, ' ');
};

/**
 * 比较系统公园类型和 POTA 公园类型是否一致
 * 只比较英文部分
 */
const compareParkTypes = (
  systemTypeId: string | null,
  potaParkType: string | null | undefined,
  parkTypeIndex: ParkTypeIndex
): boolean => {
  if (!systemTypeId || !potaParkType) {
    return false;
  }

  // 从 park_type_mapping.json 获取系统类型的英文名称
  const systemType = parkTypeIndex.byId.get(systemTypeId);
  if (!systemType) {
    return false;
  }

  const systemEnglishName = normalizeString(systemType.en);
  const potaEnglishName = normalizeString(potaParkType);

  return systemEnglishName === potaEnglishName;
};

/**
 * 获取公园类型不一致的公园列表
 */
export const getParkTypeMismatches = async () => {
  try {
    // 加载公园类型索引
    const parkTypeIndex = await getParkTypeIndex();

    // 查询所有有 pota_park_type 的公园
    const parks = await query(`
      SELECT 
        id,
        park_name,
        park_type,
        pota_park_type
      FROM park_applications
      WHERE pota_park_type IS NOT NULL
        AND pota_park_type != ''
        AND park_type IS NOT NULL
      ORDER BY id
    `);

    // 筛选出不一致的公园
    const mismatches = parks.rows
      .map((park) => {
        const isMatch = compareParkTypes(park.park_type, park.pota_park_type, parkTypeIndex);
        if (isMatch) {
          return null;
        }

        // 获取系统类型的英文和中文名称
        const systemType = parkTypeIndex.byId.get(park.park_type);
        const systemTypeEnglish = systemType?.en || '';
        const systemTypeChinese = systemType?.zh || '';

        return {
          id: park.id,
          park_name: park.park_name,
          system_park_type_id: park.park_type,
          system_park_type_chinese: systemTypeChinese,
          system_park_type_english: systemTypeEnglish,
          pota_park_type: park.pota_park_type,
        };
      })
      .filter((park) => park !== null);

    return mismatches;
  } catch (error) {
    console.error('获取公园类型不一致列表失败:', error);
    throw error;
  }
};

/**
 * 批量更新公园类型
 */
export const bulkUpdateParkTypes = async (
  updates: Array<{ parkId: number; newParkTypeId: string }>,
  operatorId: number,
  operatorRole: string
) => {
  if (!updates || updates.length === 0) {
    throw new Error('更新列表不能为空');
  }

  try {
    const results = [];

    for (const update of updates) {
      try {
        // 更新公园类型
        await query(
          `
          UPDATE park_applications
          SET park_type = $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `,
          [update.newParkTypeId, update.parkId]
        );

        // 记录审核日志
        await query(
          `
          INSERT INTO application_audit_logs (
            application_id, action, operator_id, operator_role,
            old_status, new_status, notes
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7
          )
        `,
          [
            update.parkId,
            'approved', // 使用 approved 动作表示类型已更新
            operatorId,
            operatorRole,
            null, // 旧状态
            null, // 新状态（状态未变）
            `批量更新公园类型对齐：将公园类型更新为 ${update.newParkTypeId}`,
          ]
        );

        results.push({
          parkId: update.parkId,
          success: true,
        });
      } catch (error) {
        console.error(`更新公园 ${update.parkId} 失败:`, error);
        results.push({
          parkId: update.parkId,
          success: false,
          error: (error as Error).message,
        });
      }
    }

    return results;
  } catch (error) {
    console.error('批量更新公园类型失败:', error);
    throw error;
  }
};
