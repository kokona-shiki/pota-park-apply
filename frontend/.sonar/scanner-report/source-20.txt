import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
} from '@mui/material';
import { usePopupNotification } from '../hooks/useNotifications';
import { MarkdownRenderer } from './MarkdownRenderer';

export const PopupNotification = () => {
  const { popupNotification, loading, dismissPopup } = usePopupNotification();

  const handleConfirm = async () => {
    if (popupNotification?.link_url) {
      window.location.href = popupNotification.link_url;
    }
    await dismissPopup();
  };

  const handleDismiss = async () => {
    await dismissPopup();
  };

  if (loading || !popupNotification) {
    return null;
  }

  return (
    <Dialog open={!!popupNotification} maxWidth="md" fullWidth>
      <DialogTitle>{popupNotification.title}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <MarkdownRenderer content={popupNotification.description} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDismiss} color="secondary">
          不再提示
        </Button>
        {popupNotification.link_url && (
          <Button onClick={handleConfirm} variant="contained" color="primary">
            确认
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
