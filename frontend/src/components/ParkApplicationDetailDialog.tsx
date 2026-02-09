import {
  Button,
  Dialog,
  DialogActions,
  DialogContent as MuiDialogContent,
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

function getDialogTitle(mode: 'detail' | 'review') {
  return mode === 'review' ? '审核申请' : '申请详情';
}

function shouldShowReviewForm(showReviewForm: boolean, mode: 'detail' | 'review') {
  return showReviewForm && mode === 'review';
}

function ReviewActions({
  onApprove,
  onReject,
  reviewSubmitting,
}: {
  onApprove?: () => void;
  onReject?: () => void;
  reviewSubmitting?: boolean;
}) {
  return (
    <>
      <Button onClick={onReject} color="error" disabled={reviewSubmitting}>
        拒绝
      </Button>
      <Button onClick={onApprove} variant="contained" disabled={reviewSubmitting}>
        通过
      </Button>
    </>
  );
}

function ReviewDialogContent({
  showForm,
  reviewNotes,
  reviewRejectionReason,
  reviewSubmitting,
  onReviewNotesChange,
  onReviewRejectionReasonChange,
}: {
  showForm: boolean;
  reviewNotes: string;
  reviewRejectionReason: string;
  reviewSubmitting: boolean;
  onReviewNotesChange?: (value: string) => void;
  onReviewRejectionReasonChange?: (value: string) => void;
}) {
  return (
    <>
      {showForm && (
        <ReviewForm
          reviewNotes={reviewNotes}
          reviewRejectionReason={reviewRejectionReason}
          reviewSubmitting={reviewSubmitting}
          onReviewNotesChange={(value) => onReviewNotesChange?.(value)}
          onReviewRejectionReasonChange={(value) => onReviewRejectionReasonChange?.(value)}
        />
      )}
    </>
  );
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

  const title = getDialogTitle(mode);
  const showForm = shouldShowReviewForm(showReviewForm, mode);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{title}</DialogTitle>
      <MuiDialogContent dividers>
        <DialogContent
          application={application}
          mode={mode}
          loading={loading}
          error={error}
        />
        <ReviewDialogContent
          showForm={showForm}
          reviewNotes={reviewNotes}
          reviewRejectionReason={reviewRejectionReason}
          reviewSubmitting={reviewSubmitting}
          onReviewNotesChange={onReviewNotesChange}
          onReviewRejectionReasonChange={onReviewRejectionReasonChange}
        />
      </MuiDialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={reviewSubmitting}>
          关闭
        </Button>

        {showForm && (
          <ReviewActions
            onApprove={onApprove}
            onReject={onReject}
            reviewSubmitting={reviewSubmitting}
          />
        )}
      </DialogActions>
    </Dialog>
  );
}

export default ParkApplicationDetailDialog;
