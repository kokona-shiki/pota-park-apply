import { createProxyMiddleware } from 'http-proxy-middleware';

/**
 * 根据环境变量获取地图服务提供商
 * @returns {string} 地图服务提供商 (osm, amap, baidu)
 */
const getMapProvider = () => {
  return process.env.MAP_PROVIDER || 'osm'; // 默认 OSM
};

/**
 * 代理配置
 * 所有外部服务请求统一通过此配置代理
 */
const proxyConfigs = {
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
        headers: {
          'User-Agent': 'POTA-Park-Apply/1.0',
          'Accept': 'application/json',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        },
        onProxyReq: (proxyReq) => {
          proxyReq.setHeader('Connection', 'keep-alive');
        }
      }
    },
    {
      key: 'osm-tiles',
      path: '/proxy-api/tiles/osm',
      target: 'https://{s}.tile.openstreetmap.org',
      options: {
        timeout: 30000,
        proxyTimeout: 30000,
        secure: true,
        changeOrigin: true
      }
    }
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
        headers: {
          'User-Agent': 'POTA-Park-Apply/1.0',
          'Accept': 'application/json'
        }
      }
    },
    {
      key: 'amap-tiles',
      path: '/proxy-api/tiles/amap',
      target: 'https://webrd0{s}.is.autonavi.com',
      options: {
        timeout: 30000,
        proxyTimeout: 30000,
        secure: true,
        changeOrigin: true
      }
    }
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
        changeOrigin: true
      }
    }
  ]
};

/**
 * 初始化代理中间件
 * @param {object} app - Express 应用实例
 * @returns {Array} 已配置的代理列表
 */
const initProxies = (app) => {
  const provider = getMapProvider();
  const configs = [
    ...proxyConfigs[provider] || [],
    ...proxyConfigs.pota // POTA API 始终启用
  ];

  configs.forEach(config => {
    const { path, target, options, key } = config;

    // POTA API 不需要路径重写,其他服务需要
    const shouldRewritePath = key !== 'pota-api';

    const proxyOptions = {
      target,
      changeOrigin: true,
      secure: true,
      ...(shouldRewritePath && {
        pathRewrite: {
          [`^${path}`]: ''
        }
      }),
      onProxyReq: (proxyReq, req, res) => {
        // 确保请求头正确传递
        proxyReq.setHeader('Connection', 'keep-alive');
      },
      onProxyRes: (proxyRes, req, res) => {
        // 添加 CORS 头
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      },
      onError: (err, req, res) => {
        console.error(`[Proxy Error] ${key}:`, err.message);
        console.error(`[Proxy Error Details] Path: ${req.path}, Target: ${target}`);
        if (!res.headersSent) {
          res.status(500).json({
            error: 'Proxy Error',
            message: `Failed to proxy request to ${key}`,
            details: err.message
          });
        }
      },
      ...options
    };

    app.use(path, createProxyMiddleware(proxyOptions));

    console.log(`[Proxy] ${path} → ${target}${shouldRewritePath ? ' (path rewrite)' : ''}`);
  });

  return configs;
};

export { initProxies, getMapProvider };
