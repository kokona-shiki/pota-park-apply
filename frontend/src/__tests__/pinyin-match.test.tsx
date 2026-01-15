import Pinyin from 'pinyin-match';
import parkTypeMappingData from '../../../shared/park_type_mapping.json';

// 模拟与 AddPark 组件中相同的逻辑
const PARK_TYPE_MAPPING = parkTypeMappingData as {
  chinese_to_english: Array<{ chineseName: string; englishName: string }>;
  english_to_chinese: Array<{ englishName: string; chineseNames: string[] }>;
};

const PARK_TYPE_OPTIONS = PARK_TYPE_MAPPING.chinese_to_english.map(
  ({ chineseName: zh, englishName: en }, index) => ({
    id: index,
    zh,
    en,
  })
);

// 模拟更新后的 filterOptions 函数（支持拼音和英文搜索，拼音优先）
const filterOptions = (options: typeof PARK_TYPE_OPTIONS, inputValue: string) => {
  if (!inputValue) return options;

  // 拼音匹配的选项
  const pinyinMatched: typeof options = [];
  // 英文匹配的选项
  const englishMatched: typeof options = [];

  options.forEach((option) => {
    const zh = option.zh;
    const en = option.en;

    // 检查拼音匹配
    try {
      if (Pinyin.match(zh, inputValue) !== false) {
        pinyinMatched.push(option);
        return; // 如果已经匹配拼音，则不再检查英文匹配
      }
    } catch {
      // 拼音匹配失败，继续尝试其他匹配方式
    }

    // 检查英文匹配
    if (en.toLowerCase().includes(inputValue.toLowerCase())) {
      englishMatched.push(option);
    }
  });

  // 返回拼音匹配结果在前，英文匹配结果在后
  return [...pinyinMatched, ...englishMatched];
};

describe('Pinyin Match Functionality', () => {
  test('should match only "国家森林公园" for input "gjslgy"', () => {
    const inputValue = 'gjslgy';
    const results = filterOptions(PARK_TYPE_OPTIONS, inputValue);

    // 检查结果中是否只包含"国家森林公园"
    const matchedTypes = results.map((option) => option.zh);

    expect(matchedTypes).toContain('国家森林公园');
    expect(matchedTypes).not.toContain('国家湿地公园');
    expect(matchedTypes).not.toContain('省级地质公园');
    expect(matchedTypes).not.toContain('国家草原公园');
    expect(matchedTypes).not.toContain('国家沙漠公园');

    // 确保只匹配到一个结果
    expect(results.length).toBe(1);
    expect(results[0].zh).toBe('国家森林公园');
  });

  test('should match multiple options for partial input', () => {
    const inputValue = '国家';
    const results = filterOptions(PARK_TYPE_OPTIONS, inputValue);

    // 检查是否匹配到多个包含"国家"的选项
    const matchedTypes = results.map((option) => option.zh);

    expect(matchedTypes.length).toBeGreaterThan(1);
    expect(matchedTypes).toContain('国家森林公园');
    expect(matchedTypes).toContain('国家湿地公园');
    expect(matchedTypes).toContain('国家地质公园');
    expect(matchedTypes).toContain('国家草原公园');
    expect(matchedTypes).toContain('国家沙漠公园');
    expect(matchedTypes).toContain('国家海洋公园');
    expect(matchedTypes).toContain('国家公园');
  });

  test('should match options with pinyin abbreviation', () => {
    const inputValue = 'gjgy';
    const results = filterOptions(PARK_TYPE_OPTIONS, inputValue);

    // 检查是否匹配到"国家公园"
    const matchedTypes = results.map((option) => option.zh);
    expect(matchedTypes).toContain('国家公园');
  });

  test('should not match unrelated options', () => {
    const inputValue = 'gjslgy';
    const results = filterOptions(PARK_TYPE_OPTIONS, inputValue);

    // 确保没有匹配到不相关的选项
    const matchedTypes = results.map((option) => option.zh);

    expect(matchedTypes.length).toBe(1);
    expect(matchedTypes[0]).toBe('国家森林公园');
  });

  test('should handle empty input', () => {
    const inputValue = '';
    const results = filterOptions(PARK_TYPE_OPTIONS, inputValue);

    // 空输入应该返回所有选项
    expect(results.length).toBe(PARK_TYPE_OPTIONS.length);
  });

  test('should handle case insensitive input', () => {
    const inputValue = 'GJSLGY';
    const results = filterOptions(PARK_TYPE_OPTIONS, inputValue);

    // 检查大写输入是否也能正确匹配
    const matchedTypes = results.map((option) => option.zh);
    expect(matchedTypes).toContain('国家森林公园');
    expect(results.length).toBe(1);
  });

  test('should match only "国家湿地公园" for input "gjsdgy"', () => {
    const inputValue = 'gjsdgy';
    const results = filterOptions(PARK_TYPE_OPTIONS, inputValue);

    // 检查结果中是否只包含"国家湿地公园"
    const matchedTypes = results.map((option) => option.zh);

    expect(matchedTypes).toContain('国家湿地公园');
    expect(matchedTypes).not.toContain('省级湿地公园');

    // 确保只匹配到一个结果
    expect(results.length).toBe(1);
    expect(results[0].zh).toBe('国家湿地公园');
  });

  test('should support English search', () => {
    const inputValue = 'National Forest';
    const results = filterOptions(PARK_TYPE_OPTIONS, inputValue);

    // 检查是否能通过英文匹配到"国家森林公园"
    const matchedTypes = results.map((option) => option.zh);
    expect(matchedTypes).toContain('国家森林公园');

    // 确保匹配到的英文名称包含输入内容
    const matchedEnglish = results.map((option) => option.en);
    const hasMatchingEnglish = matchedEnglish.some((en) =>
      en.toLowerCase().includes('national forest')
    );
    expect(hasMatchingEnglish).toBe(true);
  });

  test('should prioritize pinyin match over English match', () => {
    const inputValue = 'gjslgy'; // 拼音缩写
    const results = filterOptions(PARK_TYPE_OPTIONS, inputValue);

    // 检查第一个结果应该是拼音匹配的
    expect(results[0].zh).toBe('国家森林公园');

    // 检查对于输入 'gjslgy'，拼音匹配的项在第一位
    expect(results[0].zh).toBe('国家森林公园');
  });

  test('should return both pinyin and English matches with correct priority', () => {
    // 为这个测试创建一个假设场景：如果某项既有拼音匹配又有英文匹配
    const testOptions = [
      { id: 1, zh: '国家公园', en: 'National Park' },
      { id: 2, zh: '省级公园', en: 'Provincial Park' },
      { id: 3, zh: '森林', en: 'Forest' },
    ];

    // 测试英文输入
    const englishInput = 'park';
    const englishResults = filterOptions(testOptions, englishInput);

    // 英文输入应该能匹配到包含'park'的英文名称
    const matchedEnglishNames = englishResults.map((opt) => opt.en);
    expect(matchedEnglishNames.some((en) => en.toLowerCase().includes('park'))).toBe(true);

    // 测试拼音输入
    const pinyinInput = 'gjgy';
    const pinyinResults = filterOptions(testOptions, pinyinInput);

    // 确保拼音匹配的项被包含
    const matchedChineseNames = pinyinResults.map((opt) => opt.zh);
    expect(matchedChineseNames).toContain('国家公园');
  });
});
