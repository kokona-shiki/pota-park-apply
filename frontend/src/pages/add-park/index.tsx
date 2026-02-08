// src/pages/add-park/index.tsx
// AddPark Component - 申请添加公园页面
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
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

import parkTypeMappingData from '../../../../shared/park_type_mapping.json';
import regionData from '../../../../shared/region.json';
import { ApplicationDetailDataSchema } from '../../../../shared/schemas/parkApplication';
import { apiClient, requestWithSchema } from '../../services/apiClient';
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
import type { ParkApplicationDetail } from '../../types/parkApplication';
import type { SubmitResult } from './useSubmit';

import AlertDialog from '../../components/AlertDialog';
import { ParkApplicationDetailDialog } from '../../components/ParkApplicationDetailDialog';

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
  chinese_to_english: Array<{ id: string; chineseName: string; englishName: string }>;
  english_to_chinese: Array<{ englishName: string; chineseNames: string[] }>;
};

const PARK_TYPE_OPTIONS: ParkTypeOption[] = PARK_TYPE_MAPPING.chinese_to_english.map(
  ({ id, chineseName: zh, englishName: en }) => ({
    id,
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
    if (lat !== map.getCenter().lat || lon !== map.getCenter().lng) {
      map.setView([lat, lon]);
    }
  }, [map, lat, lon]);

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

// 辅助函数：检查错误代码是否为重复名称错误
function isDuplicateNameError(errorCode: string | undefined) {
  return errorCode?.startsWith('DUPLICATE_NAME');
}

// 辅助函数：检查错误代码是否为相似名称错误
function isSimilarNameError(errorCode: string | undefined, errorMessage: string) {
  return errorCode === 'SIMILAR_NAME' || errorMessage.includes('公园名称相似度高');
}

// 辅助函数：检查错误代码是否为附近位置错误
function isNearbyLocationError(errorCode: string | undefined, errorMessage: string) {
  return errorCode === 'NEARBY_LOCATION' || errorMessage.includes('公园距离过近');
}

// 辅助函数：检查是否应该显示链接
function shouldShowParkLink(errorCode: string | undefined) {
  return errorCode === 'DUPLICATE_NAME_APPROVED' || errorCode === 'DUPLICATE_NAME_POTA_SYNCED';
}

// 辅助函数：检查旧格式是否应该显示链接
function shouldShowParkLinkOldFormat(status: string | undefined) {
  return status === 'approved' || status === 'pota_synced';
}

// 辅助函数：获取公园列表标题
function getParkListTitle(status: string | undefined) {
  return status === 'pota_synced' ? '已存在的公园' : '';
}

// 辅助函数：处理带确认字段的提交
async function handleSubmitWithConfirmation(
  handleSubmit: (params: unknown) => Promise<SubmitResult>,
  formData: unknown,
  navigate: (path: string) => void,
  setError: (error: string) => void,
  clearFormState: () => void,
  confirmationField: string
) {
  const result = await handleSubmit({
    ...formData,
    [confirmationField]: true,
  });

  if (result.success) {
    clearFormState();
    navigate('/my-uploads');
  } else {
    setError(result.error || '提交失败，请重试');
  }
}

// 辅助函数：设置对话框状态
function setDialogState(
  setDialogType: (type: 'error' | 'warning') => void,
  setDialogTitle: (title: string) => void,
  setDialogMessage: (message: string) => void,
  setDialogParkList: (parkList: { id: number; name: string }[]) => void,
  setDialogParkListTitle: (title: string) => void,
  setDialogConfirmAction: (action: (() => void) | null) => void,
  setDialogOpen: (open: boolean) => void,
  type: 'error' | 'warning',
  title: string,
  message: string,
  parkList: { id: number; name: string }[],
  parkListTitle: string,
  confirmAction: (() => void) | null
) {
  setDialogType(type);
  setDialogTitle(title);
  setDialogMessage(message);
  setDialogParkList(parkList);
  setDialogParkListTitle(parkListTitle);
  setDialogConfirmAction(confirmAction);
  setDialogOpen(true);
}

// 辅助函数：处理重复名称错误
function handleDuplicateNameError(
  result: SubmitResult,
  formData: unknown,
  handleSubmit: (params: unknown) => Promise<SubmitResult>,
  navigate: (path: string) => void,
  setError: (error: string) => void,
  clearFormState: () => void,
  setDialogType: (type: 'error' | 'warning') => void,
  setDialogTitle: (title: string) => void,
  setDialogMessage: (message: string) => void,
  setDialogParkList: (parkList: { id: number; name: string }[]) => void,
  setDialogParkListTitle: (title: string) => void,
  setDialogConfirmAction: (action: (() => void) | null) => void,
  setDialogOpen: (open: boolean) => void
) {
  const errorMessage = result.error || '提交失败，请重试';
  const errorCode = result.errorDetails?.code;
  const details = result.errorDetails?.details;

  if (details) {
    const existingPark = details.existingPark;
    const allowRetry = details.allowRetry;

    const parkList = shouldShowParkLink(errorCode) && existingPark
      ? [{ id: existingPark.id, name: existingPark.name }]
      : [];

    const confirmAction = allowRetry ? async () => {
      await handleSubmitWithConfirmation(
        handleSubmit,
        formData,
        navigate,
        setError,
        clearFormState,
        'confirmedRejectedPark'
      );
    } : null;

    setDialogState(
      setDialogType,
      setDialogTitle,
      setDialogMessage,
      setDialogParkList,
      setDialogParkListTitle,
      setDialogConfirmAction,
      setDialogOpen,
      allowRetry ? 'warning' : 'error',
      allowRetry ? '警告' : '错误',
      errorMessage,
      parkList,
      getParkListTitle(existingPark?.status),
      confirmAction
    );
  } else if (result.errorDetails?.existingPark) {
    const existingPark = result.errorDetails?.existingPark;
    const shouldShowLink = shouldShowParkLinkOldFormat(existingPark?.status);
    const parkList = shouldShowLink
      ? [{ id: existingPark.id, name: existingPark.name }]
      : [];

    setDialogState(
      setDialogType,
      setDialogTitle,
      setDialogMessage,
      setDialogParkList,
      setDialogParkListTitle,
      setDialogConfirmAction,
      setDialogOpen,
      'error',
      '错误',
      errorMessage,
      parkList,
      getParkListTitle(existingPark?.status),
      null
    );
  }
}

// 辅助函数：处理相似名称错误
function handleSimilarNameError(
  result: any,
  formData: any,
  handleSubmit: any,
  navigate: any,
  setError: any,
  clearFormState: any,
  setDialogType: any,
  setDialogTitle: any,
  setDialogMessage: any,
  setDialogParkList: any,
  setDialogParkListTitle: any,
  setDialogConfirmAction: any,
  setDialogOpen: any
) {
  const parkList = result.errorDetails?.details?.similarParks || [];

  const confirmAction = async () => {
    await handleSubmitWithConfirmation(
      handleSubmit,
      formData,
      navigate,
      setError,
      clearFormState,
      'confirmedNameSimilarity'
    );
  };

  setDialogState(
    setDialogType,
    setDialogTitle,
    setDialogMessage,
    setDialogParkList,
    setDialogParkListTitle,
    setDialogConfirmAction,
    setDialogOpen,
    'warning',
    '警告',
    '当前填写的公园名称与已有公园名称相似度较高。',
    parkList,
    '相似公园列表',
    confirmAction
  );
}

// 辅助函数：处理附近位置错误
function handleNearbyLocationError(
  result: any,
  formData: any,
  handleSubmit: any,
  navigate: any,
  setError: any,
  clearFormState: any,
  setDialogType: any,
  setDialogTitle: any,
  setDialogMessage: any,
  setDialogParkList: any,
  setDialogParkListTitle: any,
  setDialogConfirmAction: any,
  setDialogOpen: any
) {
  const parkList = result.errorDetails?.details?.nearbyParks || [];

  const confirmAction = async () => {
    await handleSubmitWithConfirmation(
      handleSubmit,
      formData,
      navigate,
      setError,
      clearFormState,
      'confirmedNearbyLocation'
    );
  };

  setDialogState(
    setDialogType,
    setDialogTitle,
    setDialogMessage,
    setDialogParkList,
    setDialogParkListTitle,
    setDialogConfirmAction,
    setDialogOpen,
    'warning',
    '警告',
    '当前填写的公园位置与已有公园位置距离较近。',
    parkList,
    '附近公园列表',
    confirmAction
  );
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'error' | 'warning'>('error');
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');
  const [dialogParkList, setDialogParkList] = useState<{ id: number; name: string }[]>([]);
  const [dialogParkListTitle, setDialogParkListTitle] = useState('');
  const [dialogConfirmAction, setDialogConfirmAction] = useState<(() => void) | null>(null);

  const [selectedPark, setSelectedPark] = useState<ParkApplicationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const provinces = useMemo(() => regionData as Province[], []);

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

  const buttonText = (() => {
    if (submitting) return '提交中...';
    if (isPotaPark) return '已存在 POTA 公园';
    return '提交审核';
  })();

  const [searchResults, setSearchResults] = useState<string[]>([]);

  const parkTypeById = useMemo(
    () => new Map(PARK_TYPE_OPTIONS.map((option) => [option.id, option])),
    []
  );
  const parkTypeIdByEnglish = useMemo(
    () => new Map(PARK_TYPE_OPTIONS.map((option) => [option.en, option.id])),
    []
  );
  const resolveParkTypeId = (value: string) => {
    if (parkTypeById.has(value)) {
      return value;
    }
    return parkTypeIdByEnglish.get(value) || '';
  };

  const handleAccessMethodsChange = (e: SelectChangeEvent<string[]>) => {
    const value = e.target.value;
    updateFormState({
      accessMethods: typeof value === 'string' ? value.split(',') : value,
    });
  };

  const handleActivationMethodsChange = (e: SelectChangeEvent<string[]>) => {
    const value = e.target.value;
    updateFormState({
      activationMethods: typeof value === 'string' ? value.split(',') : value,
    });
  };

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

  const handleDialogCancel = () => {
    setDialogOpen(false);
    setDialogConfirmAction(null);
  };

  const handleParkClick = async (parkId: number) => {
    setSelectedPark(null);
    setDetailError(null);
    try {
      setDetailLoading(true);
      const payload = await requestWithSchema(
        apiClient.get(`/api/park-applications/${parkId}`),
        ApplicationDetailDataSchema
      );
      setSelectedPark(payload.application ?? null);
    } catch (e: unknown) {
      setDetailError((e as Error).message || '获取申请详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleFormSubmit = async () => {
    setError(null);

    try {
      const formData = {
        parkName,
        parkType: resolveParkTypeId(parkType),
        province,
        provinces: formState.provinces,
        latitude,
        longitude,
        website,
        accessMethods,
        activationMethods,
        confirmed,
      };

      const result = await handleSubmit(formData);

      if (result.success) {
        clearFormState();
        navigate('/my-uploads');
      } else {
        const errorMessage = result.error || '提交失败，请重试';
        const errorCode = result.errorDetails?.code;

        if (isDuplicateNameError(errorCode)) {
          handleDuplicateNameError(
            result,
            formData,
            handleSubmit,
            navigate,
            setError,
            clearFormState,
            setDialogType,
            setDialogTitle,
            setDialogMessage,
            setDialogParkList,
            setDialogParkListTitle,
            setDialogConfirmAction,
            setDialogOpen
          );
        } else if (isSimilarNameError(errorCode, errorMessage)) {
          handleSimilarNameError(
            result,
            formData,
            handleSubmit,
            navigate,
            setError,
            clearFormState,
            setDialogType,
            setDialogTitle,
            setDialogMessage,
            setDialogParkList,
            setDialogParkListTitle,
            setDialogConfirmAction,
            setDialogOpen
          );
        } else if (isNearbyLocationError(errorCode, errorMessage)) {
          handleNearbyLocationError(
            result,
            formData,
            handleSubmit,
            navigate,
            setError,
            clearFormState,
            setDialogType,
            setDialogTitle,
            setDialogMessage,
            setDialogParkList,
            setDialogParkListTitle,
            setDialogConfirmAction,
            setDialogOpen
          );
        } else {
          setError(errorMessage);
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '提交失败，请检查网络后重试';
      setError(errorMessage);
    }
  };

  const mapBounds = useMemo(() => {
    if (mapPOIs.length === 0) return null;

    const bounds = L.latLngBounds(mapPOIs.map((poi) => [poi.lat, poi.lon] as [number, number]));

    return bounds;
  }, [mapPOIs]);

  return (
    <>
      <Box sx={{ display: { xs: 'block', md: 'flex' }, gap: 2 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5">申请添加公园</Typography>

          <POISelector
            mapPOIs={mapPOIs}
            selectedPOIId={selectedPOIId}
            setSelectedPOIId={setSelectedPOIId}
            potaParks={potaParks}
            setProvince={(province: string) => updateFormState({ province })}
            setProvinces={(provinces: string[]) => updateFormState({ provinces })}
            provinces={formState.provinces}
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
                value={
                  PARK_TYPE_OPTIONS.find(
                    (option) => option.id === parkType || option.en === parkType
                  ) || null
                }
                onChange={(_, newValue) => {
                  updateFormState({ parkType: newValue ? newValue.id : '' });
                }}
                disabled={isPotaPark}
                getOptionLabel={(option) => {
                  const zh = option.zh;
                  return `${zh} (${option.en})`;
                }}
                filterOptions={(options, { inputValue }) => {
                  if (!inputValue) return options;

                  const pinyinMatched: typeof options = [];
                  const englishMatched: typeof options = [];

                  options.forEach((option) => {
                    const zh = option.zh;
                    const en = option.en;

                    try {
                      if (Pinyin.match(zh, inputValue) !== false) {
                        pinyinMatched.push(option);
                        return;
                      }
                    } catch {
                      // Ignore Pinyin matching errors and continue with other matching methods
                    }

                    if (en.toLowerCase().includes(inputValue.toLowerCase())) {
                      englishMatched.push(option);
                    }
                  });

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
                isOptionEqualToValue={(option, value) => option.id === value.id}
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
                mt:1,
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
              multiple
              options={provinces}
              value={provinces.filter((p) => formState.provinces?.includes(p.code))}
              onChange={(_, newValue) => {
                const codes = newValue.map((p) => p.code);
                updateFormState({ province: codes.length > 0 ? codes[0] : '', provinces: codes });
              }}
              disabled={isPotaPark}
              getOptionLabel={(option) => `(${option.code}) ${option.name}`}
              isOptionEqualToValue={(option, value) => option.code === value.code}
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
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    variant="outlined"
                    label={`${option.name} (${option.code})`}
                    size="small"
                    {...getTagProps({ index })}
                  />
                ))
              }
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

      <AlertDialog
        open={dialogOpen}
        type={dialogType}
        title={dialogTitle}
        message={dialogMessage}
        parkList={dialogParkList}
        parkListTitle={dialogParkListTitle}
        onCancel={handleDialogCancel}
        onConfirm={dialogConfirmAction || undefined}
        onParkClick={handleParkClick}
        confirmButtonText={dialogType === 'error' ? '确定' : '确认提交'}
        cancelButtonText="取消"
        showCancelButton={dialogType !== 'error'}
      />

      <ParkApplicationDetailDialog
        open={!!selectedPark}
        onClose={() => setSelectedPark(null)}
        application={selectedPark}
        loading={detailLoading}
        error={detailError}
        mode="detail"
      />
    </>
  );
}

export default AddPark;
