// src/pages/AddPark.jsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, Select, MenuItem, TextField, Button, FormControl, InputLabel, Checkbox, FormControlLabel, Grid } from '@mui/material';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import L from 'leaflet';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import icon from 'leaflet/dist/images/marker-icon.png';
import shadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl: icon,
  shadowUrl: shadow,
});

function AddPark() {
  const [dxEntity, setDxEntity] = useState('CN');
  const [parkName, setParkName] = useState('');
  const [parkType, setParkType] = useState('');
  const [province, setProvince] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [website, setWebsite] = useState('');
  const [accessMethods, setAccessMethods] = useState(['汽车', '步行', '其他']);
  const [activationMethods, setActivationMethods] = useState(['步行', '车载', '其他']);
  const [confirmed, setConfirmed] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [mapCenter, setMapCenter] = useState([39.9042, 116.4074]); // Default to Beijing

  useEffect(() => {
    fetch('/assets/region.json')
      .then(res => res.json())
      .then(data => setProvinces(data));
  }, []);

  const handleSearchPOTA = () => {
    axios.get(`https://api.pota.app/lookup?search=${parkName}`)
      .then(res => setSearchResults(res.data.map(item => item.display)))
      .catch(err => console.error(err));
  };

  const handleSearchMap = () => {
    // Assuming Google Maps API or similar; placeholder for integration
    // For example, use Nominatim for OpenStreetMap search
    axios.get(`https://nominatim.openstreetmap.org/search?q=${parkName}&format=json`)
      .then(res => {
        if (res.data[0]) {
          const lat = res.data[0].lat;
          const lon = res.data[0].lon;
          setLatitude(lat);
          setLongitude(lon);
          setMapCenter([lat, lon]);
        }
      });
  };

  const handleSubmit = () => {
    if (!confirmed) return alert('请确认公园真实性');
    // POST to /api/apply-park
    axios.post('/api/apply-park', {
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
    }).then(() => alert('提交成功'))
      .catch(err => console.error(err));
  };

  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        setLatitude(e.latlng.lat);
        setLongitude(e.latlng.lng);
        setMapCenter([e.latlng.lat, e.latlng.lng]);
      },
    });
    return latitude ? <Marker position={[latitude, longitude]} /> : null;
  };

  useEffect(() => {
    if (latitude && longitude) {
      setMapCenter([parseFloat(latitude), parseFloat(longitude)]);
    }
  }, [latitude, longitude]);

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Typography variant="h5">申请添加公园</Typography>
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>DX实体</InputLabel>
          <Select value={dxEntity} onChange={(e) => setDxEntity(e.target.value)}>
            <MenuItem value="CN">中国(CN)</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ display: 'flex', mt: 2 }}>
          <TextField label="公园名称" value={parkName} onChange={(e) => setParkName(e.target.value)} />
          <FormControl sx={{ ml: 2 }}>
            <InputLabel>公园类型</InputLabel>
            <Select value={parkType} onChange={(e) => setParkType(e.target.value)}>
              {['National Park', 'National Nature Reserve', /* add all options */].map(type => <MenuItem key={type} value={type}>{type}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>
        <Button onClick={handleSearchPOTA}>搜索POTA</Button>
        {searchResults.length > 0 && (
          <Box>
            {searchResults.map((result, idx) => <Typography key={idx}>{result}</Typography>)}
          </Box>
        )}
        <Button onClick={handleSearchMap}>搜索地图</Button>
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>省份</InputLabel>
          <Select value={province} onChange={(e) => setProvince(e.target.value)}>
            {provinces.map(p => <MenuItem key={p.code} value={p.code}>{`(${p.code}) ${p.name}`}</MenuItem>)}
          </Select>
        </FormControl>
        <Box sx={{ display: 'flex', mt: 2 }}>
          <TextField label="纬度 (WGS84)" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
          <TextField label="经度 (WGS84)" value={longitude} onChange={(e) => setLongitude(e.target.value)} sx={{ ml: 2 }} />
        </Box>
        <TextField fullWidth label="公园网站" value={website} onChange={(e) => setWebsite(e.target.value)} sx={{ mt: 2 }} />
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>访问方法</InputLabel>
          <Select multiple value={accessMethods} onChange={(e) => setAccessMethods(e.target.value)}>
            {['汽车', '步行', '船只', '水上飞机/空中出租车', '其他'].map(method => <MenuItem key={method} value={method}>{method}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>激活方法</InputLabel>
          <Select multiple value={activationMethods} onChange={(e) => setActivationMethods(e.target.value)}>
            {['步行', '车载', '固定建筑', '露营地', '庇护所', '其他'].map(method => <MenuItem key={method} value={method}>{method}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControlLabel control={<Checkbox checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />} label="我已确认公园真实性" />
        <Button variant="contained" onClick={handleSubmit}>提交审核</Button>
      </Grid>
      <Grid item xs={12} md={6}>
        <MapContainer center={mapCenter} zoom={13} style={{ height: '500px' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <LocationMarker />
        </MapContainer>
      </Grid>
    </Grid>
  );
}

export default AddPark;