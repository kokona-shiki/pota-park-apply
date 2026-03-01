import { getOne, transaction } from '../../config/database.js';
import type { InternalPark } from './types.js';

/**
 * 根据 POTA ID 检查公园是否已存在于系统中
 */
export const checkParkExistsByPotaId = async (potaId: string) => {
  // 定义公园查询结果类型
  type ParkQueryResult = {
    id: number;
    park_name: string;
    pota_id: string | null;
    pota_notes: string | null;
  };

  // 优先使用 pota_id 字段检查公园是否已存在
  const existingParkByPotaId = await getOne(
    'SELECT id, park_name, pota_id, pota_notes FROM park_applications WHERE pota_id = $1',
    [potaId]
  ) as ParkQueryResult;

  if (existingParkByPotaId) {
    console.warn(`公园 ${potaId} 已存在于系统中，ID: ${existingParkByPotaId.id}`);
    return existingParkByPotaId;
  }

  // 作为 fallback，检查 pota_notes 字段中是否包含 POTA ID
  const existingParkByNotes = await getOne(
    'SELECT id, park_name, pota_id, pota_notes FROM park_applications WHERE pota_notes LIKE $1',
    [`%POTA ID: ${potaId}%`]
  ) as ParkQueryResult;

  if (existingParkByNotes) {
    console.warn(
      `公园 ${potaId} 已存在于系统中（通过 pota_notes 匹配），ID: ${existingParkByNotes.id}`
    );
    return existingParkByNotes;
  }

  // 也可以尝试通过 park_name 检查，以防之前的导入没有正确存储 POTA ID
  const nameMatch = await getOne(
    'SELECT id, park_name, pota_id, pota_notes FROM park_applications WHERE park_name = $1',
    [potaId]
  ) as ParkQueryResult;

  return nameMatch;
};

/**
 * 创建公园申请并记录审核日志
 */
export const createParkWithAudit = async (
  parkData: InternalPark,
  operatorId: number,
  operatorRole: string,
  importTime: string
) => {
  return await transaction(async (client) => {
    // 插入公园申请
    const insertQuery = `
      INSERT INTO park_applications (
        park_name, park_type, provinces, location, latitude, longitude,
        website, description, access_methods, activation_methods,
        applicant_id, status, pota_synced_at, pota_synced_by, pota_notes,
        confirmed_authenticity, pota_park_type, pota_id
      ) VALUES (
        $1, $2, $3, ST_GeomFromText($4, 4326), $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18
      )
      RETURNING *
    `;

    const locationWKT = `POINT(${parkData.longitude} ${parkData.latitude})`;

    // 确定 pota_notes 的值：只存储失败或跳过的原因
    let potaNotes = null;

    // 如果 parkData 中包含导入失败或跳过的原因，则存储
    if (parkData.importStatus === 'failed' || parkData.importStatus === 'skipped') {
      potaNotes = `${parkData.importStatus === 'failed' ? '失败' : '跳过'}原因: ${
        parkData.importReason || '未知'
      }`;
    }

    const newApplication = await client.query(insertQuery, [
      parkData.park_name,
      parkData.park_type,
      parkData.provinces,
      locationWKT,
      parkData.latitude,
      parkData.longitude,
      parkData.website,
      parkData.description,
      parkData.access_methods,
      parkData.activation_methods,
      // 使用系统用户ID作为申请人（对于导入的公园）
      // 或者使用执行导入的用户ID
      operatorId, // 导入操作员作为申请人
      'pota_synced', // 直接设置为已同步POTA状态
      importTime, // 导入时间即为POTA同步时间
      operatorId, // 操作员ID
      potaNotes, // 只存储失败或跳过的原因
      parkData.confirmed_authenticity,
      parkData.pota_park_type || null, // POTA 公园类型
      parkData.pota_ref || null, // 直接存储 POTA ID 到独立字段
    ]);

    // 记录审核日志
    await client.query(
      `
      INSERT INTO application_audit_logs (
        application_id, action, operator_id, operator_role,
        old_status, new_status, notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      )
    `,
      [
        newApplication.rows[0].id,
        'pota_imported', // 动作是POTA导入
        operatorId, // 操作员ID
        operatorRole, // 操作员角色
        null, // 旧状态（新创建）
        'pota_synced', // 新状态
        `POTA导入于 ${importTime}`, // 备注
      ]
    );

    return newApplication.rows[0];
  });
};
