// src/pages/AddPark.jsx
import { useEffect, useMemo, useState, useRef } from 'react';
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
  ListItemText,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ClearIcon from '@mui/icons-material/Clear';
import type { SelectChangeEvent } from '@mui/material/Select';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
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
  getProvinceCodeFromNames
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
    } catch (e) {
      return null;
    }
  };

  const savedState = loadSavedState();

  const [dxEntity, setDxEntity] = useState(savedState?.dxEntity || 'CN');
  const [parkName, setParkName] = useState(savedState?.parkName || '');
  const [parkType, setParkType] = useState(savedState?.parkType || '');
  const [province, setProvince] = useState(savedState?.province || '');

  // 表单显示用字符串；地图计算用 number
  const [latitude, setLatitude] = useState(savedState?.latitude || '');
  const [longitude, setLongitude] = useState(savedState?.longitude || '');

  const [website, setWebsite] = useState(savedState?.website || '');
  const [accessMethods, setAccessMethods] = useState<string[]>(savedState?.accessMethods || ['汽车', '步行', '其他']);
  const [activationMethods, setActivationMethods] = useState<string[]>(savedState?.activationMethods || ['步行', '车载', '其他']);
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

  const provinces = useMemo(() => regionData as Province[], []);

  const [mapCenter, setMapCenter] = useState<LatLngTuple>(savedState?.mapCenter || [39.9042, 116.4074]); // 北京
  const [mapZoom, setMapZoom] = useState(savedState?.mapZoom || 13);
  const submitRequestRef = useRef(false);

  // 保存表单状态到 localStorage
  const saveFormState = () => {
    const stateToSave = {
      dxEntity,
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
      mapZoom
    };
    localStorage.setItem('addParkFormData', JSON.stringify(stateToSave));
  };

  // 清除保存的表单状态
  const clearFormState = () => {
    localStorage.removeItem('addParkFormData');
  };

  // 监听状态变化并保存
  useEffect(() => {
    saveFormState();
  }, [dxEntity, parkName, parkType, province, latitude, longitude, website, accessMethods, activationMethods, confirmed, isPotaPark, mapCenter, mapZoom]);

  const handleSearchPOTA = async () => {
    if (!parkName.trim()) {
      setError('请输入公园名称');
      return;
    }

    setError(null);
    setSearchingPota(true);

    try {
      // 第一步：搜索公园列表
      const searchRes = await axios.get<PotaLookupItem[]>(
        `/proxy-api/pota/lookup?search=${encodeURIComponent(parkName)}`,
        { timeout: 5000 } // 5秒超时
      );

      if (searchRes.data.length === 0) {
        setSearchResults([]);
        setError('未找到匹配的 POTA 公园');
        return;
      }

      setSearchResults(searchRes.data.map((item) => item.display));

      // 如果只有一个搜索结果，自动填充所有信息并禁用相关字段
      if (searchRes.data.length === 1) {
        const firstPark = searchRes.data[0];
        try {
          const parkRes = await axios.get<PotaParkInfo>(
            `/proxy-api/pota/park/${encodeURIComponent(firstPark.value)}`,
            { timeout: 5000 } // 5秒超时
          );

          const parkInfo = parkRes.data;
          setLatitude(String(parkInfo.latitude));
          setLongitude(String(parkInfo.longitude));
          setMapCenter([parkInfo.latitude, parkInfo.longitude]);

          // 自动填充所有信息
          setParkName(parkInfo.name);
          setParkType(parkInfo.parktypeDesc);
          setProvince(mapLocationToProvince(parkInfo.locationDesc));
          setWebsite(parkInfo.website || '');
          setAccessMethods(parkInfo.accessMethods ? mapAccessMethods(parkInfo.accessMethods) : ['汽车', '步行', '其他']);
          setActivationMethods(parkInfo.activationMethods ? mapActivationMethods(parkInfo.activationMethods) : ['步行', '车载', '其他']);

          // 设置为 POTA 公园状态
          setIsPotaPark(true);

        } catch (parkErr: any) {
          console.error('Failed to fetch park details:', parkErr);
          if (parkErr.code === 'ECONNABORTED') {
            setError('获取 POTA 公园详情超时，请稍后重试');
          } else {
            setError('获取 POTA 公园详情失败');
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'ECONNABORTED') {
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
      const res = await axios.get<Array<{
        place_id: number;
        lat: string;
        lon: string;
        display_name: string;
        name: string;
      }>>(
        `/proxy-api/geocoding/osm/search?q=${encodeURIComponent(parkName)}&format=json`,
        { timeout: 5000 }
      );

      if (!res.data || res.data.length === 0) {
        setError('未找到匹配的地点');
        setMapPOIs([]);
        setSelectedPOIId(null);
        return;
      }

      // 转换为 MapPOI 类型
      const pois: MapPOI[] = res.data.map((item) => {
        const parsed = parseOSMDisplayName(item.display_name);
        return {
          id: item.place_id,
          name: item.name || '',
          displayName: item.display_name,
          province: parsed?.province || '',
          city: parsed?.city || '',
          lat: Number.parseFloat(item.lat),
          lon: Number.parseFloat(item.lon),
        };
      });

      setMapPOIs(pois);

      // 默认选中第一个 POI
      if (pois.length > 0) {
        const firstPoi = pois[0];
        setSelectedPOIId(firstPoi.id);
        setLatitude(String(firstPoi.lat));
        setLongitude(String(firstPoi.lon));

        // 格式化公园名称: <省份><城市><名称>
        const provinceCode = getProvinceCodeFromNames(firstPoi.province, firstPoi.city);
        if (provinceCode) {
          setProvince(provinceCode);
        }

        const formattedName = firstPoi.city
          ? `${firstPoi.province}${firstPoi.city}${firstPoi.name}`
          : `${firstPoi.province}${firstPoi.name}`;
        setParkName(formattedName);

        setMapCenter([firstPoi.lat, firstPoi.lon]);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'ECONNABORTED') {
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

    // 解析省份和城市
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

    setMapCenter([poi.lat, poi.lon]);
  };

  const handleSubmit = async () => {
    if (!confirmed) {
      setError('请确认公园真实性');
      return;
    }
    if (submitRequestRef.current) return;

    submitRequestRef.current = true;
    setSubmitting(true);
    setError(null);

    try {
      await axios.post('/api/park-applications', {
        dx_entity: dxEntity,
        park_name: parkName,
        park_type: parkType,
        province_iso_code: province,
        latitude,
        longitude,
        website,
        access_methods: mapAccessMethodsWithBothLangs(accessMethods),
        activation_methods: mapActivationMethodsWithBothLangs(activationMethods),
        confirmed_authenticity: confirmed
      }, { timeout: 5000 }); // 5秒超时

      // 清除保存的表单状态
      clearFormState();

      // 重置表单
      setDxEntity('CN');
      setParkName('');
      setParkType('');
      setProvince('');
      setLatitude('');
      setLongitude('');
      setWebsite('');
      setAccessMethods(['汽车', '步行', '其他']);
      setActivationMethods(['步行', '车载', '其他']);
      setConfirmed(false);
      setIsPotaPark(false);
      setSearchResults([]);
      setMapCenter([39.9042, 116.4074]);
      setMapZoom(13);

      submitRequestRef.current = false;
    } catch (err: any) {
      console.error(err);
      if (err.code === 'ECONNABORTED') {
        setError('提交超时，请检查网络后重试');
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('提交失败，请检查网络后重试');
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

    const bounds = L.latLngBounds(
      mapPOIs.map(poi => [poi.lat, poi.lon] as LatLngTuple)
    );

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

        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>DX实体</InputLabel>
          <Select
            value={dxEntity}
            label="DX实体"
            onChange={(e) => setDxEntity(e.target.value as string)}
          >
            <MenuItem value="CN">中国(CN)</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <TextField
            label="公园名称"
            value={parkName}
            onChange={(e) => setParkName(e.target.value)}
            sx={{ flex: 1 }}
            InputProps={{
              endAdornment: parkName && (
                <IconButton
                  onClick={() => {
                    setParkName('');
                    setParkType('');
                    setProvince('');
                    setLatitude('');
                    setLongitude('');
                    setSearchResults([]);
                    setMapPOIs([]);
                    setSelectedPOIId(null);
                    setIsPotaPark(false);
                  }}
                  tabIndex={-1}
                  sx={{ mr: -0.5 }}
                >
                  <ClearIcon />
                </IconButton>
              ),
            }}
          />

          <FormControl sx={{ minWidth: 200, flex: 1 }}>
            <InputLabel>公园类型</InputLabel>
            <Select
              value={parkType}
              label="公园类型"
              onChange={(e) => setParkType(e.target.value as string)}
              disabled={isPotaPark}
            >
              {['National Park', 'National Nature Reserve'].map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Button
            onClick={handleSearchPOTA}
            disabled={searchingPota}
          >
            {searchingPota ? '搜索中...' : '搜索 POTA'}
          </Button>
          <Button
            onClick={handleSearchMap}
            disabled={searchingMap}
          >
            {searchingMap ? '搜索中...' : '搜索地图'}
          </Button>
          {isPotaPark && (
            <Button
              onClick={() => {
                setIsPotaPark(false);
                setError(null);
                // 清空除 DX 实体以外的所有输入
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
                setMapCenter([39.9042, 116.4074]); // 重置地图中心到北京
                setMapZoom(13);
              }}
              color="secondary"
            >
              重新编辑
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
                <ListItem
                  key={poi.id}
                  button
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
                        }
                      },
                      secondary: {
                        sx: {
                          fontSize: '0.75rem',
                          fontWeight: selectedPOIId === poi.id ? 500 : 400,
                          color: selectedPOIId === poi.id ? 'primary.main' : 'text.secondary',
                        }
                      }
                    }}
                  />
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
              backgroundColor: 'background.paper'
            }}
          >
            {searchResults.map((result, index) => (
              <Typography
                key={`search-${index}-${result.substring(0, 10)}`}
                sx={{
                  py: 0.5,
                  fontSize: '0.875rem',
                  borderBottom: index < searchResults.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider'
                }}
              >
                {result}
              </Typography>
            ))}
          </Box>
        )}

        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>省份</InputLabel>
          <Select
            value={province}
            label="省份"
            onChange={(e) => setProvince(e.target.value as string)}
            disabled={isPotaPark}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 300,
                  width: 250,
                },
              },
            }}
          >
            {provinces.map((p) => (
              <MenuItem key={p.code} value={p.code}>
                {`(${p.code}) ${p.name}`}
              </MenuItem>
            ))}
          </Select>
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
          control={<Checkbox checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />}
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
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
            >
              <MapController center={mapCenter} onZoomChange={setMapZoom} />
              <MapBoundsController bounds={mapBounds} />
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
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
