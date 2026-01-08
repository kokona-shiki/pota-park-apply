import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd())

  return {
    plugins: [react()],
    server: {
      // 让前端用同域 /api 调用后端（避免 CORS，并支持 curl 直接打到 Vite 端口）
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true
        },
        // 开发环境: 将 /proxy-api/* 代理到后端,由后端动态代理处理外部服务
        '/proxy-api': {
          target: 'http://localhost:3001',
          changeOrigin: true
        }
      }
    },
    define: {
      // 将环境变量注入到前端代码中
      'import.meta.env.VITE_MAP_PROVIDER': JSON.stringify(env.VITE_MAP_PROVIDER || 'osm')
    }
  }
})
