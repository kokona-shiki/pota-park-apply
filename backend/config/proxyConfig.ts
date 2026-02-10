import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { Express } from 'express';

/**
 * 根据环境变量获取地图服务提供商
 * @returns {string} 地图服务提供商 (osm, amap, baidu)
 */
const getMapProvider = (): string => {
  return process.env.MAP_PROVIDER || 'osm'; // 默认 OSM
};

// 定义代理配置接口
interface ProxyConfig {
  key: string;
  path: string;
  target: string;
  options: Options & {
    onProxyReq?: (proxyReq: import('http').ClientRequest) => void;
    onProxyRes?: (proxyRes: import('http').IncomingMessage) => void;
  };
}

// 定义代理配置映射类型
interface ProxyConfigMap {
  [key: string]: ProxyConfig[];
}

/**
 * 代理配置
 * 所有外部服务请求统一通过此配置代理
 */
const proxyConfigs: ProxyConfigMap = {
  // OpenStreetMap
  osm: [
    {
      key: 'osm-geocoding',
      path: '/proxy-api/geocoding/osm',
      target: 'https://nominatim.openstreetmap.org',
      options: {
        timeout: 30000,
        proxyTimeout: 30000,
        secure: true,
        changeOrigin: true,
        pathRewrite: {
          '^/proxy-api/geocoding/osm': '',
        },
        headers: {
          'User-Agent': 'POTA-Park-Apply/1.0',
          Accept: 'application/json',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
        onProxyReq: (proxyReq) => {
          proxyReq.setHeader('Connection', 'keep-alive');
        },
      },
    },
    {
      key: 'osm-tiles',
      path: '/proxy-api/tiles/osm',

      // NOTE: http-proxy-middleware 不会替换 target 里的 {s} 占位符；
      // 会导致请求落到无效域名并最终 504。
      // 这里用 router 按 (z,x,y) 选择 a/b/c 子域，既兼容 OSM，又保持同源代理（不放开 CSP 外域）。
      target: 'https://a.tile.openstreetmap.org',
      options: {
        timeout: 30000,
        proxyTimeout: 30000,
        secure: true,
        changeOrigin: true,
        pathRewrite: {
          '^/proxy-api/tiles/osm': '',
        },
        router: (req) => {
          try {
            // req.url 形如：/13/6780/3104.png
            const m = String(req.url || '').match(/^\/(\d+)\/(\d+)\/(\d+)\.png/);
            if (!m) return 'https://a.tile.openstreetmap.org';
            const z = Number(m[1]);
            const x = Number(m[2]);
            const y = Number(m[3]);
            const subs = ['a', 'b', 'c'];
            const sub = subs[(z + x + y) % subs.length];
            return `https://${sub}.tile.openstreetmap.org`;
          } catch {
            return 'https://a.tile.openstreetmap.org';
          }
        },
        headers: {
          // OSM 建议设置明确 UA；避免被上游限流/拒绝
          'User-Agent': 'POTA-Park-Apply/1.0',
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        },
      },
    },
  ],

  // 高德地图
  amap: [
    {
      key: 'amap-geocoding',
      path: '/proxy-api/geocoding/amap',
      target: 'https://restapi.amap.com/v3',
      options: {
        timeout: 30000,
        proxyTimeout: 30000,
        secure: true,
        changeOrigin: true,
        pathRewrite: {
          '^/proxy-api/geocoding/amap': '',
        },
        headers: {
          'User-Agent': 'POTA-Park-Apply/1.0',
          Accept: 'application/json',
        },
      },
    },
    {
      key: 'amap-tiles',
      path: '/proxy-api/tiles/amap',
      target: 'https://webrd0{s}.is.autonavi.com',
      options: {
        timeout: 30000,
        proxyTimeout: 30000,
        secure: true,
        changeOrigin: true,
        pathRewrite: {
          '^/proxy-api/tiles/amap': '',
        },
      },
    },
  ],

  // POTA API (所有环境通用)
  pota: [
    {
      key: 'pota-api',
      path: '/proxy-api/pota',
      target: 'https://api.pota.app',
      options: {
        timeout: 30000,
        proxyTimeout: 30000,
        secure: true,
        changeOrigin: true,
      },
    },
  ],
};

/**
 * 初始化代理中间件
 * @param {Express} app - Express 应用实例
 * @returns {ProxyConfig[]} 已配置的代理列表
 */
const initProxies = (app: Express): ProxyConfig[] => {
  const provider = getMapProvider();
  const configs: ProxyConfig[] = [
    ...(proxyConfigs[provider] || []),
    ...proxyConfigs.pota, // POTA API 始终启用
  ];

  configs.forEach((config) => {
    const { path, options, key, target } = config;

    const proxyOptions: Options & {
      onProxyRes?: (proxyRes: import('http').IncomingMessage) => void;
      onError?: (
        err: Error,
        req: import('express').Request,
        res: import('express').Response
      ) => void;
    } = {
      target: target,
      ...options,
      onProxyRes: (proxyRes) => {
        // 添加 CORS 头
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      },
      onError: (err, req, res) => {
        console.error(`[Proxy Error] ${key}:`, err.message);
        console.error(`[Proxy Error Details] Path: ${req.path}`);
        if (!res.headersSent) {
          res.status(500).json({
            error: 'Proxy Error',
            message: `Failed to proxy request to ${key}`,
            details: err.message,
          });
        }
      },
    };

    app.use(path, createProxyMiddleware(proxyOptions));

    console.warn(`[Proxy] ${path} → ${target}`);
  });

  return configs;
};

export { initProxies, getMapProvider };
