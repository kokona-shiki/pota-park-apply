import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { Express } from 'express';

const getMapProvider = (): string => {
  return process.env.VITE_MAP_PROVIDER || 'osm';
};

interface ProxyConfig {
  key: string;
  path: string;
  target: string;
  options: Options;
}

interface ProxyConfigMap {
  [key: string]: ProxyConfig[];
}

const proxyConfigs: ProxyConfigMap = {
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
        on: {
          proxyReq: (proxyReq) => {
            proxyReq.setHeader('Connection', 'keep-alive');
          },
        },
      },
    },
    {
      key: 'osm-tiles',
      path: '/proxy-api/tiles/osm',
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
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
      },
    },
  ],

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

  tianditu: [
    {
      key: 'tianditu-geocoding',
      path: '/proxy-api/geocoding/tianditu',
      target: 'https://api.tianditu.gov.cn',
      options: {
        timeout: 30000,
        proxyTimeout: 30000,
        secure: true,
        changeOrigin: true,
        pathRewrite: {
          '^/proxy-api/geocoding/tianditu': '',
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          Referer: 'https://map.tianditu.gov.cn/',
        },
        on: {
          proxyReq: (proxyReq, req) => {
            const apiKey = process.env.TIANDITU_API_KEY;
            if (apiKey) {
              const originalUrl = req.url || '';
              const separator = originalUrl.includes('?') ? '&' : '?';
              proxyReq.path = `${proxyReq.path}${separator}tk=${apiKey}`;
            }
          },
        },
      },
    },
    {
      key: 'tianditu-tiles-vec',
      path: '/proxy-api/tiles/tianditu/vec',
      target: 'https://t0.tianditu.gov.cn',
      options: {
        timeout: 30000,
        proxyTimeout: 30000,
        secure: true,
        changeOrigin: true,
        pathRewrite: {
          '^/proxy-api/tiles/tianditu/vec': '',
        },
        router: (req) => {
          try {
            const m = String(req.url || '').match(/^\/(\d+)\/(\d+)\/(\d+)\.png/);
            if (!m) return 'https://t0.tianditu.gov.cn';
            const z = Number(m[1]);
            const x = Number(m[2]);
            const y = Number(m[3]);
            const subs = ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'];
            const sub = subs[(z + x + y) % subs.length];
            return `https://${sub}.tianditu.gov.cn`;
          } catch {
            return 'https://t0.tianditu.gov.cn';
          }
        },
        on: {
          proxyReq: (proxyReq, req) => {
            const apiKey = process.env.TIANDITU_API_KEY;
            const originalUrl = req.url || '';
            const m = originalUrl.match(/^\/(\d+)\/(\d+)\/(\d+)\.png/);
            if (m && apiKey) {
              const z = m[1];
              const x = m[2];
              const y = m[3];
              proxyReq.path = `/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX=${z}&TILEROW=${y}&TILECOL=${x}&tk=${apiKey}`;
            }
          },
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          Referer: 'https://map.tianditu.gov.cn/',
        },
      },
    },
    {
      key: 'tianditu-tiles-cva',
      path: '/proxy-api/tiles/tianditu/cva',
      target: 'https://t0.tianditu.gov.cn',
      options: {
        timeout: 30000,
        proxyTimeout: 30000,
        secure: true,
        changeOrigin: true,
        pathRewrite: {
          '^/proxy-api/tiles/tianditu/cva': '',
        },
        router: (req) => {
          try {
            const m = String(req.url || '').match(/^\/(\d+)\/(\d+)\/(\d+)\.png/);
            if (!m) return 'https://t0.tianditu.gov.cn';
            const z = Number(m[1]);
            const x = Number(m[2]);
            const y = Number(m[3]);
            const subs = ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'];
            const sub = subs[(z + x + y) % subs.length];
            return `https://${sub}.tianditu.gov.cn`;
          } catch {
            return 'https://t0.tianditu.gov.cn';
          }
        },
        on: {
          proxyReq: (proxyReq, req) => {
            const apiKey = process.env.TIANDITU_API_KEY;
            const originalUrl = req.url || '';
            const m = originalUrl.match(/^\/(\d+)\/(\d+)\/(\d+)\.png/);
            if (m && apiKey) {
              const z = m[1];
              const x = m[2];
              const y = m[3];
              proxyReq.path = `/cva_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX=${z}&TILEROW=${y}&TILECOL=${x}&tk=${apiKey}`;
            }
          },
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          Referer: 'https://map.tianditu.gov.cn/',
        },
      },
    },
  ],

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

const initProxies = (app: Express): ProxyConfig[] => {
  const provider = getMapProvider();
  const configs: ProxyConfig[] = [
    ...(proxyConfigs[provider] || []),
    ...proxyConfigs.pota,
  ];

  configs.forEach((config) => {
    const { path, options, key, target } = config;

    const proxyOptions: Options = {
      target: target,
      ...options,
      on: {
        ...(options.on || {}),
        proxyRes: (proxyRes) => {
          proxyRes.headers['Access-Control-Allow-Origin'] = '*';
        },
        error: (err, req, res) => {
          console.error(`[Proxy Error] ${key}:`, err.message);
          const httpRes = res as import('http').ServerResponse;
          if (!httpRes.headersSent) {
            httpRes.writeHead(500, { 'Content-Type': 'application/json' });
            httpRes.end(JSON.stringify({
              error: 'Proxy Error',
              message: `Failed to proxy request to ${key}`,
              details: err.message,
            }));
          }
        },
      },
    };

    app.use(path, createProxyMiddleware(proxyOptions));

    console.warn(`[Proxy] ${path} → ${target}`);
  });

  return configs;
};

export { initProxies, getMapProvider };
