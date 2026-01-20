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
  List,
  ListItem,
  ListItemText,
  Alert,
  Link,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';

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
  confirmButtonText = '确认',
  cancelButtonText = '取消',
  showCancelButton = true,
}) => {
  const isError = type === 'error';
  const hasConfirmButton = onConfirm !== undefined;
  
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          '& .MuiDialogTitle-root': {
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            bgcolor: isError ? 'error.main' : 'warning.main',
            color: 'white',
            fontWeight: 600,
          },
        },
      }}
    >
      <DialogTitle>
        {isError ? <ErrorIcon /> : <WarningIcon />}
        {title}
      </DialogTitle>
      <DialogContent sx={{ pb: 2 }}>
        <Typography variant="body1" gutterBottom sx={{ lineHeight: 1.6 }}>
          {message}
        </Typography>
        
        {parkList && parkList.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
              {parkListTitle || '相关公园列表'}
            </Typography>
            <List sx={{ 
              maxHeight: 200, 
              overflow: 'auto', 
              bgcolor: 'background.paper', 
              borderRadius: 1,
              border: 1,
              borderColor: 'divider',
            }}>
              {parkList.map((park) => (
                <ListItem key={park.id} divider sx={{ '&:last-child': { borderBottom: 0 } }}>
                  <ListItemText
                    primary={
                      <Link
                        href={`/park/${park.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ textDecoration: 'none', color: 'primary.main' }}
                      >
                        {park.name}
                      </Link>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
        
        {!isError && (
          <Alert severity="info" sx={{ mt: 2 }}>
            继续提交可能导致您的申请被拒绝。
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        {showCancelButton && (
          <Button
            onClick={onCancel}
            variant="outlined"
            sx={{ mr: 1 }}
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
          >
            {confirmButtonText}
          </Button>
        )}
        {isError && !hasConfirmButton && (
          <Button
            onClick={onCancel}
            variant="contained"
            color="error"
            autoFocus
          >
            {confirmButtonText}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AlertDialog;