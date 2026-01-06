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

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl: icon,
  shadowUrl: shadow,
});

type Province = { name: string; code: string };

type PotaLookupItem = { display: string };

type LatLngTuple = [number, number];

function MapController({
  showMap,
  center,
  onZoomChange,
}: {
  showMap: boolean;
  center: LatLngTuple;
  onZoomChange: (zoom: number) => void;
}) {
  const map = useMap();
  const lat = center[0];
  const lon = center[1];

  useEffect(() => {
    if (!showMap) return;
    const t = setTimeout(() => map.invalidateSize(), 0);
    return () => clearTimeout(t);
  }, [map, showMap]);

  useEffect(() => {
    // 只有当中心点真正改变时才移动地图
    if (showMap && lat !== map.getCenter().lat || lon !== map.getCenter().lng) {
      map.setView([lat, lon]);
    }
  }, [map, showMap, lat, lon]);

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

  const provinces = useMemo(() => regionData as Province[], []);

  const [mapCenter, setMapCenter] = useState<LatLngTuple>([39.9042, 116.4074]); // 北京
  const [showMap, setShowMap] = useState(false);
  const [mapZoom, setMapZoom] = useState(13);

  const handleSearchPOTA = async () => {
    setShowMap(true);
    try {
      const res = await axios.get<PotaLookupItem[]>(
        `https://api.pota.app/lookup?search=${encodeURIComponent(parkName)}`,
      );
      setSearchResults(res.data.map((item) => item.display));
      
      // 同时获取第一个结果的坐标作为地图中心
      if (res.data.length > 0) {
        const firstResult = res.data[0].display;
        
        // POTA API 的 display 格式通常是: "Name-Reference (lat,lon)"
        const coordMatch = firstResult.match(/\(([-+]?\d*\.?\d+),\s*([-+]?\d*\.?\d+)\)/);
        
        if (coordMatch) {
          const lat = parseFloat(coordMatch[1]);
          const lon = parseFloat(coordMatch[2]);
          
          if (!isNaN(lat) && !isNaN(lon)) {
            setLatitude(String(lat));
            setLongitude(String(lon));
            setMapCenter([lat, lon]);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchMap = async () => {
    setShowMap(true);
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
      await axios.post('/api/apply-park', {
        dx_entity: dxEntity,
        park_name: parkName,
        park_type: parkType,
        province,
        latitude,
        longitude,
        website,
        access_methods: accessMethods,
        activation_methods: activationMethods,
        confirmed_authenticity: confirmed,
      });
      alert('提交成功');
    } catch (err) {
      console.error(err);
    }
  };

  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        setShowMap(true);
        const lat = e.latlng.lat;
        const lon = e.latlng.lng;
        setLatitude(String(lat));
        setLongitude(String(lon));
        // 移除 setMapCenter 调用，不重置地图中心
      },
    });

    const lat = Number.parseFloat(latitude);
    const lon = Number.parseFloat(longitude);
    
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
        </Box>

        {searchResults.length > 0 && (
          <Box sx={{ mt: 1 }}>
            {searchResults.map((result, idx) => (
              <Typography key={idx}>{result}</Typography>
            ))}
          </Box>
        )}

        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>省份</InputLabel>
          <Select
            value={province}
            label="省份"
            onChange={(e) => setProvince(e.target.value as string)}
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
              setShowMap(true);
              setLatitude(e.target.value);
            }}
            sx={{ flex: 1 }}
          />
          <TextField
            label="经度 (WGS84)"
            value={longitude}
            onChange={(e) => {
              setShowMap(true);
              setLongitude(e.target.value);
            }}
            sx={{ flex: 1 }}
          />
        </Box>

        <TextField
          fullWidth
          label="公园网站"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          sx={{ mt: 2 }}
        />

        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>访问方法</InputLabel>
          <Select
            multiple
            value={accessMethods}
            label="访问方法"
            onChange={handleAccessMethodsChange}
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
        <Button variant="contained" onClick={handleSubmit}>
          提交审核
        </Button>
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, mt: { xs: 2, md: 0 } }}>
        <Box sx={{ height: 500, width: '100%', borderRadius: 1, overflow: 'hidden' }}>
          {showMap ? (
            <MapContainer 
              center={mapCenter} 
              zoom={mapZoom} 
              style={{ height: '100%', width: '100%' }}
            >
              <MapController showMap={showMap} center={mapCenter} onZoomChange={setMapZoom} />
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <LocationMarker />
            </MapContainer>
          ) : (
            <Box
              sx={{
                height: '100%',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              点击"搜索POTA"或"搜索地图"后显示地图
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default AddPark;
