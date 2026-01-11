// src/pages/AddPark.jsx
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Alert,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Autocomplete,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { SelectChangeEvent } from '@mui/material/Select';
import parkTypeMappingData from '../assets/park_type_mapping.json';
import { MapContainer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { UnifiedTileLayer } from '../components/UnifiedTileLayer';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { getApiErrorMessage } from '../utils/error';
import { ServiceFactory } from '../services/ServiceFactory';
import L from 'leaflet';
import regionData from '../assets/region.json';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import icon from 'leaflet/dist/images/marker-icon.png';
import shadow from 'leaflet/dist/images/marker-shadow.png';
import {
  mapAccessMethods,
  mapActivationMethods,
  mapLocationToProvince,
  mapAccessMethodsWithBothLangs,
  mapActivationMethodsWithBothLangs,
  parseOSMDisplayName,
  getProvinceCodeFromNames,
} from '../utils/potaMapping';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl: icon,
  shadowUrl: shadow,
});

// 创建选中状态的 marker 图标 - 更大尺寸
const selectedIcon = new L.Icon({
  iconRetinaUrl: iconRetina,
  iconUrl: icon,
  shadowUrl: shadow,
  iconSize: [35, 57],
  iconAnchor: [17, 57],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// 创建未选中状态的 marker 图标 - 正常尺寸
const normalIcon = new L.Icon({
  iconRetinaUrl: iconRetina,
  iconUrl: icon,
  shadowUrl: shadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type Province = { name: string; code: string };

type PotaLookupItem = {
  type: string;
  id: number;
  display: string;
  value: string;
};

type PotaParkInfo = {
  parkId: number;
  reference: string;
  name: string;
  latitude: number;
  longitude: number;
  grid4: string;
  grid6: string;
  parktypeId: number;
  active: number;
  parkComments: string;
  accessibility: string | null;
  sensitivity: string | null;
  accessMethods: string;
  activationMethods: string;
  agencies: string | null;
  agencyURLs: string | null;
  parkURLs: string | null;
  website: string;
  createdByAdmin: string;
  parktypeDesc: string;
  locationDesc: string;
  locationName: string;
  entityId: number;
  entityName: string;
  referencePrefix: string;
  entityDeleted: number;
};

type MapPOI = {
  id: number;
  name: string;
  displayName: string;
  province: string;
  city: string;
  lat: number;
  lon: number;
};

type LatLngTuple = [number, number];

const PARK_TYPE_MAPPING = parkTypeMappingData as {
  chinese_to_english: Array<{ chineseName: string; englishName: string }>;
  english_to_chinese: Array<{ englishName: string; chineseNames: string[] }>;
};

const PARK_TYPE_OPTIONS = PARK_TYPE_MAPPING.chinese_to_english.map(
  ({ chineseName: zh, englishName: en }) => ({
    zh,
    en,
  })
);

// 地图边界控制器组件
function MapBoundsController({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, bounds]);

  return null;
}

function MapController({
  center,
  onZoomChange,
}: {
  center: LatLngTuple;
  onZoomChange: (zoom: number) => void;
}) {
  const map = useMap();
  const lat = center[0];
  const lon = center[1];

  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 0);
    return () => clearTimeout(t);
  }, [map]);

  useEffect(() => {
    // 只有当中心点真正改变时才移动地图
    if (lat !== map.getCenter().lat || lon !== map.getCenter().lng) {
      map.setView([lat, lon]);
    }
  }, [map, lat, lon]);

  // 监听缩放变化
  useEffect(() => {
    const handleZoomEnd = () => {
      onZoomChange(map.getZoom());
    };
    map.on('zoomend', handleZoomEnd);
    return () => {
      map.off('zoomend', handleZoomEnd);
    };
  }, [map, onZoomChange]);

  return null;
}

function AddPark() {
  // 从 localStorage 加载保存的表单状态
  const loadSavedState = () => {
    try {
      const saved = localStorage.getItem('addParkFormData');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  const savedState = loadSavedState();

  // 系统只处理中国申请
  const [parkName, setParkName] = useState(savedState?.parkName || '');
  const [parkType, setParkType] = useState(savedState?.parkType || '');
  const [province, setProvince] = useState(savedState?.province || '');

  // 表单显示用字符串；地图计算用 number
  const [latitude, setLatitude] = useState(savedState?.latitude || '');
  const [longitude, setLongitude] = useState(savedState?.longitude || '');

  const [website, setWebsite] = useState(savedState?.website || '');
  const [accessMethods, setAccessMethods] = useState<string[]>(
    savedState?.accessMethods || ['汽车', '步行', '其他']
  );
  const [activationMethods, setActivationMethods] = useState<string[]>(
    savedState?.activationMethods || ['步行', '车载', '其他']
  );
  const [confirmed, setConfirmed] = useState(savedState?.confirmed || false);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isPotaPark, setIsPotaPark] = useState(savedState?.isPotaPark || false);

  // 地图搜索相关的状态
  const [mapPOIs, setMapPOIs] = useState<MapPOI[]>([]);
  const [selectedPOIId, setSelectedPOIId] = useState<number | null>(null);

  const [searchingPota, setSearchingPota] = useState(false);
  const [searchingMap, setSearchingMap] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [potaParks, setPotaParks] = useState<Map<number, PotaParkInfo>>(new Map());

  const provinces = useMemo(() => regionData as Province[], []);

  const [mapCenter, setMapCenter] = useState<LatLngTuple>(
    savedState?.mapCenter || [39.9042, 116.4074]
  ); // 北京
  const [mapZoom, setMapZoom] = useState(savedState?.mapZoom || 13);
  const submitRequestRef = useRef(false);
  const navigate = useNavigate();

  // 保存表单状态到 localStorage
  const saveFormState = useCallback(() => {
    const stateToSave = {
      parkName,
      parkType,
      province,
      latitude,
      longitude,
      website,
      accessMethods,
      activationMethods,
      confirmed,
      isPotaPark,
      mapCenter,
      mapZoom,
    };
    localStorage.setItem('addParkFormData', JSON.stringify(stateToSave));
  }, [
    accessMethods,
    activationMethods,
    confirmed,
    isPotaPark,
    latitude,
    longitude,
    mapCenter,
    mapZoom,
    parkName,
    parkType,
    province,
    website,
  ]);

  // 清除保存的表单状态
  const clearFormState = () => {
    localStorage.removeItem('addParkFormData');
  };

  // 监听状态变化并保存
  useEffect(() => {
    saveFormState();
  }, [saveFormState]);

  const handleSearchPOTA = async () => {
    if (!parkName.trim()) {
      setError('请输入公园名称');
      return;
    }

    setError(null);
    setSearchingPota(true);
    setSearchResults([]);
    setMapPOIs([]);

    try {
      // 第一步：搜索公园列表
      const searchRes = await axios.get<PotaLookupItem[]>(
        `/proxy-api/pota/lookup?search=${encodeURIComponent(parkName)}`,
        { timeout: 5000 } // 5秒超时
      );

      if (searchRes.data.length === 0) {
        setError('未找到匹配的 POTA 公园');
        return;
      }

      // 第二步：获取所有公园的详细信息
      const parksInfo = await Promise.all(
        searchRes.data.map(async (item) => {
          try {
            const parkRes = await axios.get<PotaParkInfo>(
              `/proxy-api/pota/park/${encodeURIComponent(item.value)}`,
              { timeout: 5000 }
            );
            return parkRes.data;
          } catch (err) {
            console.error(`Failed to fetch park ${item.value}:`, err);
            return null;
          }
        })
      );

      const validParks = parksInfo.filter((park): park is PotaParkInfo => park !== null);

      if (validParks.length === 0) {
        setError('未获取到有效的 POTA 公园信息');
        return;
      }

      // 存储公园信息到 Map
      const parksMap = new Map<number, PotaParkInfo>();
      validParks.forEach((park) => parksMap.set(park.parkId, park));
      setPotaParks(parksMap);

      // 转换为 MapPOI 格式
      const pois: MapPOI[] = validParks.map((park) => {
        const province = mapLocationToProvince(park.locationDesc);
        const provinceName =
          Object.entries({
            '11': '北京',
            '12': '天津',
            '13': '河北',
            '14': '山西',
            '15': '内蒙古',
            '21': '辽宁',
            '22': '吉林',
            '23': '黑龙江',
            '31': '上海',
            '32': '江苏',
            '33': '浙江',
            '34': '安徽',
            '35': '福建',
            '36': '江西',
            '37': '山东',
            '41': '河南',
            '42': '湖北',
            '43': '湖南',
            '44': '广东',
            '45': '广西',
            '46': '海南',
            '50': '重庆',
            '51': '四川',
            '52': '贵州',
            '53': '云南',
            '54': '西藏',
            '61': '陕西',
            '62': '甘肃',
            '63': '青海',
            '64': '宁夏',
            '65': '新疆',
          }).find(([code]) => code === province)?.[1] || '';

        return {
          id: park.parkId, // 使用真正的 parkId 作为唯一标识
          name: park.name,
          displayName: park.name,
          province: provinceName,
          city: '',
          lat: park.latitude,
          lon: park.longitude,
        };
      });

      setMapPOIs(pois);
    } catch (err: unknown) {
      console.error(err);
      const code = (err as { code?: unknown })?.code;
      if (code === 'ECONNABORTED') {
        setError('搜索 POTA 超时，请检查网络后重试');
      } else {
        setError('搜索 POTA 失败，请检查网络后重试');
      }
    } finally {
      setSearchingPota(false);
    }
  };

  const handleSearchMap = async () => {
    if (!parkName.trim()) {
      setError('请输入公园名称');
      return;
    }

    setError(null);
    setSearchingMap(true);

    try {
      const mapService = ServiceFactory.createMapService();
      const results = await mapService.geocode(parkName, { limit: 10 });

      if (!results || results.length === 0) {
        setError('未找到匹配的地点');
        setMapPOIs([]);
        setSelectedPOIId(null);
        return;
      }

      // 转换为 MapPOI 类型
      const pois: MapPOI[] = results.map((item, index) => {
        const parsed = parseOSMDisplayName(item.displayName || item.address);
        return {
          id: index, // 使用索引作为 ID，因为 geocode 结果没有 place_id
          name: item.displayName || item.address,
          displayName: item.displayName || item.address,
          province: parsed?.province || '',
          city: parsed?.city || '',
          lat: item.location.latitude,
          lon: item.location.longitude,
        };
      });

      setMapPOIs(pois);
    } catch (err: unknown) {
      console.error(err);
      const code = (err as { code?: unknown })?.code;
      if (code === 'ECONNABORTED') {
        setError('搜索地图超时，请检查网络后重试');
      } else {
        setError('搜索地图失败，请检查网络后重试');
      }
    } finally {
      setSearchingMap(false);
    }
  };

  // 处理 POI 选中
  const handlePOISelect = (poi: MapPOI) => {
    setSelectedPOIId(poi.id);
    setLatitude(String(poi.lat));
    setLongitude(String(poi.lon));

    // 如果是 POTA 公园，填充详细信息
    const parkInfo = potaParks.get(poi.id);
    if (parkInfo) {
      setProvince(mapLocationToProvince(parkInfo.locationDesc));
      setParkName(parkInfo.name);
      setParkType(parkInfo.parktypeDesc);
      setWebsite(parkInfo.website || '');
      setAccessMethods(
        parkInfo.accessMethods ? mapAccessMethods(parkInfo.accessMethods) : ['汽车', '步行', '其他']
      );
      setActivationMethods(
        parkInfo.activationMethods
          ? mapActivationMethods(parkInfo.activationMethods)
          : ['步行', '车载', '其他']
      );
      setIsPotaPark(true);
    } else {
      // 地图 POI，解析省份和城市
      const provinceCode = getProvinceCodeFromNames(poi.province, poi.city);
      if (provinceCode) {
        setProvince(provinceCode);
      }

      // 格式化公园名称: <省份><城市><名称>
      let formattedName: string;
      if (poi.city) {
        formattedName = `${poi.province}${poi.city}${poi.name}`;
      } else {
        formattedName = `${poi.province}${poi.name}`;
      }
      setParkName(formattedName);
      setIsPotaPark(false);
    }

    setMapCenter([poi.lat, poi.lon]);
  };

  const handleSubmit = async () => {
    // 前端必填校验（避免无效请求）
    const name = parkName.trim();
    const type = parkType.trim();
    const prov = province.trim();
    const latNum = Number.parseFloat(String(latitude).trim());
    const lonNum = Number.parseFloat(String(longitude).trim());
    const access = (accessMethods || []).map((s) => String(s).trim()).filter(Boolean);
    const activation = (activationMethods || []).map((s) => String(s).trim()).filter(Boolean);

    if (!name) {
      setError('请填写公园名称');
      return;
    }
    if (!type) {
      setError('请选择公园类型');
      return;
    }
    if (!prov) {
      setError('请选择省份');
      return;
    }
    if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
      setError('请填写有效的经纬度');
      return;
    }
    if (latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
      setError('经纬度超出范围（纬度 -90～90，经度 -180～180）');
      return;
    }
    if (access.length === 0) {
      setError('请选择至少一个访问方法');
      return;
    }
    if (activation.length === 0) {
      setError('请选择至少一个激活方法');
      return;
    }
    if (!confirmed) {
      setError('请勾选确认公园真实性');
      return;
    }

    if (submitRequestRef.current) return;

    submitRequestRef.current = true;
    setSubmitting(true);
    setError(null);

    try {
      await axios.post(
        '/api/park-applications',
        {
          park_name: parkName,
          park_type: parkType,
          province_iso_code: province,
          latitude,
          longitude,
          website,
          access_methods: mapAccessMethodsWithBothLangs(accessMethods),
          activation_methods: mapActivationMethodsWithBothLangs(activationMethods),
          confirmed_authenticity: confirmed,
        },
        { timeout: 5000 }
      ); // 5秒超时

      // 清除保存的表单状态
      clearFormState();

      submitRequestRef.current = false;

      // 跳转到“我的上传”，让用户立刻看到已提交的申请
      navigate('/my-uploads');
    } catch (err: unknown) {
      console.error(err);
      const code = (err as { code?: unknown })?.code;
      if (code === 'ECONNABORTED') {
        setError('提交超时，请检查网络后重试');
      } else {
        setError(getApiErrorMessage(err, '提交失败，请检查网络后重试'));
      }
      submitRequestRef.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        // 如果有地图搜索结果,不允许点击修改位置
        if (isPotaPark || mapPOIs.length > 0) return;
        const lat = e.latlng.lat;
        const lon = e.latlng.lng;
        setLatitude(String(lat));
        setLongitude(String(lon));
        // 移除 setMapCenter 调用，不重置地图中心
      },
    });

    // 显示手动选择的标记（当没有地图搜索结果时）
    if (mapPOIs.length === 0) {
      const lat = Number.parseFloat(latitude);
      const lon = Number.parseFloat(longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return null;
      }

      return <Marker position={[lat, lon]} />;
    }

    return null;
  };

  // 计算所有 POI 的边界
  const mapBounds = useMemo(() => {
    if (mapPOIs.length === 0) return null;

    const bounds = L.latLngBounds(mapPOIs.map((poi) => [poi.lat, poi.lon] as LatLngTuple));

    return bounds;
  }, [mapPOIs]);

  // 移除自动更新地图中心的效果，让用户通过搜索功能来控制地图中心

  const handleAccessMethodsChange = (e: SelectChangeEvent<string[]>) => {
    const value = e.target.value;
    setAccessMethods(typeof value === 'string' ? value.split(',') : value);
  };

  const handleActivationMethodsChange = (e: SelectChangeEvent<string[]>) => {
    const value = e.target.value;
    setActivationMethods(typeof value === 'string' ? value.split(',') : value);
  };

  return (
    <Box sx={{ display: { xs: 'block', md: 'flex' }, gap: 2 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="h5">申请添加公园</Typography>

        <Collapse in={!!error}>
          <Alert
            severity="error"
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => setError(null)}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
            sx={{ mt: 2 }}
          >
            {error}
          </Alert>
        </Collapse>

        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <TextField
            label="公园名称"
            value={parkName}
            onChange={(e) => setParkName(e.target.value)}
            sx={{ flex: 1 }}
          />

          <FormControl sx={{ minWidth: 200, flex: 1 }}>
            <Autocomplete
              disablePortal
              options={PARK_TYPE_OPTIONS}
              value={PARK_TYPE_OPTIONS.find(option => option.en === parkType) || null}
              onChange={(event, newValue) => {
                setParkType(newValue ? newValue.en : '');
              }}
              disabled={isPotaPark}
              getOptionLabel={(option) => {
                const chineseEntry = PARK_TYPE_MAPPING.english_to_chinese.find(
                  (entry) => entry.englishName === option.en
                );
                const zh = chineseEntry ? chineseEntry.chineseNames[0] : option.zh;
                return `${zh} (${option.en})`;
              }}
              renderInput={(params) => <TextField {...params} label="公园类型" />}
              renderOption={(props, option) => (
                <li {...props}>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography sx={{ fontSize: '0.95rem', fontWeight: 600 }}>
                      {option.zh}
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                      {option.en}
                    </Typography>
                  </Box>
                </li>
              )}
              isOptionEqualToValue={(option, value) => option.en === value.en}
            />
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Button onClick={handleSearchPOTA} disabled={searchingPota}>
            {searchingPota ? '搜索中...' : '搜索 POTA'}
          </Button>
          <Button onClick={handleSearchMap} disabled={searchingMap}>
            {searchingMap ? '搜索中...' : '搜索地图'}
          </Button>
          {(parkName || mapPOIs.length > 0) && (
            <Button
              onClick={() => {
                setParkName('');
                setParkType('');
                setProvince('');
                setLatitude('');
                setLongitude('');
                setWebsite('');
                setAccessMethods(['汽车', '步行', '其他']);
                setActivationMethods(['步行', '车载', '其他']);
                setConfirmed(false);
                setSearchResults([]);
                setMapPOIs([]);
                setSelectedPOIId(null);
                setIsPotaPark(false);
                setError(null);
                setPotaParks(new Map());
                setMapCenter([39.9042, 116.4074]);
                setMapZoom(13);
              }}
              color="secondary"
            >
              清空
            </Button>
          )}
        </Box>

        {mapPOIs.length > 0 && (
          <Box
            sx={{
              mt: 1,
              maxHeight: 250,
              overflowY: 'auto',
              borderRadius: 1,
              backgroundColor: 'background.paper',
              boxShadow: 1,
            }}
          >
            <List dense disablePadding>
              {mapPOIs.map((poi) => (
                <ListItem key={poi.id} disablePadding>
                  <ListItemButton
                    selected={selectedPOIId === poi.id}
                    onClick={() => handlePOISelect(poi)}
                    ref={(ref) => {
                      if (ref && selectedPOIId === poi.id) {
                        ref.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                      }
                    }}
                    sx={{
                      '&.Mui-selected': {
                        backgroundColor: 'action.hover',
                        borderLeft: 4,
                        borderLeftColor: 'primary.main',
                        pl: 1.5,
                        '&:hover': {
                          backgroundColor: 'action.selected',
                        },
                      },
                      '&:not(.Mui-selected):hover': {
                        backgroundColor: 'action.hover',
                      },
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      transition: 'all 0.15s ease-in-out',
                    }}
                  >
                    <ListItemText
                      primary={poi.name || '未命名地点'}
                      secondary={poi.city ? `${poi.province} ${poi.city}` : poi.province}
                      slotProps={{
                        primary: {
                          sx: {
                            fontWeight: selectedPOIId === poi.id ? 700 : 400,
                            fontSize: '0.95rem',
                            color: selectedPOIId === poi.id ? 'primary.main' : 'text.primary',
                          },
                        },
                        secondary: {
                          sx: {
                            fontSize: '0.75rem',
                            fontWeight: selectedPOIId === poi.id ? 500 : 400,
                            color: selectedPOIId === poi.id ? 'primary.main' : 'text.secondary',
                          },
                        },
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {searchResults.length > 0 && mapPOIs.length === 0 && (
          <Box
            sx={{
              mt: 1,
              maxHeight: 200,
              overflowY: 'auto',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              p: 1,
              backgroundColor: 'background.paper',
            }}
          >
            {searchResults.map((result, index) => (
              <Typography
                key={`search-${index}-${result.substring(0, 10)}`}
                sx={{
                  py: 0.5,
                  fontSize: '0.875rem',
                  borderBottom: index < searchResults.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                }}
              >
                {result}
              </Typography>
            ))}
          </Box>
        )}

        <FormControl fullWidth sx={{ mt: 2 }}>
          <Autocomplete
            disablePortal
            options={provinces}
            value={provinces.find(p => p.code === province) || null}
            onChange={(event, newValue) => {
              setProvince(newValue ? newValue.code : '');
            }}
            disabled={isPotaPark}
            getOptionLabel={(option) => `(${option.code}) ${option.name}`}
            renderInput={(params) => <TextField {...params} label="省份" helperText="目前仅支持31个省、直辖市、自治区，不支持港澳台地区" />}
            isOptionEqualToValue={(option, value) => option.code === value.code}
          />
        </FormControl>

        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <TextField
            label="纬度 (WGS84)"
            value={latitude}
            onChange={(e) => {
              setLatitude(e.target.value);
            }}
            disabled={isPotaPark}
            sx={{ flex: 1 }}
          />
          <TextField
            label="经度 (WGS84)"
            value={longitude}
            onChange={(e) => {
              setLongitude(e.target.value);
            }}
            disabled={isPotaPark}
            sx={{ flex: 1 }}
          />
        </Box>

        <TextField
          fullWidth
          label="公园网站"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          disabled={isPotaPark}
          sx={{ mt: 2 }}
        />

        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>访问方法</InputLabel>
          <Select
            multiple
            value={accessMethods}
            label="访问方法"
            onChange={handleAccessMethodsChange}
            disabled={isPotaPark}
          >
            {['汽车', '步行', '船只', '水上飞机/空中出租车', '其他'].map((method) => (
              <MenuItem key={method} value={method}>
                {method}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>激活方法</InputLabel>
          <Select
            multiple
            value={activationMethods}
            label="激活方法"
            onChange={handleActivationMethodsChange}
            disabled={isPotaPark}
          >
            {['步行', '车载', '固定建筑', '露营地', '庇护所', '其他'].map((method) => (
              <MenuItem key={method} value={method}>
                {method}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Checkbox checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          }
          label="我已确认公园真实性"
          sx={{ mt: 2 }}
        />
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || isPotaPark || !confirmed}
          sx={{ mt: 1 }}
          fullWidth
        >
          {submitting ? '提交中...' : isPotaPark ? '已存在 POTA 公园' : '提交审核'}
        </Button>
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, mt: { xs: 2, md: 0 } }}>
        <Box sx={{ height: 500, width: '100%', borderRadius: 1, overflow: 'hidden' }}>
          <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }}>
            <MapController center={mapCenter} onZoomChange={setMapZoom} />
            <MapBoundsController bounds={mapBounds} />
            {/* 使用统一的瓦片服务 */}
            <UnifiedTileLayer />
            <LocationMarker />
            {mapPOIs.map((poi) => (
              <Marker
                key={poi.id}
                position={[poi.lat, poi.lon]}
                icon={selectedPOIId === poi.id ? selectedIcon : normalIcon}
                eventHandlers={{
                  click: () => handlePOISelect(poi),
                }}
              />
            ))}
          </MapContainer>
        </Box>
      </Box>
    </Box>
  );
}

export default AddPark;
