import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd())

  // 后端端口：优先使用前端环境变量，默认与根目录 .env 的 PORT=3101 对齐
  const backendPort = env.VITE_BACKEND_PORT || '3101'
  const backendTarget = `http://localhost:${backendPort}`

  return {
    plugins: [react()],
    server: {
      // 让前端用同域 /api 调用后端（避免 CORS，并支持 curl 直接打到 Vite 端口）
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true
        },
        // 开发环境: 将 /proxy-api/* 代理到后端,由后端动态代理处理外部服务
        '/proxy-api': {
          target: backendTarget,
          changeOrigin: true
        }
      }
    },
    // 确保所有路由都返回 index.html，支持 SPA 刷新
    build: {
      rollupOptions: {
        output: {
          manualChunks: undefined
        }
      }
    }
  }
})
