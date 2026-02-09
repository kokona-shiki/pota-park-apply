// src/components/ParkApplicationDetailDialog/ParkInfoFields.tsx
import { Box, TextField, Chip } from '@mui/material';
import type { ParkApplicationDetail } from '../../types/parkApplication';
import regionData from '../../../../shared/region.json';
import { getParkTypeWithEnglish } from '../../utils/parkTypeMapping';

interface ParkInfoFieldsProps {
  application: ParkApplicationDetail;
}

function ParkInfoFields({ application }: ParkInfoFieldsProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
        gap: 2,
      }}
    >
      <TextField
        label="省份"
        value=""
        InputProps={{
          readOnly: true,
          startAdornment:
            application.provinces && application.provinces.length > 0 ? (
              <Box sx={{ display: 'flex', gap: 0.5, mx: 0.5 }}>
                {application.provinces.map((code: string) => {
                  const province = regionData.find(
                    (p: { code: string; name: string }) => p.code === code
                  );
                  return (
                    <Chip
                      key={code}
                      label={`${province ? province.name : ''} (${code})`}
                      size="small"
                      variant="outlined"
                    />
                  );
                })}
              </Box>
            ) : undefined,
        }}
      />
      {application.park_type && (
        <TextField
          label="公园类型"
          value={getParkTypeWithEnglish(application.park_type)}
          InputProps={{ readOnly: true }}
        />
      )}
      <TextField
        label="纬度"
        value={String(application.latitude ?? '')}
        InputProps={{ readOnly: true }}
      />
      <TextField
        label="经度"
        value={String(application.longitude ?? '')}
        InputProps={{ readOnly: true }}
      />
      {application.website && (
        <TextField
          label="网站"
          value={application.website}
          InputProps={{ readOnly: true }}
          sx={{ gridColumn: { xs: '1 / -1' } }}
        />
      )}
      {application.description && (
        <TextField
          label="描述"
          value={application.description}
          InputProps={{ readOnly: true }}
          multiline
          minRows={2}
          sx={{ gridColumn: { xs: '1 / -1' } }}
        />
      )}
    </Box>
  );
}

export default ParkInfoFields;