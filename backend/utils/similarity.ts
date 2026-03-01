// backend/utils/similarity.ts

/**
 * 计算两个字符串之间的Levenshtein距离
 * @param str1 第一个字符串
 * @param str2 第二个字符串
 * @returns Levenshtein距离
 */
export const levenshteinDistance = (str1: string, str2: string): number => {
  const m = str1.length;
  const n = str2.length;
  
  // 创建二维数组存储距离
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  // 初始化第一行和第一列
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }
  
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }
  
  // 填充表格
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,     // 删除
        dp[i][j - 1] + 1,     // 插入
        dp[i - 1][j - 1] + cost // 替换
      );
    }
  }
  
  return dp[m][n];
};

/**
 * 计算两个字符串的相似度（0-1之间，值越大越相似）
 * @param str1 第一个字符串
 * @param str2 第二个字符串
 * @returns 相似度值（0-1）
 */
export const calculateSimilarity = (str1: string, str2: string): number => {
  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;
  
  // 检查一个字符串是否是另一个的前缀，给予更高的相似度
  const minLength = Math.min(str1.length, str2.length);
  if (str1.substring(0, minLength) === str2.substring(0, minLength)) {
    // 如果一个是另一个的前缀，相似度 = 1 - (长度差 / 较长字符串的长度)
    const lengthDiff = Math.abs(str1.length - str2.length);
    const maxLength = Math.max(str1.length, str2.length);
    return 1 - (lengthDiff / (maxLength * 1.5)); // 降低长度差异的影响
  }
  
  // 检查一个字符串是否包含另一个字符串，给予较高的相似度
  if (str1.includes(str2) || str2.includes(str1)) {
    const containedStr = str1.length < str2.length ? str1 : str2;
    const containingStr = str1.length > str2.length ? str1 : str2;
    // 相似度 = 1 - (长度差 / (较长字符串的长度 * 2))
    const lengthDiff = containingStr.length - containedStr.length;
    return 1 - (lengthDiff / (containingStr.length * 2));
  }
  
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  
  // 相似度 = 1 - (距离 / 最大长度)
  return 1 - distance / maxLength;
};

/**
 * 检查两个字符串是否相似（相似度大于等于阈值）
 * @param str1 第一个字符串
 * @param str2 第二个字符串
 * @param threshold 相似度阈值（默认0.7）
 * @returns 是否相似
 */
export const isSimilar = (str1: string, str2: string, threshold: number = 0.7): boolean => {
  const similarity = calculateSimilarity(str1, str2);
  return similarity >= threshold;
};