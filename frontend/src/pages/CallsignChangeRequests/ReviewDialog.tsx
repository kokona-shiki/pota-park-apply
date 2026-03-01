// src/pages/CallsignChangeRequests/ReviewDialog.tsx
import { Box, Dialog, DialogContent, DialogTitle, DialogActions, TextField, Button, Typography } from '@mui/material';

interface CallsignChangeRequest {
  id: number;
  current_callsign: string;
  requested_callsign: string;
  reason: string;
  applicant_email?: string;
  applicant_callsign?: string;
}

interface ReviewDialogProps {
  open: boolean;
  request: CallsignChangeRequest | null;
  status: 'approved' | 'rejected';
  notes: string;
  loading: boolean;
  onNotesChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

function ReviewDialog({
  open,
  request,
  status,
  notes,
  loading,
  onNotesChange,
  onSubmit,
  onClose,
}: ReviewDialogProps) {
  if (!request) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        {status === 'approved' ? '批准呼号变更申请' : '拒绝呼号变更申请'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              申请人: {request.applicant_callsign || request.applicant_email}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              当前呼号: {request.current_callsign} → 申请呼号:{' '}
              {request.requested_callsign}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              申请原因: {request.reason}
            </Typography>
          </Box>
          <TextField
            fullWidth
            label="审核备注"
            multiline
            rows={4}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder={
              status === 'approved' ? '可选：批准原因或说明' : '必填：拒绝原因'
            }
            required={status === 'rejected'}
            margin="normal"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          取消
        </Button>
        <Button
          onClick={onSubmit}
          disabled={loading || (status === 'rejected' && !notes.trim())}
          variant="contained"
          color={status === 'approved' ? 'success' : 'error'}
        >
          {status === 'approved' ? '批准' : '拒绝'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ReviewDialog;