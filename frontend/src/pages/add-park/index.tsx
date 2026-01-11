// src/pages/add-park/index.tsx
// AddPark Component - 申请添加公园页面
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import Pinyin from 'pinyin-match';

import parkTypeMappingData from '../../assets/park_type_mapping.json';
import regionData from '../../assets/region.json';
import { MapContainer, Marker, useMap } from 'react-leaflet';
import { UnifiedTileLayer } from '../../components/UnifiedTileLayer';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import POISelector from './POISelector';
import SearchButtons from './SearchButtons';
import { useFormState, clearFormState } from './useFormState';
import { useSearch } from './useSearch';
import { useSubmit } from './useSubmit';
import type { Province, MapPOI, PotaParkInfo, ParkTypeOption } from './types';

import { getApiErrorMessage } from '../../utils/error';

// 修复 Leaflet 默认图标问题
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import icon from 'leaflet/dist/images/marker-icon.png';
import shadow from 'leaflet/dist/images/marker-shadow.png';
import LocationMarker from './LocationMarker';

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

// 公园类型映射
const PARK_TYPE_MAPPING = parkTypeMappingData as {
  chinese_to_english: Array<{ chineseName: string; englishName: string }>;
  english_to_chinese: Array<{ englishName: string; chineseNames: string[] }>;
};

const PARK_TYPE_OPTIONS: ParkTypeOption[] = PARK_TYPE_MAPPING.chinese_to_english.map(
  ({ chineseName: zh, englishName: en }, index) => ({
    id: index,
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
  center: [number, number];
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
  const navigate = useNavigate();
  const { formState, updateFormState, resetFormState } = useFormState();
  const { searchingPota, searchingMap, handleSearchPOTA, handleSearchMap } = useSearch();
  const { submitting, handleSubmit } = useSubmit();

  const [error, setError] = useState<string | null>(null);
  const [mapPOIs, setMapPOIs] = useState<MapPOI[]>([]);
  const [selectedPOIId, setSelectedPOIId] = useState<number | null>(null);
  const [potaParks, setPotaParks] = useState<Map<number, PotaParkInfo>>(new Map());

  const provinces = useMemo(() => regionData as Province[], []);

  // 从表单状态获取各个值
  const {
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
  } = formState;

  // 计算按钮文本以避免嵌套三元运算符警告
  const buttonText = (() => {
    if (submitting) return '提交中...';
    if (isPotaPark) return '已存在 POTA 公园';
    return '提交审核';
  })();

  // 地图搜索相关的状态
  const [searchResults, setSearchResults] = useState<string[]>([]);

  // 处理访问方法变更
  const handleAccessMethodsChange = (e: SelectChangeEvent<string[]>) => {
    const value = e.target.value;
    updateFormState({
      accessMethods: typeof value === 'string' ? value.split(',') : value,
    });
  };

  // 处理激活方法变更
  const handleActivationMethodsChange = (e: SelectChangeEvent<string[]>) => {
    const value = e.target.value;
    updateFormState({
      activationMethods: typeof value === 'string' ? value.split(',') : value,
    });
  };

  // 处理搜索 POTA
  const handleSearchPOTAAction = async () => {
    setError(null);
    setSearchResults([]);
    setMapPOIs([]);

    try {
      const { pois, parksMap } = await handleSearchPOTA(parkName);
      setMapPOIs(pois);
      setPotaParks(parksMap);
    } catch (err: unknown) {
      const code = (err as { code?: unknown })?.code;
      if (code === 'ECONNABORTED') {
        setError('搜索 POTA 超时，请检查网络后重试');
      } else {
        setError((err as Error).message || '搜索 POTA 失败，请检查网络后重试');
      }
    }
  };

  // 处理搜索地图
  const handleSearchMapAction = async () => {
    setError(null);

    try {
      const pois = await handleSearchMap(parkName);
      setMapPOIs(pois);
    } catch (err: unknown) {
      const code = (err as { code?: unknown })?.code;
      if (code === 'ECONNABORTED') {
        setError('搜索地图超时，请检查网络后重试');
      } else {
        setError((err as Error).message || '搜索地图失败，请检查网络后重试');
      }
    }
  };

  // 处理提交
  const handleFormSubmit = async () => {
    setError(null);

    try {
      const result = await handleSubmit({
        parkName,
        parkType,
        province,
        latitude,
        longitude,
        website,
        accessMethods,
        activationMethods,
        confirmed,
      });

      if (result.success) {
        // 清除保存的表单状态
        clearFormState();
        // 跳转到"我的上传"，让用户立刻看到已提交的申请
        navigate('/my-uploads');
      } else {
        setError(result.error || '提交失败，请重试');
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, '提交失败，请检查网络后重试'));
    }
  };

  // 计算所有 POI 的边界
  const mapBounds = useMemo(() => {
    if (mapPOIs.length === 0) return null;

    const bounds = L.latLngBounds(mapPOIs.map((poi) => [poi.lat, poi.lon] as [number, number]));

    return bounds;
  }, [mapPOIs]);

  return (
    <Box sx={{ display: { xs: 'block', md: 'flex' }, gap: 2 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="h5">申请添加公园</Typography>

        <POISelector
          mapPOIs={mapPOIs}
          selectedPOIId={selectedPOIId}
          setSelectedPOIId={setSelectedPOIId}
          potaParks={potaParks}
          setProvince={(province: string) => updateFormState({ province })}
          setParkName={(name: string) => updateFormState({ parkName: name })}
          setParkType={(type: string) => updateFormState({ parkType: type })}
          setWebsite={(url: string) => updateFormState({ website: url })}
          setAccessMethods={(methods: string[]) => updateFormState({ accessMethods: methods })}
          setActivationMethods={(methods: string[]) =>
            updateFormState({ activationMethods: methods })
          }
          setIsPotaPark={(isPota: boolean) => updateFormState({ isPotaPark: isPota })}
          setLatitude={(lat: string) => updateFormState({ latitude: lat })}
          setLongitude={(lon: string) => updateFormState({ longitude: lon })}
          error={error}
          setError={setError}
        />

        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <TextField
            label="公园名称"
            value={parkName}
            onChange={(e) => updateFormState({ parkName: e.target.value })}
            sx={{ flex: 1 }}
          />

          <FormControl sx={{ minWidth: 200, flex: 1 }}>
            <Autocomplete
              disablePortal
              options={PARK_TYPE_OPTIONS}
              value={PARK_TYPE_OPTIONS.find((option) => option.en === parkType) || null}
              onChange={(_, newValue) => {
                updateFormState({ parkType: newValue ? newValue.en : '' });
              }}
              disabled={isPotaPark}
              getOptionLabel={(option) => {
                // 使用选项本身的中文名称
                const zh = option.zh;
                return `${zh} (${option.en})`;
              }}
              filterOptions={(options, { inputValue }) => {
                if (!inputValue) return options;

                // 拼音匹配的选项
                const pinyinMatched: typeof options = [];
                // 英文匹配的选项
                const englishMatched: typeof options = [];

                options.forEach((option) => {
                  const zh = option.zh;
                  const en = option.en;

                  // 检查拼音匹配
                  try {
                    if (Pinyin.match(zh, inputValue) !== false) {
                      pinyinMatched.push(option);
                      return; // 如果已经匹配拼音，则不再检查英文匹配
                    }
                  } catch {
                    // 拼音匹配失败，继续尝试其他匹配方式
                  }

                  // 检查英文匹配
                  if (en.toLowerCase().includes(inputValue.toLowerCase())) {
                    englishMatched.push(option);
                  }
                });

                // 返回拼音匹配结果在前，英文匹配结果在后
                return [...pinyinMatched, ...englishMatched];
              }}
              renderInput={(params) => <TextField {...params} label="公园类型" />}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
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

        <SearchButtons
          handleSearchPOTA={handleSearchPOTAAction}
          handleSearchMap={handleSearchMapAction}
          searchingPota={searchingPota}
          searchingMap={searchingMap}
          onReset={resetFormState}
          hasContent={!!parkName || mapPOIs.length > 0}
        />

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
            value={provinces.find((p) => p.code === province) || null}
            onChange={(_, newValue) => {
              updateFormState({ province: newValue ? newValue.code : '' });
            }}
            disabled={isPotaPark}
            getOptionLabel={(option) => `(${option.code}) ${option.name}`}
            filterOptions={(options, { inputValue }) => {
              if (!inputValue) return options;
              return options.filter(
                (option) => Pinyin.match(`${option.code} ${option.name}`, inputValue) !== false
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="省份"
                helperText="目前仅支持31个省、直辖市、自治区，不支持港澳台地区"
              />
            )}
            isOptionEqualToValue={(option, value) => option.code === value.code}
          />
        </FormControl>

        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <TextField
            label="纬度 (WGS84)"
            value={latitude}
            onChange={(e) => {
              updateFormState({ latitude: e.target.value });
            }}
            disabled={isPotaPark}
            sx={{ flex: 1 }}
          />
          <TextField
            label="经度 (WGS84)"
            value={longitude}
            onChange={(e) => {
              updateFormState({ longitude: e.target.value });
            }}
            disabled={isPotaPark}
            sx={{ flex: 1 }}
          />
        </Box>

        <TextField
          fullWidth
          label="公园网站"
          value={website}
          onChange={(e) => updateFormState({ website: e.target.value })}
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
            <Checkbox
              checked={confirmed}
              onChange={(e) => updateFormState({ confirmed: e.target.checked })}
            />
          }
          label="我已确认公园真实性"
          sx={{ mt: 2 }}
        />
        <Button
          variant="contained"
          onClick={handleFormSubmit}
          disabled={submitting || isPotaPark || !confirmed}
          sx={{ mt: 1 }}
          fullWidth
        >
          {buttonText}
        </Button>
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, mt: { xs: 2, md: 0 } }}>
        <Box sx={{ height: 500, width: '100%', borderRadius: 1, overflow: 'hidden' }}>
          <MapContainer
            center={[mapCenter[0], mapCenter[1]]}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
          >
            <MapController
              center={[mapCenter[0], mapCenter[1]]}
              onZoomChange={(zoom) => updateFormState({ mapZoom: zoom })}
            />
            <MapBoundsController bounds={mapBounds} />
            {/* 使用统一的瓦片服务 */}
            <UnifiedTileLayer />
            <LocationMarker
              isPotaPark={isPotaPark}
              mapPOIs={mapPOIs}
              updateFormState={updateFormState}
              latitude={latitude}
              longitude={longitude}
            />
            {mapPOIs.map((poi) => (
              <Marker
                key={poi.id}
                position={[poi.lat, poi.lon]}
                icon={selectedPOIId === poi.id ? selectedIcon : normalIcon}
                eventHandlers={{
                  click: () => setSelectedPOIId(poi.id),
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
