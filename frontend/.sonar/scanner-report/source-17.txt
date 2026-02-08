// src/components/AlertDialog.tsx
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';

interface ParkItem {
  id: number;
  name: string;
}

export type AlertDialogType = 'error' | 'warning';

export type AlertDialogProps = {
  open: boolean;
  type: AlertDialogType;
  title: string;
  message: string;
  parkList?: ParkItem[];
  parkListTitle?: string;
  onCancel: () => void;
  onConfirm?: () => void;
  onParkClick?: (parkId: number) => void;
  confirmButtonText?: string;
  cancelButtonText?: string;
  showCancelButton?: boolean;
};

const AlertDialog: React.FC<AlertDialogProps> = ({
  open,
  type,
  title,
  message,
  parkList,
  parkListTitle,
  onCancel,
  onConfirm,
  onParkClick,
  confirmButtonText = '确认',
  cancelButtonText = '取消',
  showCancelButton = true,
}) => {
  const isError = type === 'error';
  const hasConfirmButton = onConfirm !== undefined;
  const hasParkClick = onParkClick !== undefined;
  
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 1,
        },
      }}
    >
      <DialogTitle sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        fontWeight: 500,
        fontSize: '1.125rem',
      }}>
        {isError ? (
          <ErrorIcon sx={{ color: 'error.main', fontSize: 20 }} />
        ) : (
          <WarningIcon sx={{ color: 'warning.main', fontSize: 20 }} />
        )}
        {title}
      </DialogTitle>
      <DialogContent sx={{ py: 2 }}>
        <Typography variant="body1" sx={{
          color: 'text.primary',
          mb: parkList && parkList.length > 0 ? 2 : 0,
        }}>
          {message}
        </Typography>
        
        {parkList && parkList.length > 0 && (
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
              {parkList.map((park, index) => (
                <Box key={park.id} sx={{
                  p: 1.5,
                  borderBottom: index < parkList.length - 1 ? '1px solid' : 'none',
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
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
        {showCancelButton && (
          <Button
            onClick={onCancel}
            variant="outlined"
            sx={{
              textTransform: 'none',
              borderRadius: 0.5,
            }}
          >
            {cancelButtonText}
          </Button>
        )}
        {hasConfirmButton && (
          <Button
            onClick={onConfirm}
            variant="contained"
            color={isError ? 'error' : 'warning'}
            autoFocus
            sx={{
              textTransform: 'none',
              borderRadius: 0.5,
            }}
          >
            {confirmButtonText}
          </Button>
        )}
        {isError && !hasConfirmButton && (
          <Button
            onClick={onCancel}
            variant="contained"
            color="primary"
            autoFocus
            sx={{
              textTransform: 'none',
              borderRadius: 0.5,
            }}
          >
            {confirmButtonText}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AlertDialog;