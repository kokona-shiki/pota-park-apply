import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 让前端用同域 /api 调用后端（避免 CORS，并支持 curl 直接打到 Vite 端口）
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      // 通过同源代理转发到 api.pota.app，避免浏览器 CORS（Authorization header 会触发预检）
      '/pota-api': {
        target: 'https://api.pota.app',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/pota-api/, '')
      }
    }
  }
})
