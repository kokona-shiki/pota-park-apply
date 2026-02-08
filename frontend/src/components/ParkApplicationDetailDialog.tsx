// src/components/ParkApplicationDetailDialog.tsx
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import type { ParkApplicationDetail } from '../types/parkApplication';
import DialogContent from './ParkApplicationDetailDialog/DialogContent';
import ReviewForm from './ParkApplicationDetailDialog/ReviewForm';

interface ParkApplicationDetailDialogProps {
  open: boolean;
  onClose: () => void;
  application: ParkApplicationDetail | null;
  loading?: boolean;
  error?: string | null;
  mode?: 'detail' | 'review';
  showReviewForm?: boolean;
  reviewNotes?: string;
  reviewRejectionReason?: string;
  onReviewNotesChange?: (value: string) => void;
  onReviewRejectionReasonChange?: (value: string) => void;
  onApprove?: () => void;
  onReject?: () => void;
  reviewSubmitting?: boolean;
}

export function ParkApplicationDetailDialog({
  open,
  onClose,
  application,
  loading = false,
  error = null,
  mode = 'detail',
  showReviewForm = false,
  reviewNotes = '',
  reviewRejectionReason = '',
  onReviewNotesChange,
  onReviewRejectionReasonChange,
  onApprove,
  onReject,
  reviewSubmitting = false,
}: ParkApplicationDetailDialogProps) {
  if (!application) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{mode === 'review' ? '审核申请' : '申请详情'}</DialogTitle>
      <DialogContent dividers>
        <DialogContent
          application={application}
          mode={mode}
          loading={loading}
          error={error}
        />
        {showReviewForm && mode === 'review' && (
          <ReviewForm
            reviewNotes={reviewNotes}
            reviewRejectionReason={reviewRejectionReason}
            reviewSubmitting={reviewSubmitting}
            onReviewNotesChange={(value) => onReviewNotesChange?.(value)}
            onReviewRejectionReasonChange={(value) => onReviewRejectionReasonChange?.(value)}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={reviewSubmitting}>
          关闭
        </Button>

        {mode === 'review' && showReviewForm && (
          <>
            <Button onClick={onReject} color="error" disabled={reviewSubmitting}>
              拒绝
            </Button>
            <Button onClick={onApprove} variant="contained" disabled={reviewSubmitting}>
              通过
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default ParkApplicationDetailDialog;