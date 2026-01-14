import axios from 'axios';
import http from 'http';
import https from 'https';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getOne, getMany, insert, transaction } from '../config/database.js';
import { checkUserPermission } from '../utils/auth.js';
import { logPotaSync } from './potaSyncLogService.js';

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
            Accept: 'application/json',
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
          await new Promise((resolve) => setTimeout(resolve, delay));
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

// 缓存公园类型映射
let parkTypeMappings = null;

/**
 * 加载公园类型映射
 */
export const loadParkTypeMappings = async () => {
  if (parkTypeMappings) {
    return parkTypeMappings;
  }

  try {
    // 获取当前文件的目录路径
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // 构建前端资产文件路径
    const mappingFilePath = path.resolve(
      __dirname,
      '../../frontend/src/assets/park_type_mapping.json'
    );

    const fileContent = await fs.readFile(mappingFilePath, 'utf8');
    const mappings = JSON.parse(fileContent);

    parkTypeMappings = mappings;
    return mappings;
  } catch (error) {
    console.error('加载公园类型映射失败:', error.message);
    // 返回一个默认的映射结构，以防文件读取失败
    return {
      chinese_to_english: [],
      english_to_chinese: [],
    };
  }
};

/**
 * 根据公园名称识别公园类型
 * @param {Object} potaPark - POTA 公园数据
 * @returns {string|null} - 识别出的公园类型，如果无法识别则返回 null
 */
export const identifyParkType = async (potaPark) => {
  const mappings = await loadParkTypeMappings();

  if (!potaPark.name) {
    return null;
  }

  const parkName = potaPark.name;

  // 分离中文和英文部分：遇到第一个空格前的部分视为中文部分，之后的部分视为英文部分
  const spaceIndex = parkName.indexOf(' ');
  let chinesePart = parkName;
  let englishPart = '';

  if (spaceIndex !== -1) {
    chinesePart = parkName.substring(0, spaceIndex);
    englishPart = parkName.substring(spaceIndex + 1);
  }

  // 从中文部分识别：查找包含中文公园类型关键词的名称
  // 首先检查标准类型
  for (const mapping of mappings.chinese_to_english) {
    if (chinesePart.includes(mapping.chineseName)) {
      console.log(`通过中文关键词识别公园类型: ${mapping.chineseName} -> ${mapping.englishName}`);
      return mapping.englishName;
    }
  }

  // 然后检查POTA专用类型
  if (mappings.pota_only_types) {
    for (const mapping of mappings.pota_only_types) {
      if (chinesePart.includes(mapping.chineseName)) {
        console.log(
          `通过POTA专用中文关键词识别公园类型: ${mapping.chineseName} -> ${mapping.englishName}`
        );
        return mapping.englishName;
      }
    }
  }

  // 从英文部分识别：如果中文部分无法识别，尝试通过英文部分匹配
  // 检查英文部分是否匹配系统定义的英文类型
  let possibleTypes = [];

  // 检查标准英文类型
  for (const mapping of mappings.english_to_chinese) {
    // 检查英文类型名称是否在英文部分中
    const englishWords = mapping.englishName.toLowerCase().split(/\s+/);
    const lowerEnglishPart = englishPart.toLowerCase();

    let matchFound = true;
    for (const word of englishWords) {
      if (!lowerEnglishPart.includes(word)) {
        matchFound = false;
        break;
      }
    }

    if (matchFound) {
      possibleTypes.push({ type: mapping.englishName, length: mapping.englishName.length });
    }
  }

  // 检查POTA专用类型
  if (mappings.pota_only_types) {
    for (const mapping of mappings.pota_only_types) {
      // 检查POTA专用英文类型名称是否在英文部分中
      const englishWords = mapping.englishName.toLowerCase().split(/\s+/);
      const lowerEnglishPart = englishPart.toLowerCase();

      let matchFound = true;
      for (const word of englishWords) {
        if (!lowerEnglishPart.includes(word)) {
          matchFound = false;
          break;
        }
      }

      if (matchFound) {
        possibleTypes.push({ type: mapping.englishName, length: mapping.englishName.length });
      }
    }
  }

  // 如果有多个匹配，选择最精确的（最长的匹配）
  if (possibleTypes.length > 0) {
    // 按长度降序排序，选择最长的匹配
    possibleTypes.sort((a, b) => b.length - a.length);

    // 检查是否有多个相同长度的匹配
    const maxLength = possibleTypes[0].length;
    const longestMatches = possibleTypes.filter((item) => item.length === maxLength);

    if (longestMatches.length === 1) {
      console.log(`通过英文部分识别公园类型: ${longestMatches[0].type}`);
      return longestMatches[0].type;
    } else {
      // 如果有多个相同长度的匹配，返回第一个
      const matchedTypes = longestMatches.map((item) => item.type);
      console.log(`发现多个相同长度的匹配类型: ${matchedTypes.join(', ')}`);
      return longestMatches[0].type;
    }
  } else {
    console.log(`英文部分无法匹配任何类型: ${englishPart}`);
  }

  // 如果没有匹配的类型，返回 null
  console.log(`无法识别公园类型，英文部分: ${englishPart}`);
  return null;
};

/**
 * 将 POTA 公园数据转换为系统内部格式
 */
export const transformPotaParkToInternal = async (potaPark) => {
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

  // 识别公园类型
  const parkType = await identifyParkType(potaPark);

  return {
    park_name: potaPark.name || potaPark.reference || 'Unknown Park',
    park_type: parkType, // 根据名称识别出的公园类型
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
    const internalPark = await transformPotaParkToInternal(potaPark);

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
  
  // 准备日志记录所需的数据
  const parksImported = [];

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
      needs_manual_confirmation: [], // 需要手动确认公园类型的公园
    };

    // 存储需要手动确认的公园数据
    const unprocessedParks = [];

    // 首先预处理所有公园，识别需要手动确认的公园
    const mappings = await loadParkTypeMappings();

    for (const park of parksData) {
      const parkType = await identifyParkType(park);
      if (parkType === null) {
        // 如果无法自动识别公园类型，将其添加到需要手动确认的列表中
        const unprocessedPark = {
          reference: park.reference,
          name: park.name,
          latitude: park.latitude,
          longitude: park.longitude,
          locationDesc: park.locationDesc,
          grid: park.grid,
          attempts: park.attempts,
          activations: park.activations,
          qsos: park.qsos,
          message: '无法自动识别公园类型，需要手动确认',
          suggestedType: null,
          manualType: null,
        };
        results.needs_manual_confirmation.push(unprocessedPark);
        unprocessedParks.push(unprocessedPark);
      }
    }

    if (results.needs_manual_confirmation.length > 0) {
      console.log(`发现 ${results.needs_manual_confirmation.length} 个公园需要手动确认类型`);

      // 更新未处理公园缓存
      await setUnprocessedParks(results.needs_manual_confirmation);

      // 如果是自动导入（系统执行），我们可以选择跳过这些需要手动确认的公园
      // 或者将它们导入但类型为 null
      if (operatorId === -1) {
        // 系统自动导入
        console.log('自动导入模式：将跳过需要手动确认类型的公园');
        // 过滤掉需要手动确认的公园
        const autoImportableParks = parksData.filter((park) =>
          results.needs_manual_confirmation.every((manual) => manual.reference !== park.reference)
        );

        // 导入可自动处理的公园
        for (const park of autoImportableParks) {
          const result = await importSinglePotaPark(park, operatorId, operatorRole, importTime);

          if (result.success) {
            if (result.skipped) {
              results.skipped++;
              // 记录跳过的公园
              parksImported.push({
                reference: park.reference,
                name: park.name,
                status: 'skipped',
                reason: 'Already exists',
              });
            } else if (result.created) {
              results.imported++;
              // 记录导入成功的公园
              parksImported.push({
                reference: park.reference,
                name: park.name,
                status: 'success',
              });
            }
          } else {
            results.errors.push(result);
            // 记录导入失败的公园
            parksImported.push({
              reference: result.potaId || (result.park && result.park.reference),
              name: result.park && result.park.name,
              status: 'failed',
              reason: result.error,
            });
            console.error(`导入公园失败:`, result);
          }
        }
      } else {
        // 手动导入模式
        // 在手动导入模式下，我们仍然导入所有可自动识别类型的公园
        for (const park of parksData) {
          // 检查是否是需要手动确认的公园
          const isManualConfirmationNeeded = results.needs_manual_confirmation.some(
            (manual) => manual.reference === park.reference
          );

          if (isManualConfirmationNeeded) {
            console.log(`跳过需要手动确认类型的公园: ${park.reference}`);
            // 记录跳过的公园
            parksImported.push({
              reference: park.reference,
              name: park.name,
              status: 'skipped',
              reason: 'Requires manual confirmation',
            });
            continue; // 跳过需要手动确认的公园
          }

          const result = await importSinglePotaPark(park, operatorId, operatorRole, importTime);

          if (result.success) {
            if (result.skipped) {
              results.skipped++;
              // 记录跳过的公园
              parksImported.push({
                reference: park.reference,
                name: park.name,
                status: 'skipped',
                reason: 'Already exists',
              });
            } else if (result.created) {
              results.imported++;
              // 记录导入成功的公园
              parksImported.push({
                reference: park.reference,
                name: park.name,
                status: 'success',
              });
            }
          } else {
            results.errors.push(result);
            // 记录导入失败的公园
            parksImported.push({
              reference: result.potaId || (result.park && result.park.reference),
              name: result.park && result.park.name,
              status: 'failed',
              reason: result.error,
            });
            console.error(`导入公园失败:`, result);
          }
        }
      }
    } else {
      // 如果没有需要手动确认的公园，正常导入所有公园
      // 清空未处理公园缓存
      await clearUnprocessedParks();

      for (const park of parksData) {
        const result = await importSinglePotaPark(park, operatorId, operatorRole, importTime);

        if (result.success) {
          if (result.skipped) {
            results.skipped++;
            // 记录跳过的公园
            parksImported.push({
              reference: park.reference,
              name: park.name,
              status: 'skipped',
              reason: 'Already exists',
            });
          } else if (result.created) {
            results.imported++;
            // 记录导入成功的公园
            parksImported.push({
              reference: park.reference,
              name: park.name,
              status: 'success',
            });
          }
        } else {
          results.errors.push(result);
          // 记录导入失败的公园
          parksImported.push({
            reference: result.potaId || (result.park && result.park.reference),
            name: result.park && result.park.name,
            status: 'failed',
            reason: result.error,
          });
          console.error(`导入公园失败:`, result);
        }
      }
    }

    // 确定操作人名称
    let operatorName = '系统自动';
    if (operatorId !== -1) {
      const userInfo = await getOne('SELECT callsign FROM users WHERE id = $1', [operatorId]);
      operatorName = userInfo ? userInfo.callsign : `用户ID: ${operatorId}`;
    }

    // 确定操作类型
    const operationType = operatorId === -1 ? 'auto' : 'manual';
    
    // 确定同步状态
    let syncStatus = 'success';
    if (results.errors.length > 0) {
      if (results.imported > 0) {
        syncStatus = 'partial_success';
      } else {
        syncStatus = 'failed';
      }
    } else if (results.skipped > 0 && results.imported === 0) {
      syncStatus = 'success'; // 即使全部跳过，如果没错误也算成功
    }

    // 记录POTA同步日志
    await logPotaSync(
      operatorName,
      operationType,
      parksImported,
      syncStatus,
      `总计: ${results.total}, 导入: ${results.imported}, 跳过: ${results.skipped}, 错误: ${results.errors.length}`
    );

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
  const results = await importPotaParks(userInfo.id, userInfo.role);

  // 如果导入结果中有需要手动确认的公园，更新缓存
  if (results.needs_manual_confirmation && results.needs_manual_confirmation.length > 0) {
    await setUnprocessedParks(results.needs_manual_confirmation);
  } else {
    await clearUnprocessedParks();
  }

  return results;
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

    // 如果导入结果中有需要手动确认的公园，更新缓存
    if (results.needs_manual_confirmation && results.needs_manual_confirmation.length > 0) {
      await setUnprocessedParks(results.needs_manual_confirmation);
    } else {
      await clearUnprocessedParks();
    }

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

// 全局变量存储未处理的公园
let unprocessedParksCache = [];

/**
 * 获取需要手动处理的公园列表
 */
export const getUnprocessedParks = async () => {
  console.log('获取未处理公园列表，当前缓存数量:', unprocessedParksCache.length);
  return unprocessedParksCache;
};

/**
 * 设置未处理的公园列表
 */
export const setUnprocessedParks = async (parks) => {
  unprocessedParksCache = parks;
  console.log('设置未处理公园列表，数量:', parks.length);
  return parks;
};

/**
 * 清空未处理的公园列表
 */
export const clearUnprocessedParks = async () => {
  unprocessedParksCache = [];
  console.log('清空未处理公园列表');
  return [];
};

/**
 * 处理单个未处理的公园
 */
export const processUnprocessedPark = async (parkData, operatorId, operatorRole) => {
  try {
    console.log(`处理未处理公园: ${parkData.reference}, 指定类型: ${parkData.manualType}`);

    // 构造公园数据对象
    const potaPark = {
      reference: parkData.reference,
      name: parkData.name,
      latitude: parkData.latitude,
      longitude: parkData.longitude,
      grid: parkData.grid,
      locationDesc: parkData.locationDesc,
      attempts: parkData.attempts,
      activations: parkData.activations,
      qsos: parkData.qsos,
    };

    // 使用指定的类型创建公园数据
    const internalPark = await transformPotaParkToInternal(potaPark);
    internalPark.park_type = parkData.manualType; // 使用手动指定的类型

    // 创建公园并记录审核日志
    const createdPark = await createParkWithAudit(
      internalPark,
      operatorId,
      operatorRole,
      new Date().toISOString()
    );

    // 从缓存中移除已处理的公园
    unprocessedParksCache = unprocessedParksCache.filter(
      (park) => park.reference !== parkData.reference
    );

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
 * 批量处理未处理的公园
 */
export const bulkProcessUnprocessedParks = async (parksData, operatorId, operatorRole) => {
  const results = [];

  for (const parkData of parksData) {
    const result = await processUnprocessedPark(parkData, operatorId, operatorRole);
    results.push(result);
  }

  return results;
};
