// src/pages/add-park/ParkFormFields.tsx
import { Box, TextField, FormControl, InputLabel, Autocomplete, Select, MenuItem, Chip, Checkbox, FormControlLabel } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import Pinyin from 'pinyin-match';
import type { Province, ParkTypeOption } from './types';

interface ParkFormFieldsProps {
  parkName: string;
  parkType: string;
  province: string;
  provinces: string[];
  latitude: string;
  longitude: string;
  website: string;
  accessMethods: string[];
  activationMethods: string[];
  confirmed: boolean;
  isPotaPark: boolean;
  PARK_TYPE_OPTIONS: ParkTypeOption[];
  onParkNameChange: (value: string) => void;
  onParkTypeChange: (value: string) => void;
  onProvinceChange: (value: string) => void;
  onProvincesChange: (value: string[]) => void;
  onLatitudeChange: (value: string) => void;
  onLongitudeChange: (value: string) => void;
  onWebsiteChange: (value: string) => void;
  onAccessMethodsChange: (value: string[]) => void;
  onActivationMethodsChange: (value: string[]) => void;
  onConfirmedChange: (value: boolean) => void;
}

function ParkFormFields({
  parkName,
  parkType,
  province,
  provinces,
  latitude,
  longitude,
  website,
  accessMethods,
  activationMethods,
  confirmed,
  isPotaPark,
  PARK_TYPE_OPTIONS,
  onParkNameChange,
  onParkTypeChange,
  onProvinceChange,
  onProvincesChange,
  onLatitudeChange,
  onLongitudeChange,
  onWebsiteChange,
  onAccessMethodsChange,
  onActivationMethodsChange,
  onConfirmedChange,
}: ParkFormFieldsProps) {
  const handleAccessMethodsChange = (e: SelectChangeEvent<string[]>) => {
    const value = e.target.value;
    onAccessMethodsChange(typeof value === 'string' ? value.split(',') : value);
  };

  const handleActivationMethodsChange = (e: SelectChangeEvent<string[]>) => {
    const value = e.target.value;
    onActivationMethodsChange(typeof value === 'string' ? value.split(',') : value);
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <TextField
          label="公园名称"
          value={parkName}
          onChange={(e) => onParkNameChange(e.target.value)}
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
              onParkTypeChange(newValue ? newValue.id : '');
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
        <FormControl fullWidth sx={{ mt: 2 }}>
          <Autocomplete
            disablePortal
            multiple
            options={provinces}
            value={provinces.filter((p) => province.includes(p))}
            onChange={(_, newValue) => {
              const codes = newValue.map((p) => p.code);
              onProvinceChange(codes.length > 0 ? codes[0] : '');
              onProvincesChange(codes);
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
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <TextField
          label="纬度 (WGS84)"
          value={latitude}
          onChange={(e) => onLatitudeChange(e.target.value)}
          disabled={isPotaPark}
          sx={{ flex: 1 }}
        />
        <TextField
          label="经度 (WGS84)"
          value={longitude}
          onChange={(e) => onLongitudeChange(e.target.value)}
          disabled={isPotaPark}
          sx={{ flex: 1 }}
        />
      </Box>

      <TextField
        fullWidth
        label="公园网站"
        value={website}
        onChange={(e) => onWebsiteChange(e.target.value)}
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
            onChange={(e) => onConfirmedChange(e.target.checked)}
          />
        }
        label="我已确认公园真实性"
        sx={{ mt: 2 }}
      />
    </Box>
  );
}

export default ParkFormFields;