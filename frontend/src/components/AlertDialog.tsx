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
import type { ParkItem } from './AlertDialog/ParkList';

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

function getIcon(type: AlertDialogType) {
  return type === 'error' ? (
    <ErrorIcon sx={{ color: 'error.main', fontSize: 20 }} />
  ) : (
    <WarningIcon sx={{ color: 'warning.main', fontSize: 20 }} />
  );
}

function shouldShowParkList(parkList?: Array<{ id: number; name: string }>) {
  return parkList !== undefined && parkList.length > 0;
}

function getDialogActions({
  isError,
  hasConfirmButton,
  showCancelButton,
  onCancel,
  onConfirm,
  confirmButtonText,
  cancelButtonText,
}: {
  isError: boolean;
  hasConfirmButton: boolean;
  showCancelButton: boolean;
  onCancel: () => void;
  onConfirm?: () => void;
  confirmButtonText: string;
  cancelButtonText: string;
}) {
  return (
    <>
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
    </>
  );
}

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
  const showParkList = shouldShowParkList(parkList);

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
        {getIcon(type)}
        {title}
      </DialogTitle>
      <DialogContent sx={{ py: 2 }}>
        <Typography variant="body1" sx={{
          color: 'text.primary',
          mb: showParkList ? 2 : 0,
        }}>
          {message}
        </Typography>

        {showParkList && (
          <ParkList
            parkList={parkList}
            parkListTitle={parkListTitle}
            onParkClick={onParkClick}
          />
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
        {getDialogActions({
          isError,
          hasConfirmButton,
          showCancelButton,
          onCancel,
          onConfirm,
          confirmButtonText,
          cancelButtonText,
        })}
      </DialogActions>
    </Dialog>
  );
};

export default AlertDialog;
