import Pinyin from 'pinyin-match';
import parkTypeMappingData from '../assets/park_type_mapping.json';

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

// 模拟修复后的 filterOptions 函数
const filterOptions = (options: typeof PARK_TYPE_OPTIONS, inputValue: string) => {
  if (!inputValue) return options;
  return options.filter((option) => {
    // 修复后的逻辑：直接使用选项本身的中文名称，而不是从英文到中文的映射中获取
    const zh = option.zh;

    // 对输入值进行多种方式的匹配
    try {
      return Pinyin.match(zh, inputValue) !== false;
    } catch {
      // 如果出现异常，回退到基本匹配，但只匹配中文名称
      return zh.toLowerCase().includes(inputValue.toLowerCase());
    }
  });
};

describe('Pinyin Match Functionality', () => {
  test('should match only "国家森林公园" for input "gjslgy"', () => {
    const inputValue = 'gjslgy';
    const results = filterOptions(PARK_TYPE_OPTIONS, inputValue);
    
    // 检查结果中是否只包含"国家森林公园"
    const matchedTypes = results.map(option => option.zh);
    
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
    const matchedTypes = results.map(option => option.zh);
    
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
    const matchedTypes = results.map(option => option.zh);
    expect(matchedTypes).toContain('国家公园');
  });

  test('should not match unrelated options', () => {
    const inputValue = 'gjslgy';
    const results = filterOptions(PARK_TYPE_OPTIONS, inputValue);
    
    // 确保没有匹配到不相关的选项
    const matchedTypes = results.map(option => option.zh);
    
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
    const matchedTypes = results.map(option => option.zh);
    expect(matchedTypes).toContain('国家森林公园');
    expect(results.length).toBe(1);
  });

  test('should match only "国家湿地公园" for input "gjsdgy"', () => {
    const inputValue = 'gjsdgy';
    const results = filterOptions(PARK_TYPE_OPTIONS, inputValue);
    
    // 检查结果中是否只包含"国家湿地公园"
    const matchedTypes = results.map(option => option.zh);
    
    expect(matchedTypes).toContain('国家湿地公园');
    expect(matchedTypes).not.toContain('省级湿地公园');
    
    // 确保只匹配到一个结果
    expect(results.length).toBe(1);
    expect(results[0].zh).toBe('国家湿地公园');
  });
});