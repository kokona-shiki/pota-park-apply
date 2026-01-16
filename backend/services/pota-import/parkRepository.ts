import { getOne, transaction } from '../../config/database.js';
import type { InternalPark } from './types.js';

/**
 * 根据 POTA ID 检查公园是否已存在于系统中
 */
export const checkParkExistsByPotaId = async (potaId: string) => {
  // 为了能够根据 POTA ID 检查公园是否已存在，我们需要在 pota_notes 字段中存储 POTA ID
  // 我们约定在 pota_notes 中以特定格式存储 POTA ID，例如 "POTA Ref: CN-XXXX"

  const existingPark = await getOne(
    'SELECT id, park_name, pota_notes FROM park_applications WHERE pota_notes LIKE $1',
    [`%POTA ID: ${potaId}%`] // 在导入时我们会将 POTA ID 存储在此格式中
  );

  if (existingPark) {
    console.log(`公园 ${potaId} 已存在于系统中，ID: ${existingPark.id}`);
    return existingPark;
  }

  // 也可以尝试通过 park_name 检查，以防之前的导入没有正确存储 POTA ID
  const nameMatch = await getOne(
    'SELECT id, park_name, pota_notes FROM park_applications WHERE park_name = $1',
    [potaId]
  );

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
        confirmed_authenticity, pota_park_type
      ) VALUES (
        $1, $2, $3, ST_GeomFromText($4, 4326), $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17
      )
      RETURNING *
    `;

    const locationWKT = `POINT(${parkData.longitude} ${parkData.latitude})`;

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
      `POTA导入于 ${importTime}, POTA ID: ${parkData.pota_ref || 'N/A'}, 来源: ${
        operatorId === -1 ? '自动导入' : '手动导入'
      }`, // 审核备注
      parkData.confirmed_authenticity,
      parkData.pota_park_type || null, // POTA 公园类型
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
        'pota_synced', // 动作是POTA同步
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
