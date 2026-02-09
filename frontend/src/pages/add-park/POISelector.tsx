// src/pages/add-park/POISelector.tsx
import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Collapse,
  Alert,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { MapPOI, PotaParkInfo } from './types';
import {
  mapLocationToProvince,
  mapAccessMethods,
  mapActivationMethods,
  getProvinceCodeFromNames,
} from '../../utils/potaMapping';

interface POISelectorProps {
  mapPOIs: MapPOI[];
  selectedPOIId: number | null;
  setSelectedPOIId: (id: number | null) => void;
  potaParks: Map<number, PotaParkInfo>;
  setProvince: (province: string) => void;
  setParkName: (name: string) => void;
  setParkType: (type: string) => void;
  setWebsite: (url: string) => void;
  setAccessMethods: (methods: string[]) => void;
  setActivationMethods: (methods: string[]) => void;
  setIsPotaPark: (isPota: boolean) => void;
  setLatitude: (lat: string) => void;
  setLongitude: (lon: string) => void;
  setProvinces?: (provinces: string[]) => void;
  provinces?: string[];
  error: string | null;
  setError: (error: string | null) => void;
}

const POISelector: React.FC<POISelectorProps> = ({
  mapPOIs,
  selectedPOIId,
  setSelectedPOIId,
  potaParks,
  setProvince,
  setParkName,
  setParkType,
  setWebsite,
  setAccessMethods,
  setActivationMethods,
  setIsPotaPark,
  setLatitude,
  setLongitude,
  setProvinces,
  provinces,
  error,
  setError,
}) => {
  // 处理 POTA 公园选中
  const handlePotaParkSelect = (_poi: MapPOI, parkInfo: PotaParkInfo) => {
    const provinceCode = mapLocationToProvince(parkInfo.locationDesc);
    setProvince(provinceCode);
    
    // 如果省份选框中没有省份或者只有一个省份，则使用 POI 对应省份替换选框中的省份
    if (setProvinces && (!provinces || provinces.length <= 1)) {
      setProvinces([provinceCode]);
    }
    
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
  };

  // 处理普通地图 POI 选中
  const handleMapPOISelect = (poi: MapPOI) => {
    // 地图 POI，解析省份和城市
    const isoProvinceCode = getProvinceCodeFromNames(poi.province);
    // 将 ISO-3166 格式转换为省份代码格式（如 '11'）
    const provinceCode = mapLocationToProvince(isoProvinceCode);
    
    if (provinceCode) {
      // 如果省份选框中没有省份或者只有一个省份，则使用 POI 对应省份替换选框中的省份
      // setProvince 设置默认值供用户参考，但不覆盖已选择的省份数组
      setProvince(provinceCode);
      if (setProvinces && (!provinces || provinces.length <= 1)) {
        setProvinces([provinceCode]);
      }
    }

    // 格式化公园名称: <省份><城市><名称>
    const formattedName = poi.city 
      ? `${poi.province}${poi.city}${poi.name}`
      : `${poi.province}${poi.name}`;
    
    setParkName(formattedName);
    setIsPotaPark(false);
  };

  // 处理 POI 选中
  const handlePOISelect = (poi: MapPOI) => {
    setSelectedPOIId(poi.id);
    setLatitude(String(poi.lat));
    setLongitude(String(poi.lon));

    // 如果是 POTA 公园，填充详细信息
    const parkInfo = potaParks.get(poi.id);
    if (parkInfo) {
      handlePotaParkSelect(poi, parkInfo);
    } else {
      handleMapPOISelect(poi);
    }
  };

  return (
    <>
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
    </>
  );
};

export default POISelector;
