import axios from 'axios';
import http from 'http';
import https from 'https';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getOne, getMany, query, transaction } from '../config/database.js';
import { checkUserPermission } from '../utils/auth.js';
import { logPotaSync } from './potaSyncLogService.js';

// POTA API 基础 URL
const POTA_API_BASE_URL = 'https://api.pota.app';
const QUERY_PARK_MAX_RETRIES = 3;
const QUERY_PARK_MIN_DELAY_MS = 1000;
const QUERY_PARK_MAX_DELAY_MS = 3000;
const IMPORT_TASK_QUEUE_MAX = 5;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getRandomDelayMs = () =>
  Math.floor(Math.random() * (QUERY_PARK_MAX_DELAY_MS - QUERY_PARK_MIN_DELAY_MS + 1)) +
  QUERY_PARK_MIN_DELAY_MS;

const applyQueryParkDelay = async () => {
  const delay = getRandomDelayMs();
  await sleep(delay);
};

const normalizeCsvList = (value) => {
  if (typeof value !== 'string') {
    return [];
  }
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const formatQueryParkError = (error) => {
  if (!error) {
    return '未知错误';
  }
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;
    let detail = '';
    if (typeof data === 'string') {
      detail = data;
    } else if (data) {
      detail = JSON.stringify(data);
    } else if (error.message) {
      detail = error.message;
    }
    const suffix = detail ? ` - ${detail}` : '';
    return `HTTP ${status}${suffix}`;
  }
  return error.message || '未知错误';
};

const buildQueryParkFailureReason = (attempts, error) =>
  `查询 POTA 公园 失败（${attempts}/${QUERY_PARK_MAX_RETRIES}次）：${formatQueryParkError(error)}`;

const extractChineseName = (name) => {
  if (typeof name !== 'string') {
    return '';
  }
  const trimmed = name.trim();
  if (!trimmed) {
    return '';
  }
  const spaceIndex = trimmed.indexOf(' ');
  if (spaceIndex === -1) {
    return trimmed;
  }
  return trimmed.substring(0, spaceIndex);
};

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
 * 查询 POTA 公园详情
 */
export const fetchPotaParkDetail = async (reference) => {
  let lastError;

  for (let attempt = 1; attempt <= QUERY_PARK_MAX_RETRIES; attempt++) {
    try {
      await applyQueryParkDelay();
      const response = await axios.get(`${POTA_API_BASE_URL}/park/${reference}`, {
        timeout: 30000,
        httpAgent: http.Agent({ keepAlive: true }),
        httpsAgent: https.Agent({ keepAlive: true }),
        headers: {
          'User-Agent': 'POTA-Park-Importer/1.0',
          Accept: 'application/json',
          Referer: 'https://pota.app/',
        },
      });

      if (response && response.data) {
        return { data: response.data, attempts: attempt };
      }
    } catch (error) {
      lastError = error;
      console.log(
        `查询 POTA 公园失败 (第 ${attempt} 次尝试, ${reference}): ${formatQueryParkError(error)}`
      );
    }
  }

  const error = new Error(buildQueryParkFailureReason(QUERY_PARK_MAX_RETRIES, lastError));
  error.cause = lastError;
  throw error;
};

const getPotaReference = (park) =>
  park?.reference || park?.potaId || park?.pota_ref || park?.potaRef || '';

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
let parkTypeIndex = null;

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
    const mappingFilePath = path.resolve(__dirname, '../../shared/park_type_mapping.json');

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

const buildParkTypeIndex = (mappings) => {
  const allTypes = [
    ...(mappings.chinese_to_english || []),
    ...(mappings.pota_only_types || []),
  ].filter((item) => item && item.id);

  const byId = new Map();
  const byEnglish = new Map();
  const byChinese = new Map();

  for (const item of allTypes) {
    byId.set(item.id, { id: item.id, zh: item.chineseName, en: item.englishName });
    byChinese.set(item.chineseName, item.id);
    const ids = byEnglish.get(item.englishName) || [];
    ids.push(item.id);
    byEnglish.set(item.englishName, ids);
  }

  return {
    allTypes,
    byId,
    byEnglish,
    byChinese,
  };
};

const getParkTypeIndex = async () => {
  if (parkTypeIndex) {
    return parkTypeIndex;
  }
  const mappings = await loadParkTypeMappings();
  parkTypeIndex = buildParkTypeIndex(mappings);
  return parkTypeIndex;
};

export const resolveParkTypeId = async (value) => {
  if (!value) {
    return null;
  }
  const { byId, byEnglish, byChinese } = await getParkTypeIndex();
  if (byId.has(value)) {
    return value;
  }
  if (byChinese.has(value)) {
    return byChinese.get(value);
  }
  const englishIds = byEnglish.get(value);
  if (englishIds && englishIds.length > 0) {
    return englishIds[0];
  }
  return null;
};

/**
 * 根据公园名称识别公园类型
 * @param {Object} potaPark - POTA 公园数据
 * @returns {string|null} - 识别出的公园类型ID，如果无法识别则返回 null
 */
export const identifyParkType = async (potaPark) => {
  const mappings = await loadParkTypeMappings();

  const rawName = typeof potaPark?.name === 'string' ? potaPark.name.trim() : '';
  const rawTypeDesc =
    typeof potaPark?.parkTypeDesc === 'string' ? potaPark.parkTypeDesc.trim() : '';

  if (!rawName && !rawTypeDesc) {
    return null;
  }

  let chinesePart = rawName;
  let englishPart = rawTypeDesc;

  if (!englishPart && rawName.includes(' ')) {
    const spaceIndex = rawName.indexOf(' ');
    if (spaceIndex !== -1) {
      chinesePart = rawName.substring(0, spaceIndex);
      englishPart = rawName.substring(spaceIndex + 1);
    }
  }

  // 从中文部分识别：查找包含中文公园类型关键词的名称
  // 首先检查标准类型
  for (const mapping of mappings.chinese_to_english) {
    if (chinesePart.includes(mapping.chineseName)) {
      console.log(`通过中文关键词识别公园类型: ${mapping.chineseName} -> ${mapping.englishName}`);
      return mapping.id || null;
    }
  }

  // 然后检查POTA专用类型
  if (mappings.pota_only_types) {
    for (const mapping of mappings.pota_only_types) {
      if (chinesePart.includes(mapping.chineseName)) {
        console.log(
          `通过POTA专用中文关键词识别公园类型: ${mapping.chineseName} -> ${mapping.englishName}`
        );
        return mapping.id || null;
      }
    }
  }

  // 从英文部分识别：如果中文部分无法识别，尝试通过英文部分匹配
  // 检查英文部分是否匹配系统定义的英文类型
  let possibleTypes = [];

  // 检查标准英文类型
  for (const mapping of mappings.english_to_chinese || []) {
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
      possibleTypes.push({
        typeId: mapping.id,
        englishName: mapping.englishName,
        length: mapping.englishName.length,
      });
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
        possibleTypes.push({
          typeId: mapping.id,
          englishName: mapping.englishName,
          length: mapping.englishName.length,
        });
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
      console.log(`通过英文部分识别公园类型: ${longestMatches[0].englishName}`);
      return longestMatches[0].typeId || null;
    } else {
      // 如果有多个相同长度的匹配，返回第一个
      const matchedTypes = longestMatches.map((item) => item.englishName);
      console.log(`发现多个相同长度的匹配类型: ${matchedTypes.join(', ')}`);
      return longestMatches[0].typeId || null;
    }
  } else {
    if (englishPart) {
      console.log(`英文部分无法匹配任何类型: ${englishPart}`);
    }
  }

  // 最后，检查默认的公园类型
  const defaultPotaType = mappings.default_pota_type;
  if (defaultPotaType) {
    if (chinesePart.includes(defaultPotaType.chineseName)) {
      console.log(
        `通过默认中文关键词识别公园类型: ${defaultPotaType.chineseName} -> ${defaultPotaType.englishName}`
      );
      return defaultPotaType.id || null;
    }

    if (englishPart.includes(defaultPotaType.englishName)) {
      console.log(
        `通过默认英文关键词识别公园类型: ${defaultPotaType.englishName} -> ${defaultPotaType.chineseName}`
      );
      return defaultPotaType.id || null;
    }
  }

  // 如果没有匹配的类型，返回 null
  console.log(`无法识别公园类型，英文部分: ${englishPart || 'N/A'}`);
  return null;
};

/**
 * 将 POTA 公园数据转换为系统内部格式
 */
export const transformPotaParkToInternal = async (potaPark, resolvedType = null) => {
  // 解析 locationDesc 字段，它包含了多个省份代码，用逗号分隔
  const provinces = potaPark.locationDesc
    ? potaPark.locationDesc
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  // 识别公园类型
  const parkType = resolvedType ?? (await identifyParkType(potaPark));

  const parkName = potaPark.name || potaPark.reference || 'Unknown Park';

  return {
    park_name: parkName,
    park_type: parkType, // 根据名称识别出的公园类型
    provinces: provinces,
    latitude: potaPark.latitude,
    longitude: potaPark.longitude,
    website: potaPark.website || null,
    description: potaPark.parkComments || '',
    access_methods: normalizeCsvList(potaPark.accessMethods),
    activation_methods: normalizeCsvList(potaPark.activationMethods),
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
export const importSinglePotaPark = async (
  potaPark,
  operatorId,
  operatorRole,
  importTime,
  resolvedType = null
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

    console.log(`成功导入公园: ${potaId} ID: ${createdPark.id} NAME: ${potaPark.name} TYPE: ${resolvedType} POTA_TYPE: ${potaPark.parktypeDesc}`);
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
    let parksData = await fetchAllChineseParks();

    if (!Array.isArray(parksData) && typeof parksData === 'object') {
      if (parksData.parks && Array.isArray(parksData.parks)) {
        parksData = parksData.parks;
      } else {
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
      needs_manual_confirmation: [],
    };

    const unprocessedParks = [];

    for (const listPark of parksData) {
      const potaId = getPotaReference(listPark);
      if (!potaId) {
        results.errors.push({ error: '公园数据缺少POTA ID', park: listPark });
        continue;
      }

      const existingPark = await checkParkExistsByPotaId(potaId);
      if (existingPark) {
        results.skipped++;
        parksImported.push({
          reference: potaId,
          name: listPark.name,
          status: 'skipped',
          reason: 'Already exists',
        });
        continue;
      }

      let parkDetail = null;
      try {
        const detailResult = await fetchPotaParkDetail(potaId);
        parkDetail = detailResult.data;
      } catch (error) {
        const failureReason =
          error.message || buildQueryParkFailureReason(QUERY_PARK_MAX_RETRIES, error);
        const fallbackName = extractChineseName(listPark.name) || listPark.name || potaId;
        const unprocessedPark = {
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
        });
        continue;
      }

      const enrichedPark = {
        ...parkDetail,
        activations: listPark.activations ?? parkDetail?.activations,
        qsos: listPark.qsos ?? parkDetail?.qsos,
      };

      const parkType = await identifyParkType(enrichedPark);
      if (!parkType) {
        const unprocessedPark = {
          reference: potaId,
          name: enrichedPark.name || extractChineseName(listPark.name) || potaId,
          latitude: enrichedPark.latitude ?? null,
          longitude: enrichedPark.longitude ?? null,
          locationDesc: enrichedPark.locationDesc || '',
          grid: enrichedPark.grid6 || enrichedPark.grid4 || '',
          activations: listPark.activations ?? null,
          qsos: listPark.qsos ?? null,
          parkTypeDesc: enrichedPark.parkTypeDesc || '',
          accessMethods: enrichedPark.accessMethods || '',
          activationMethods: enrichedPark.activationMethods || '',
          website: enrichedPark.website || '',
          parkComments: enrichedPark.parkComments || '',
          failureReason: '无法自动识别公园类型，需要手动确认',
        };
        results.needs_manual_confirmation.push(unprocessedPark);
        unprocessedParks.push(unprocessedPark);
        parksImported.push({
          reference: potaId,
          name: unprocessedPark.name,
          status: 'skipped',
          reason: 'Requires manual confirmation',
        });
        continue;
      }

      const result = await importSinglePotaPark(
        enrichedPark,
        operatorId,
        operatorRole,
        importTime,
        parkType
      );

      if (result.success) {
        if (result.skipped) {
          results.skipped++;
          parksImported.push({
            reference: potaId,
            name: enrichedPark.name,
            status: 'skipped',
            reason: 'Already exists',
          });
        } else if (result.created) {
          results.imported++;
          parksImported.push({
            reference: potaId,
            name: enrichedPark.name,
            status: 'success',
          });
        }
      } else {
        results.errors.push(result);
        parksImported.push({
          reference: result.potaId || potaId,
          name: enrichedPark.name,
          status: 'failed',
          reason: result.error,
        });
        console.error(`导入公园失败:`, result);
      }
    }

    results.needs_manual_confirmation = unprocessedParks;

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

const importTaskQueue = [];
let importTaskRunning = false;
let importTaskSequence = 1;

const getActiveImportTasks = () =>
  importTaskQueue.filter((task) => task.status === 'pending' || task.status === 'running');

const isImportQueueFull = () => getActiveImportTasks().length >= IMPORT_TASK_QUEUE_MAX;

const getPendingQueuePosition = (taskId) => {
  const pending = importTaskQueue.filter((task) => task.status === 'pending');
  const index = pending.findIndex((task) => task.id === taskId);
  return index === -1 ? 0 : index + 1;
};

const deriveTaskStatusFromResult = (result) => {
  if (!result) {
    return 'failed';
  }
  if (result.errors && result.errors.length > 0) {
    return result.imported > 0 ? 'partial_success' : 'failed';
  }
  return 'success';
};

const cleanupImportTasks = () => {
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

const formatTaskResultSummary = (result) => {
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

const buildTaskResponse = (task) => ({
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

const startNextImportTask = async () => {
  if (importTaskRunning) {
    return;
  }

  const nextTask = importTaskQueue.find((task) => task.status === 'pending');
  if (!nextTask) {
    return;
  }

  importTaskRunning = true;
  nextTask.status = 'running';
  nextTask.startedAt = new Date().toISOString();

  try {
    const result = await importPotaParks(nextTask.operatorId, nextTask.operatorRole);
    nextTask.result = result;
    nextTask.status = deriveTaskStatusFromResult(result);
    if (result.needs_manual_confirmation && result.needs_manual_confirmation.length > 0) {
      await setUnprocessedParks(result.needs_manual_confirmation);
    } else {
      await clearUnprocessedParks();
    }
  } catch (error) {
    nextTask.error = error.message || '导入任务失败';
    nextTask.status = 'failed';
  } finally {
    nextTask.finishedAt = new Date().toISOString();
    importTaskRunning = false;
    cleanupImportTasks();
    await startNextImportTask();
  }
};

const enqueueImportTask = ({ operatorId, operatorRole, operationType }) => {
  const task = {
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
  startNextImportTask();
  return task;
};

const getUserActiveTask = (userId) =>
  importTaskQueue.find(
    (task) => task.operatorId === userId && (task.status === 'pending' || task.status === 'running')
  );

export const getLatestImportTaskForUser = async (userId) => {
  const userTasks = importTaskQueue.filter(
    (task) => task.operatorId === userId && task.operationType === 'manual'
  );
  if (userTasks.length === 0) {
    return null;
  }
  const latestTask = userTasks[userTasks.length - 1];
  return buildTaskResponse(latestTask);
};

export const markImportTaskRead = async (userId, taskId) => {
  const task = importTaskQueue.find(
    (item) => item.id === taskId && item.operatorId === userId && item.operationType === 'manual'
  );
  if (!task) {
    return null;
  }
  task.readAt = new Date().toISOString();
  return buildTaskResponse(task);
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
  });

  return {
    task: buildTaskResponse(task),
  };
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

const normalizeUnprocessedParks = (parks = []) => {
  const uniqueParks = new Map();

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
export const setUnprocessedParks = async (parks) => {
  const normalizedParks = normalizeUnprocessedParks(parks);

  return transaction(async (client) => {
    await client.query('DELETE FROM pota_unprocessed_parks');

    if (normalizedParks.length === 0) {
      console.log('设置未处理公园列表，数量: 0');
      return [];
    }

    const values = [];
    const placeholders = normalizedParks
      .map((park, index) => {
        const baseIndex = index * 2;
        values.push(park.reference, JSON.stringify(park));
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
export const processUnprocessedPark = async (parkData, operatorId, operatorRole) => {
  try {
    console.log(`处理未处理公园: ${parkData.reference}, 指定类型: ${parkData.manualType}`);

    const manualTypeId = await resolveParkTypeId(parkData.manualType);
    if (!manualTypeId) {
      throw new Error(`无法识别公园类型: ${parkData.manualType}`);
    }

    let parkDetail = null;
    try {
      const detailResult = await fetchPotaParkDetail(parkData.reference);
      parkDetail = detailResult.data;
    } catch (error) {
      return {
        success: false,
        error: error.message || `查询 POTA 公园失败: ${parkData.reference}`,
        reference: parkData.reference,
      };
    }

    const enrichedPark = {
      ...parkDetail,
      reference: parkData.reference,
      name: parkDetail?.name || parkData.name || parkData.reference,
      activations: parkData.activations ?? parkDetail?.activations,
      qsos: parkData.qsos ?? parkDetail?.qsos,
    };

    // 使用指定的类型创建公园数据
    const internalPark = await transformPotaParkToInternal(enrichedPark, manualTypeId);
    internalPark.park_type = manualTypeId; // 使用手动指定的类型ID

    // 创建公园并记录审核日志
    const createdPark = await createParkWithAudit(
      internalPark,
      operatorId,
      operatorRole,
      new Date().toISOString()
    );

    // 从数据库中移除已处理的公园
    await query('DELETE FROM pota_unprocessed_parks WHERE reference = $1', [parkData.reference]);

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
