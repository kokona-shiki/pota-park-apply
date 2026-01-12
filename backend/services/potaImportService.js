import axios from 'axios';
import http from 'http';
import https from 'https';
import { getOne, getMany, insert, transaction } from '../config/database.js';
import { checkUserPermission } from '../utils/auth.js';

// POTA API 基础 URL
const POTA_API_BASE_URL = 'https://api.pota.app';

/**
 * 从 POTA API 获取所有中国公园数据
 */
export const fetchAllChineseParks = async () => {
  try {
    console.log('开始从 POTA API 获取中国公园数据...');

    // 使用正确的 API 端点: /entity/parks/318
    // 后端可以直接访问外部 API，不需要代理
    // 实现带重试机制的请求
    let lastError;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.get(`${POTA_API_BASE_URL}/entity/parks/318`, {
          timeout: 30000,
          // 添加更多连接选项以处理网络问题
          httpAgent: http.Agent({ keepAlive: true }),
          httpsAgent: https.Agent({ keepAlive: true }),
          headers: {
            'User-Agent': 'POTA-Park-Importer/1.0',
            'Accept': 'application/json',
          },
        });
        
        if (response && Array.isArray(response.data)) {
          console.log(`成功获取 ${response.data.length} 个中国公园数据 (第 ${attempt} 次尝试)`);
          return response.data;
        }
      } catch (error) {
        lastError = error;
        console.log(`获取 POTA 公园数据失败 (第 ${attempt} 次尝试): ${error.message}`);
        
        // 如果不是最后一次尝试，等待一段时间再重试
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 指数退避
          console.log(`等待 ${delay}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // 如果所有重试都失败，抛出最后一个错误
    throw lastError;

    if (!Array.isArray(response.data)) {
      throw new Error('POTA API 返回的数据格式不正确，期望数组格式');
    }

    console.log(`成功获取 ${response.data.length} 个中国公园数据`);
    return response.data;
  } catch (error) {
    console.error('获取 POTA 公园数据失败:', error.message);
    
    // 如果所有重试都失败，记录详细错误并抛出异常
    console.error('POTA API 连接失败，无法获取数据:', error);
    
    // 为了系统的健壮性，返回空数组而不是抛出异常
    // 这样可以让导入过程继续，只是没有新公园被导入
    console.log('返回空数组，因为无法连接到 POTA API');
    return [];
  }
};

/**
 * 根据 POTA ID 检查公园是否已存在于系统中
 */
export const checkParkExistsByPotaId = async (potaId) => {
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
 * 将 POTA 公园数据转换为系统内部格式
 */
export const transformPotaParkToInternal = (potaPark) => {
  // 根据新的 POTA API 返回的数据结构进行转换
  // POTA API 返回的数据结构类似于：
  // {
  //   "reference": "CN-0002",
  //   "name": "中国长城国家公园 World Heritage Site",
  //   "latitude": 40.3456,
  //   "longitude": 115.987,
  //   "grid": "ON70xi",
  //   "locationDesc": "CN-BJ,CN-GS,CN-HA,CN-HE,CN-HL,CN-JL,CN-LN,CN-NM,CN-NX,CN-QH,CN-SD,CN-SN,CN-SX,CN-TJ,CN-XJ",
  //   "attempts": 5,
  //   "activations": 5,
  //   "qsos": 86
  // }

  // 解析 locationDesc 字段，它包含了多个省份代码，用逗号分隔
  const provinces = potaPark.locationDesc ? potaPark.locationDesc.split(',') : ['CN'];

  return {
    park_name: potaPark.name || potaPark.reference || 'Unknown Park',
    park_type: null, // POTA API 当前返回的数据中没有明确的公园类型，设为 null
    provinces: provinces,
    latitude: potaPark.latitude,
    longitude: potaPark.longitude,
    website: null, // POTA API 当前返回的数据中没有网站信息
    description: `${potaPark.name} (${potaPark.reference}), Grid: ${potaPark.grid}, Activations: ${potaPark.activations}, QSOs: ${potaPark.qsos}`,
    access_methods: [], // POTA API 当前返回的数据中没有访问方式信息
    activation_methods: [], // POTA API 当前返回的数据中没有激活方式信息
    confirmed_authenticity: true, // POTA 导入的公园默认真实
    pota_ref: potaPark.reference, // 保存原始 POTA 参考 ID
  };
};

/**
 * 创建公园申请并记录审核日志
 */
export const createParkWithAudit = async (parkData, operatorId, operatorRole, importTime) => {
  return await transaction(async (client) => {
    // 插入公园申请
    const insertQuery = `
      INSERT INTO park_applications (
        park_name, park_type, provinces, location, latitude, longitude,
        website, description, access_methods, activation_methods,
        applicant_id, status, pota_synced_at, pota_synced_by, pota_notes,
        confirmed_authenticity
      ) VALUES (
        $1, $2, $3, ST_GeomFromText($4, 4326), $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16
      )
      RETURNING *
    `;

    const locationWKT = `POINT(${parkData.longitude} ${parkData.latitude})`;

    const newApplication = await client.query(insertQuery, [
      parkData.park_name,
      parkData.park_type,
      JSON.stringify(parkData.provinces),
      locationWKT,
      parkData.latitude,
      parkData.longitude,
      parkData.website,
      parkData.description,
      JSON.stringify(parkData.access_methods),
      JSON.stringify(parkData.activation_methods),
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

/**
 * 导入单个 POTA 公园
 */
export const importSinglePotaPark = async (potaPark, operatorId, operatorRole, importTime) => {
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
    const internalPark = transformPotaParkToInternal(potaPark);

    // 创建公园并记录审核日志
    const createdPark = await createParkWithAudit(
      internalPark,
      operatorId,
      operatorRole,
      importTime
    );

    console.log(`成功导入公园: ${potaId} (ID: ${createdPark.id})`);
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
 * 执行 POTA 公园批量导入
 */
export const importPotaParks = async (operatorId, operatorRole) => {
  console.log(`开始执行 POTA 公园导入，操作员: ${operatorId}, 角色: ${operatorRole}`);

  const importTime = new Date().toISOString();

  try {
    // 获取所有中国公园数据
    const parksData = await fetchAllChineseParks();

    if (!Array.isArray(parksData) && typeof parksData === 'object') {
      // 如果返回的是对象而不是数组，尝试从中提取公园列表
      if (parksData.parks && Array.isArray(parksData.parks)) {
        parksData = parksData.parks;
      } else {
        // 尝试其他可能的属性名
        const possibleArrayKeys = ['data', 'results', 'features'];
        for (const key of possibleArrayKeys) {
          if (parksData[key] && Array.isArray(parksData[key])) {
            parksData = parksData[key];
            break;
          }
        }
      }
    }

    if (!Array.isArray(parksData)) {
      throw new Error('从 POTA API 获取的数据格式不正确，期望数组格式');
    }

    console.log(`准备导入 ${parksData.length} 个公园`);

    const results = {
      total: parksData.length,
      imported: 0,
      skipped: 0,
      errors: [],
    };

    // 逐个导入公园
    for (const park of parksData) {
      const result = await importSinglePotaPark(park, operatorId, operatorRole, importTime);

      if (result.success) {
        if (result.skipped) {
          results.skipped++;
        } else if (result.created) {
          results.imported++;
        }
      } else {
        results.errors.push(result);
        console.error(`导入公园失败:`, result);
      }
    }

    console.log(
      `POTA 公园导入完成: 总计 ${results.total}, 导入 ${results.imported}, 跳过 ${results.skipped}, 错误 ${results.errors.length}`
    );

    return results;
  } catch (error) {
    console.error('执行 POTA 公园导入失败:', error);
    throw error;
  }
};

/**
 * 手动触发 POTA 公园导入（供 API 调用）
 */
export const manualTriggerPotaImport = async (userId) => {
  // 检查用户权限（必须是 POTA 代表且有导入权限）
  const hasImportPermission = await checkUserPermission(userId, 'pota_import');
  const hasSyncPermission = await checkUserPermission(userId, 'sync_to_pota');

  // 用户必须是 POTA 代表且具有导入权限或同步权限
  if (!hasImportPermission && !hasSyncPermission) {
    throw new Error('没有权限执行 POTA 公园导入');
  }

  // 获取用户信息
  const userInfo = await getOne('SELECT id, role FROM users WHERE id = $1', [userId]);
  if (!userInfo) {
    throw new Error('用户不存在');
  }

  // 执行导入
  return await importPotaParks(userInfo.id, userInfo.role);
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

    const results = await importPotaParks(systemOperatorId, systemOperatorRole);
    console.log('自动 POTA 公园导入完成:', results);
    return results;
  } catch (error) {
    console.error('自动 POTA 公园导入失败:', error);
    // 记录错误但不抛出，避免定时任务中断
    return {
      error: error.message,
      success: false,
    };
  }
};
