// 简单的 API 测试脚本
import fetch from 'node-fetch';

const PORT = process.env.PORT || 3101;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// 测试基本接口
async function testBasicEndpoints() {
  console.warn('🧪 测试基础接口...');

  try {
    // 测试根路径
    console.warn('1. 测试根路径...');
    const rootResponse = await fetch(`${BASE_URL}/`);
    const rootData = await rootResponse.json();
    console.warn('✅ 根路径响应:', rootData);

    // 测试健康检查
    console.warn('2. 测试健康检查...');
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthResponse.json();
    console.warn('✅ 健康检查响应:', healthData);

    // 测试省份列表
    console.warn('3. 测试省份列表...');
    const provincesResponse = await fetch(`${BASE_URL}/api/provinces`);
    const provincesData = await provincesResponse.json();
    console.warn('✅ 省份列表响应:', {
      count: provincesData.provinces?.length || 0,
      firstProvince: provincesData.provinces?.[0],
    });

    console.warn('🎉 基础接口测试完成！');
  } catch (error) {
    console.error('❌ 基础接口测试失败:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.warn('💡 提示: 服务器可能未启动，请先运行: pnpm dev');
    }
  }
}

// 测试用户注册
async function testUserRegistration() {
  console.warn('1. 测试用户注册...');
  const registerResponse = await fetch(`${BASE_URL}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@example.com',
      callsign: 'BG0TEST',
      password: 'test123456',
    }),
  });

  if (registerResponse.ok) {
    const registerData = await registerResponse.json();
    console.warn('✅ 用户注册成功:', {
      message: registerData.message,
      userId: registerData.user?.id,
      role: registerData.user?.role,
    });
    return registerData.token;
  } else {
    const errorData = await registerResponse.json();
    console.warn('❌ 用户注册失败:', errorData);
    return null;
  }
}

// 测试用户登录
async function testUserLogin() {
  console.warn('2. 测试用户登录...');
  const loginResponse = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'test@example.com',
      password: 'test123456',
    }),
  });

  if (loginResponse.ok) {
    const loginData = await loginResponse.json();
    console.warn('✅ 用户登录成功:', {
      message: loginData.message,
      userId: loginData.user?.id,
    });
  }
}

// 测试获取用户信息
async function testUserInfo(token) {
  console.warn('3. 测试获取用户信息...');
  const userInfoResponse = await fetch(`${BASE_URL}/api/user-info`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (userInfoResponse.ok) {
    const userInfoData = await userInfoResponse.json();
    console.warn('✅ 获取用户信息成功:', {
      email: userInfoData.user?.email,
      callsign: userInfoData.user?.callsign,
      role: userInfoData.user?.role,
    });
  }
}

// 测试提交公园申请
async function testParkApplication(token) {
  console.warn('4. 测试提交公园申请...');
  const applicationResponse = await fetch(`${BASE_URL}/api/park-applications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      park_name: '测试公园',
      park_type: '测试类型',
      provinces: ['CN-GD'], // 省份数组
      latitude: 22.5211,
      longitude: 113.3823,
      access_methods: [{ zh: '汽车', en: 'Vehicle' }],
      activation_methods: [{ zh: '步行', en: 'Foot' }],
      confirmed_authenticity: true,
    }),
  });

  if (applicationResponse.ok) {
    const applicationData = await applicationResponse.json();
    console.warn('✅ 提交公园申请成功:', {
      message: applicationData.message,
      applicationId: applicationData.application?.id,
      status: applicationData.application?.status,
    });
  }
}

// 测试需要数据库的接口（需要先初始化数据库）
async function testDatabaseEndpoints() {
  console.warn('🧪 测试需要数据库的接口...');

  try {
    const token = await testUserRegistration();
    if (!token) {
      return;
    }

    await testUserLogin();
    await testUserInfo(token);
    await testParkApplication(token);
  } catch (error) {
    console.error('❌ 数据库接口测试失败:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.warn('💡 提示: 服务器可能未启动');
    }
  }
}

// 运行测试
async function runTests() {
  console.warn('🚀 开始 API 测试...');
  console.warn('📍 服务器地址:', BASE_URL);
  console.warn('');

  await testBasicEndpoints();
  console.warn('');
  await testDatabaseEndpoints();

  console.warn('');
  console.warn('✨ 测试完成！');
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { testBasicEndpoints, testDatabaseEndpoints, runTests };
