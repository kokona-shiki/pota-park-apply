// src/pages/AddPark.jsx
import { useEffect, useMemo, useState } from 'react';
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
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import L from 'leaflet';
import regionData from '../assets/region.json';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import icon from 'leaflet/dist/images/marker-icon.png';
import shadow from 'leaflet/dist/images/marker-shadow.png';
import { mapAccessMethods, mapActivationMethods, mapLocationToProvince, mapAccessMethodsWithBothLangs, mapActivationMethodsWithBothLangs } from '../utils/potaMapping';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl: icon,
  shadowUrl: shadow,
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

type LatLngTuple = [number, number];

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
  const [dxEntity, setDxEntity] = useState('CN');
  const [parkName, setParkName] = useState('');
  const [parkType, setParkType] = useState('');
  const [province, setProvince] = useState('');

  // 表单显示用字符串；地图计算用 number
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  const [website, setWebsite] = useState('');
  const [accessMethods, setAccessMethods] = useState<string[]>(['汽车', '步行', '其他']);
  const [activationMethods, setActivationMethods] = useState<string[]>(['步行', '车载', '其他']);
  const [confirmed, setConfirmed] = useState(false);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isPotaPark, setIsPotaPark] = useState(false);

  const provinces = useMemo(() => regionData as Province[], []);

  const [mapCenter, setMapCenter] = useState<LatLngTuple>([39.9042, 116.4074]); // 北京
  const [mapZoom, setMapZoom] = useState(13);

  const handleSearchPOTA = async () => {
    // 重置 POTA 公园状态
    setIsPotaPark(false);
    try {
      // 第一步：搜索公园列表
      const searchRes = await axios.get<PotaLookupItem[]>(
        `/proxy-api/pota/lookup?search=${encodeURIComponent(parkName)}`,
      );

      if (searchRes.data.length === 0) {
        setSearchResults([]);
        return;
      }

      setSearchResults(searchRes.data.map((item) => item.display));

      // 如果只有一个搜索结果，自动填充所有信息并禁用相关字段
      if (searchRes.data.length === 1) {
        const firstPark = searchRes.data[0];
        try {
          const parkRes = await axios.get<PotaParkInfo>(
            `/proxy-api/pota/park/${encodeURIComponent(firstPark.value)}`,
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
          
        } catch (parkErr) {
          console.error('Failed to fetch park details:', parkErr);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchMap = async () => {
    // 重置 POTA 公园状态
    setIsPotaPark(false);
    try {
      const res = await axios.get<Array<{ lat: string; lon: string }>>(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(parkName)}&format=json`,
      );

      const first = res.data[0];
      if (!first) return;

      const lat = Number.parseFloat(first.lat);
      const lon = Number.parseFloat(first.lon);

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

      setLatitude(first.lat);
      setLongitude(first.lon);
      setMapCenter([lat, lon]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async () => {
    if (!confirmed) return alert('请确认公园真实性');

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
      });
      alert('提交成功');
    } catch (err) {
      console.error(err);
    }
  };

  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        if (isPotaPark) return; // POTA 公园不允许点击修改位置
        const lat = e.latlng.lat;
        const lon = e.latlng.lng;
        setLatitude(String(lat));
        setLongitude(String(lon));
        // 移除 setMapCenter 调用，不重置地图中心
      },
    });

    const lat = Number.parseFloat(latitude);
    const lon = Number.parseFloat(longitude);
    
    // 只有当坐标有效时才显示 marker
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return null;
    }

    return <Marker position={[lat, lon]} />;
  };

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
          <Button onClick={handleSearchPOTA}>搜索POTA</Button>
          <Button onClick={handleSearchMap}>搜索地图</Button>
          {isPotaPark && (
            <Button 
              onClick={() => {
                setIsPotaPark(false);
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
                setMapCenter([39.9042, 116.4074]); // 重置地图中心到北京
                setMapZoom(13);
              }} 
              color="secondary"
            >
              重新编辑
            </Button>
          )}
        </Box>

        {searchResults.length > 0 && (
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
            {searchResults.map((result, idx) => (
              <Typography 
                key={idx} 
                sx={{ 
                  py: 0.5,
                  fontSize: '0.875rem',
                  borderBottom: idx < searchResults.length - 1 ? '1px solid' : 'none',
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
        />
        <Button variant="contained" onClick={handleSubmit} disabled={isPotaPark}>
          {isPotaPark ? '已存在 POTA 公园' : '提交审核'}
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
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <LocationMarker />
            </MapContainer>
        </Box>
      </Box>
    </Box>
  );
}

export default AddPark;
