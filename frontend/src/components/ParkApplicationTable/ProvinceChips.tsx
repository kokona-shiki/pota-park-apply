// src/components/ParkApplicationTable/ProvinceChips.tsx
import { Box, Chip } from '@mui/material';
import regionData from '../../../../shared/region.json';

interface ProvinceChipsProps {
  provinces: string[];
}

function ProvinceChips({ provinces }: ProvinceChipsProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 0.5,
        maxWidth: 280,
        overflowX: 'auto',
        '&::-webkit-scrollbar': {
          display: 'none',
        },
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
      }}
    >
      {provinces.map((code: string) => {
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
  );
}

export default ProvinceChips;