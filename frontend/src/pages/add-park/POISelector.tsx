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
import type { MapPOI } from './types';

interface POISelectorProps {
  mapPOIs: MapPOI[];
  selectedPOIId: number | null;
  onPOISelect: (poi: MapPOI) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const POISelector: React.FC<POISelectorProps> = ({
  mapPOIs,
  selectedPOIId,
  onPOISelect,
  error,
  setError,
}) => {
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
                  onClick={() => onPOISelect(poi)}
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
