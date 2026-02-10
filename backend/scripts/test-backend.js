import { spawn } from 'child_process';
import { testBasicEndpoints } from '../test/test-api.js';

console.warn('🚀 启动后端服务器测试...');

// 启动服务器
const server = spawn('pnpm', ['dev'], {
  stdio: 'pipe',
  shell: true
});

let serverStarted = false;

// 监听服务器输出
server.stdout.on('data', (data) => {
  const output = data.toString();
  console.warn('📝 服务器输出:', output.trim());
  
  // 检查服务器是否已启动
  if (output.includes('running on port') && !serverStarted) {
    serverStarted = true;
    console.warn('✅ 服务器已启动，开始测试接口...');
    
    // 等待1秒后开始测试
    setTimeout(async () => {
      await testBasicEndpoints();
      
      console.warn('\n🎉 测试完成！');
      console.warn('💡 要继续运行服务器，请使用: pnpm dev');
      console.warn('💡 要初始化数据库，请使用: pnpm init-db');
      
      // 关闭测试服务器
      server.kill('SIGTERM');
    }, 1000);
  }
});

server.stderr.on('data', (data) => {
  console.error('❌ 服务器错误:', data.toString());
});

server.on('close', (code) => {
  if (!serverStarted) {
    console.warn('❌ 服务器启动失败，退出代码:', code);
    console.warn('💡 请检查环境配置或依赖安装');
  }
});

// 10秒后超时
setTimeout(() => {
  if (!serverStarted) {
    console.warn('⏰ 服务器启动超时');
    server.kill('SIGTERM');
  }
}, 10000);