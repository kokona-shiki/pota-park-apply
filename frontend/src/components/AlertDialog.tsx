// src/components/AlertDialog.tsx
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import ParkList from './AlertDialog/ParkList';

export type AlertDialogType = 'error' | 'warning';

export type AlertDialogProps = {
  open: boolean;
  type: AlertDialogType;
  title: string;
  message: string;
  parkList?: Array<{ id: number; name: string }>;
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
          <ParkList
            parkList={parkList}
            parkListTitle={parkListTitle}
            onParkClick={onParkClick}
          />
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