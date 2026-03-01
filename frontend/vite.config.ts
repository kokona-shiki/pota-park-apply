import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd())

  // 后端端口：优先使用前端环境变量，默认与根目录 .env 的 PORT=3101 对齐
  const backendPort = env.VITE_BACKEND_PORT || '3101'
  const backendTarget = `http://localhost:${backendPort}`

  // NOTE:
  // `@vitejs/plugin-react` 在开发时会往 `index.html` 注入一个“内联 preamble 脚本”以启用 React Refresh。
  // 若 CSP 使用 `script-src 'self'` 禁止内联脚本，会导致浏览器报：
  // "@vitejs/plugin-react can't detect preamble"。
  // 因此：开发环境放宽 `script-src`；生产环境的 CSP 建议由反代/部署平台统一下发。
  const csp =
    mode === 'development'
      ? "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss: http://localhost:*; img-src 'self' data: blob: https://s3.amazonaws.com https://cdn-bio.qrz.com; style-src 'self' 'unsafe-inline'; font-src 'self' data:; form-action 'self'"
      : "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self'; connect-src 'self' ws: wss: http://localhost:*; img-src 'self' data: blob: https://s3.amazonaws.com https://cdn-bio.qrz.com; style-src 'self' 'unsafe-inline'; font-src 'self' data:; form-action 'self'"

  return {
    plugins: [react()],
    server: {
      headers: {
        'Content-Security-Policy': csp,
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer'
      },
      fs: {
        allow: ['..']
      },

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
