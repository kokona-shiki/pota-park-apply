/**
 * 结合最新系统内公园类型重新分析 POTA 数据
 * 包括我们新添加的 POTA 专用类型
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function reanalyzePotaTypesWithNewData() {
  try {
    // 读取 POTA 公园数据
    const potaDataPath = path.resolve(__dirname, '../../protocols/china-all-parks.json');
    const potaDataContent = await fs.readFile(potaDataPath, 'utf8');
    const potaParks = JSON.parse(potaDataContent);

    // 读取系统中的公园类型映射（包含新的 POTA 专用类型）
    const systemTypesPath = path.resolve(
      __dirname,
      '../../frontend/src/assets/park_type_mapping.json'
    );
    const systemTypesContent = await fs.readFile(systemTypesPath, 'utf8');
    const systemTypes = JSON.parse(systemTypesContent);

    // 提取系统中所有的类型（包括新的 POTA 专用类型）
    const systemChineseTypes = new Set();
    const systemEnglishTypes = new Set();

    // 添加标准类型
    for (const item of systemTypes.chinese_to_english) {
      systemChineseTypes.add(item.chineseName);
      systemEnglishTypes.add(item.englishName);
    }

    // 添加 POTA 专用类型（如果存在）
    if (systemTypes.pota_only_types) {
      for (const item of systemTypes.pota_only_types) {
        systemChineseTypes.add(item.chineseName);
        systemEnglishTypes.add(item.englishName);
      }
    }

    // 添加英文到中文的映射类型
    for (const item of systemTypes.english_to_chinese) {
      systemEnglishTypes.add(item.englishName);
    }

    console.log('系统中存在的中文类型:', Array.from(systemChineseTypes));
    console.log('系统中存在的英文类型:', Array.from(systemEnglishTypes));

    // 提取 POTA 公园名称中的类型信息
    const potaChineseTypes = new Map(); // 使用 Map 来记录出现次数
    const potaEnglishTypes = new Set();
    const parkAnalysis = [];

    for (const park of potaParks) {
      const name = park.name;

      // 分离中文和英文部分
      const chinesePart = name.match(
        /[\u4e00-\u9fff\u3400-\u4dbf\u{20000}-\u{2a6df}\u{2a700}-\u{2b73f}\u{2b740}-\u{2b81f}\u{2b820}-\u{2ceaf}\uf900-\ufaff\u3300-\u33ff\ufe30-\ufe4f\uf900-\ufaff\u{2f800}-\u{2fa1f}]+/gu
      );
      const fullChinese = chinesePart ? chinesePart.join('') : '';

      // 提取可能的中文公园类型关键词，按长度降序排列以确保较长的匹配优先
      const chineseKeywords = [
        '国家公园',
        '国家森林公园',
        '国家湿地公园',
        '国家地质公园',
        '国家沙漠公园',
        '国家草原公园',
        '国家海洋公园',
        '国家风景名胜区',
        '国家自然保护区',
        '国家水利风景区',
        '国家矿山公园',
        '国家考古遗址公园',
        '国家重点文物保护单位',
        '国家爱国主义教育基地',
        '省级公园',
        '省级森林公园',
        '省级湿地公园',
        '省级地质公园',
        '省级沙漠公园',
        '省级风景名胜区',
        '省级自然保护区',
        '省级水利风景区',
        '省级矿山公园',
        '省级考古遗址公园',
        '省级重点文物保护单位',
        '世界地质公园',
        '森林公园',
        '湿地公园',
        '地质公园',
        '沙漠公园',
        '草原公园',
        '海洋公园',
        '风景名胜区',
        '自然保护区',
        '水利风景区',
        '矿山公园',
        '考古遗址公园',
        '文物保护单位',
        '爱国主义教育基地',
        '公园',
        '植物园',
        '动物园',
        '主题公园',
        '郊野公园',
        '城市公园',
        '社区公园',
        '口袋公园',
        '山地公园',
        '湖泊公园',
        '河流公园',
        '海滨公园',
        '湿地',
        '森林',
        '草原',
        '沙漠',
        '湖泊',
        '河流',
        '海洋',
        '景区',
        '风景区',
        '度假区',
        '生态园',
        '生态公园',
        '风景园',
        '园林',
        '花园',
        '游乐园',
        '乐园',
        '度假村',
        '文化园',
        '科技园',
        '农业园',
        '观光园',
        '采摘园',
        '庄园',
        '生态湿地',
        '自然公园',
        '郊野公园',
        '风景林场',
        '自然林场',
        '生态林场',
        '防护林场',
        '城市森林',
        '城市湿地',
        '城市绿道',
        '国家湿地',
        '国家森林',
        '国家草原',
        '国家沙漠',
        '国家海洋',
        '国家风景',
        '国家自然',
        '省级湿地',
        '省级森林',
        '省级草原',
        '省级沙漠',
        '省级海洋',
        '省级风景',
        '省级自然',
      ].sort((a, b) => b.length - a.length); // 按长度降序排列

      // 检查中文部分的类型，记录出现次数
      for (const keyword of chineseKeywords) {
        if (fullChinese.includes(keyword)) {
          if (potaChineseTypes.has(keyword)) {
            potaChineseTypes.set(keyword, potaChineseTypes.get(keyword) + 1);
          } else {
            potaChineseTypes.set(keyword, 1);
          }
        }
      }

      // 提取英文部分的类型
      const englishPart = name.replace(
        /[\u4e00-\u9fff\u3400-\u4dbf\u{20000}-\u{2a6df}\u{2a700}-\u{2b73f}\u{2b740}-\u{2b81f}\u{2b820}-\u{2ceaf}\uf900-\ufaff\u3300-\u33ff\ufe30-\ufe4f\uf900-\ufaff\u{2f800}-\u{2fa1f}]+/gu,
        ''
      );

      // 也检查一些复合英文类型
      const potentialEnglishTypes = [
        'Park',
        'Reserve',
        'Forest',
        'Wetland',
        'Geopark',
        'Botanical',
        'Gardens',
        'Marine',
        'National Park',
        'National Forest',
        'National Wetland',
        'National Marine',
        'National Reserve',
        'Regional Park',
        'Regional Reserve',
        'Provincial Park',
        'Provincial Reserve',
        'State Park',
        'State Forest',
        'State Reserve',
        'Wildlife Reserve',
        'Nature Reserve',
        'Natural Area',
        'Protected Area',
        'Scenic Area',
        'Historical Park',
        'Archaeological Park',
        'Botanical Gardens',
        'Coastal Park',
        'Coastal & Marine',
        'Mountain Park',
        'Lakeshore',
        'Wild & Scenic River',
        'Wildlife Refuge',
        'Conservation Area',
        'Landscape Reserve',
      ];

      for (const type of potentialEnglishTypes) {
        if (name.includes(type)) {
          potaEnglishTypes.add(type);
        }
      }

      parkAnalysis.push({
        reference: park.reference,
        originalName: name,
        chinesePart: fullChinese,
        detectedChineseType: chineseKeywords.find((kw) => fullChinese.includes(kw)) || null,
        englishPart: englishPart.trim(),
      });
    }

    // 分析 POTA 中有但系统中没有的类型
    const potaChineseTypesArray = Array.from(potaChineseTypes.keys()).sort();
    const systemChineseTypesArray = Array.from(systemChineseTypes).sort();
    const potaEnglishTypesArray = Array.from(potaEnglishTypes).sort();
    const systemEnglishTypesArray = Array.from(systemEnglishTypes).sort();

    // 智能匹配：考虑语义相似的类型
    const missingChineseTypes = potaChineseTypesArray.filter((type) => {
      // 检查是否与系统中的类型匹配
      if (systemChineseTypesArray.includes(type)) {
        return false;
      }

      // 检查是否存在语义上的匹配，例如：
      // '国家森林' 与 '国家森林公园' ('国家森林公园' 包含 '国家森林')
      // '国家湿地' 与 '国家湿地公园' ('国家湿地公园' 包含 '国家湿地')
      for (const systemType of systemChineseTypesArray) {
        if (systemType.includes(type) || type.includes(systemType)) {
          return false;
        }
      }

      return true;
    });

    const missingEnglishTypes = potaEnglishTypesArray.filter(
      (type) =>
        !systemEnglishTypesArray.includes(type) &&
        !systemEnglishTypesArray.some(
          (sysType) =>
            sysType.toLowerCase().includes(type.toLowerCase()) ||
            type.toLowerCase().includes(sysType.toLowerCase())
        )
    );

    // 创建输出目录
    const outputDir = path.resolve(__dirname, '../../output');
    await fs.mkdir(outputDir, { recursive: true });

    // 准备输出结果
    const result = {
      summary: {
        totalParks: potaParks.length,
        potaChineseTypesCount: potaChineseTypesArray.length,
        systemChineseTypesCount: systemChineseTypesArray.length,
        potaEnglishTypesCount: potaEnglishTypesArray.length,
        systemEnglishTypesCount: systemEnglishTypesArray.length,
        missingChineseTypesCount: missingChineseTypes.length,
        missingEnglishTypesCount: missingEnglishTypes.length,
      },
      systemTypes: {
        chinese: Array.from(systemChineseTypes).sort(),
        english: Array.from(systemEnglishTypes).sort(),
      },
      missingChineseTypes: {
        count: missingChineseTypes.length,
        types: missingChineseTypes,
        frequency: missingChineseTypes.reduce((obj, type) => {
          obj[type] = potaChineseTypes.get(type) || 0;
          return obj;
        }, {}),
      },
      missingEnglishTypes: {
        count: missingEnglishTypes.length,
        types: missingEnglishTypes,
      },
      potaChineseTypes: {
        count: potaChineseTypesArray.length,
        types: potaChineseTypesArray,
        frequencies: Object.fromEntries(potaChineseTypes),
      },
      systemChineseTypes: {
        count: systemChineseTypesArray.length,
        types: systemChineseTypesArray,
      },
      potaEnglishTypes: {
        count: potaEnglishTypesArray.length,
        types: potaEnglishTypesArray,
      },
      systemEnglishTypes: {
        count: systemEnglishTypesArray.length,
        types: systemEnglishTypesArray,
      },
      sampleParks: parkAnalysis.slice(0, 50), // 前50个公园作为示例
    };

    // 写入结果到文件
    const outputPath = path.join(outputDir, 'reanalyze-pota-types-with-new-data.json');
    await fs.writeFile(outputPath, JSON.stringify(result, null, 2), 'utf8');

    // 创建一个简明的文本报告
    const textReportPath = path.join(outputDir, 'reanalyze-pota-types-with-new-data-summary.txt');
    let textReport = 'POTA 公园类型重新分析报告 (包含最新系统类型)\n';
    textReport += '='.repeat(60) + '\n\n';
    textReport += `📊 总体概况:\n`;
    textReport += `   POTA 公园总数: ${result.summary.totalParks}\n`;
    textReport += `   POTA 中文类型数: ${result.summary.potaChineseTypesCount}\n`;
    textReport += `   系统中文类型数: ${result.summary.systemChineseTypesCount}\n`;
    textReport += `   POTA 英文类型数: ${result.summary.potaEnglishTypesCount}\n`;
    textReport += `   系统英文类型数: ${result.summary.systemEnglishTypesCount}\n\n`;

    textReport += `🔍 系统仍缺失的中文类型 (${result.missingChineseTypes.count} 种):\n`;
    result.missingChineseTypes.types.forEach((type, index) => {
      const count = result.missingChineseTypes.frequency[type] || 0;
      textReport += `   ${index + 1}. ${type} (${count} 个公园)\n`;
    });

    textReport += `\n📝 系统仍缺失的英文类型 (${result.missingEnglishTypes.count} 种):\n`;
    result.missingEnglishTypes.types.forEach((type, index) => {
      textReport += `   ${index + 1}. ${type}\n`;
    });

    textReport += `\n🏆 最常见的缺失中文类型:\n`;
    const sortedMissingTypes = Object.entries(result.missingChineseTypes.frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);

    sortedMissingTypes.forEach(([type, count], index) => {
      textReport += `   ${index + 1}. ${type}: ${count} 个公园\n`;
    });

    textReport += `\n📋 系统中现有的中文类型:\n`;
    result.systemTypes.chinese.forEach((type, index) => {
      textReport += `   ${index + 1}. ${type}\n`;
    });

    await fs.writeFile(textReportPath, textReport, 'utf8');

    console.log('✅ 结合最新系统类型重新分析 POTA 数据完成!');
    console.log(`📄 详细结果已保存到: ${outputPath}`);
    console.log(`📄 简明报告已保存到: ${textReportPath}`);
    console.log(`📈 统计信息:`);
    console.log(`   - POTA 公园总数: ${result.summary.totalParks}`);
    console.log(`   - 缺失中文类型: ${result.missingChineseTypes.count} 种`);
    console.log(`   - 缺失英文类型: ${result.missingEnglishTypes.count} 种`);

    // 输出一些关键发现
    console.log('\n🔍 关键发现:');
    if (result.missingChineseTypes.types.length === 0) {
      console.log('   - 恭喜！目前没有发现系统缺失的中文公园类型');
    } else {
      console.log(`   - 仍存在 ${result.missingChineseTypes.types.length} 个中文类型需要添加`);
    }

    if (result.missingEnglishTypes.types.length === 0) {
      console.log('   - 恭喜！目前没有发现系统缺失的英文公园类型');
    } else {
      console.log(`   - 仍存在 ${result.missingEnglishTypes.types.length} 个英文类型需要添加`);
    }
  } catch (error) {
    console.error('❌ 分析过程中出错:', error);
  }
}

// 运行分析
reanalyzePotaTypesWithNewData();
