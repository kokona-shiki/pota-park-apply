# 地图服务动态代理配置说明

## 概述

本项目实现了地图服务和地理编码服务的动态代理系统,支持通过环境变量轻松切换不同的地图服务提供商(OSM/高德/百度),解决 CORS 问题并避免污染 Vite 配置文件。

## 架构设计

```
开发环境:
前端 → Vite代理 → 后端代理 → 外部服务
  ↓             ↓         ↓
Vite       Express    ProxyConfig
Config     代理       配置

生产环境:
前端 → 后端代理 → 外部服务
  ↓             ↓
直接请求     Express
           ProxyConfig
```

## 配置方式

### 后端配置

#### 1. 环境变量文件

开发环境 (`backend/.env.development`):
```bash
MAP_PROVIDER=osm
AMAP_API_KEY=your_amap_key
BAIDU_API_KEY=your_baidu_key
```

生产环境 (`backend/.env.production`):
```bash
MAP_PROVIDER=amap
AMAP_API_KEY=your_production_amap_key
```

#### 2. 代理配置文件

位置: `backend/config/proxyConfig.js`

支持的服务提供商:
- `osm` - OpenStreetMap (默认)
- `amap` - 高德地图
- `baidu` - 百度地图 (预留)

### 前端配置

#### 1. 环境变量文件

开发环境 (`frontend/.env.development`):
```bash
VITE_MAP_PROVIDER=osm
```

生产环境 (`frontend/.env.production`):
```bash
VITE_MAP_PROVIDER=amap
```

#### 2. Vite 配置

位置: `frontend/vite.config.ts`

**开发环境**:
- 自动读取环境变量并注入到前端代码中
- `/proxy-api/*` 需要代理到后端 (`http://localhost:3001`)

**生产环境**:
- 前端直接请求后端
- 后端处理所有外部服务代理

## 代理路径

后端自动为以下路径创建代理:

### OpenStreetMap
- `/proxy-api/geocoding/osm` → `https://nominatim.openstreetmap.org`
- `/proxy-api/tiles/osm` → `https://{s}.tile.openstreetmap.org`

### 高德地图
- `/proxy-api/geocoding/amap` → `https://restapi.amap.com/v3`
- `/proxy-api/tiles/amap` → `https://webrd0{s}.is.autonavi.com`

### POTA API (始终启用)
- `/proxy-api/pota` → `https://api.pota.app`

## 使用方式

### 在前端代码中使用

#### 1. 地图瓦片服务

```typescript
import { ServiceFactory } from '../services/ServiceFactory';

const mapService = ServiceFactory.createMapService();
const tileConfig = mapService.getTileConfig();

// 在 Leaflet 中使用
<TileLayer url={tileConfig.url} attribution={tileConfig.attribution} />
```

#### 2. 地理编码服务

```typescript
import { ServiceFactory } from '../services/ServiceFactory';

const geocodingService = ServiceFactory.createGeocodingService();

// 正向地理编码
const results = await geocodingService.geocode('北京市朝阳区', {
  limit: 5,
  language: 'zh-CN'
});

// 反向地理编码
const address = await geocodingService.reverseGeocode({
  latitude: 39.9042,
  longitude: 116.4074
});
```

## 切换服务步骤

### 从 OSM 切换到高德地图

1. **修改后端环境变量** (`backend/.env.production`):
```bash
MAP_PROVIDER=amap
```

2. **修改前端环境变量** (`frontend/.env.production`):
```bash
VITE_MAP_PROVIDER=amap
```

3. **重启服务**:
```bash
# 开发环境
pnpm dev

# 生产环境
pnpm build
pnpm start
```

4. **自动生效**:
   - 前端会自动使用高德服务
   - 后端会自动代理高德 API 请求

## 服务实现

### 已实现

#### OSM 服务
- `frontend/src/services/map/providers/OSMService.ts`
- `frontend/src/services/geocoding/providers/OSMService.ts`

### 预留实现(待完善)

#### 高德服务
- `frontend/src/services/map/providers/AMapService.ts`
- `frontend/src/services/geocoding/providers/AMapService.ts`

需要补充:
- 坐标转换 (WGS84 ↔ GCJ02)
- 高德地理编码 API 调用
- 高德反向地理编码 API 调用

#### 百度服务
- 需要创建 `BaiduMapService.ts` 和 `BaiduGeocodingService.ts`

## 文件结构

```
backend/
├── config/
│   └── proxyConfig.js          # 代理配置
├── .env.development             # 开发环境变量
├── .env.production             # 生产环境变量

frontend/
├── config/
│   └── mapConfig.ts           # 地图配置(读取 env)
├── services/
│   ├── ServiceFactory.ts        # 服务工厂
│   ├── map/
│   │   ├── types.ts           # 类型定义
│   │   ├── IMapService.ts     # 地图服务接口
│   │   └── providers/
│   │       ├── OSMService.ts   # OSM 实现
│   │       └── AMapService.ts  # 高德实现(预留)
│   └── geocoding/
│       ├── types.ts           # 类型定义
│       ├── IGeocodingService.ts  # 地理编码接口
│       └── providers/
│           ├── OSMService.ts   # OSM 实现
│           └── AMapService.ts  # 高德实现(预留)
├── .env.development
├── .env.production
└── vite.config.ts            # Vite 配置
```

## 注意事项

1. **环境变量不提交到 Git**
   - `.env.development` 和 `.env.production` 已在 `.gitignore` 中
   - 生产环境 API Key 应该通过部署平台配置

2. **重启服务生效**
   - 修改环境变量后需要重启服务才能生效
   - Express 运行时无法动态删除已注册的中间件

3. **API Key 管理**
   - 商业服务的 API Key 在环境变量中配置
   - 不同环境可以使用不同的 API Key

4. **错误处理**
   - 代理错误会在后端控制台输出
   - 前端会收到 500 错误响应

## 优势

1. **统一管理**: 所有外部服务代理集中在一个配置文件中
2. **灵活切换**: 修改环境变量即可切换服务
3. **避免 CORS**: 通过后端代理解决跨域问题
4. **配置解耦**: Vite 配置保持简洁
5. **扩展性强**: 添加新服务只需实现接口
6. **类型安全**: TypeScript 接口保证类型正确性

## 未来扩展

如需添加新的地图服务(如百度、腾讯):

1. 后端 `proxyConfig.js` 添加配置
2. 前端创建 Service 实现
3. `ServiceFactory.ts` 添加 case 分支
4. 修改环境变量即可切换
