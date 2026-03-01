// src/components/AlertDialog/ParkList.tsx
import { Box, Typography } from '@mui/material';

export interface ParkItem {
  id: number;
  name: string;
}

interface ParkListProps {
  parkList?: ParkItem[];
  parkListTitle?: string;
  onParkClick?: (parkId: number) => void;
}

function ParkList({ parkList, parkListTitle, onParkClick }: ParkListProps) {
  const hasParkClick = onParkClick !== undefined;
  const parks = parkList || [];

  return (
    <Box>
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 500,
          color: 'text.secondary',
          mb: 1,
        }}
      >
        {parkListTitle || '相关公园列表'}
      </Typography>
      <Box sx={{
        maxHeight: 200,
        overflow: 'auto',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}>
        {parks.map((park, index) => (
          <Box key={park.id} sx={{
            p: 1.5,
            borderBottom: index < parks.length - 1 ? '1px solid' : 'none',
            borderBottomColor: 'divider',
          }}>
            <Typography
              onClick={() => onParkClick?.(park.id)}
              sx={{
                cursor: hasParkClick ? 'pointer' : 'default',
                color: 'primary.main',
                '&:hover': hasParkClick ? {
                  textDecoration: 'underline',
                } : {},
              }}
            >
              {park.name}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default ParkList;