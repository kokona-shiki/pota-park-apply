// src/components/ParkApplicationDetailDialog/ReviewForm.tsx
import { TextField, Box } from '@mui/material';

interface ReviewFormProps {
  reviewNotes: string;
  reviewRejectionReason: string;
  onReviewNotesChange: (value: string) => void;
  onReviewRejectionReasonChange: (value: string) => void;
  reviewSubmitting?: boolean;
}

function ReviewForm({
  reviewNotes,
  reviewRejectionReason,
  onReviewNotesChange,
  onReviewRejectionReasonChange,
  reviewSubmitting,
}: ReviewFormProps) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
      <TextField
        label="审核备注（必填）"
        value={reviewNotes}
        onChange={(e) => onReviewNotesChange(e.target.value)}
        multiline
        minRows={2}
        disabled={reviewSubmitting}
      />
      <TextField
        label="拒绝原因（拒绝时必填）"
        value={reviewRejectionReason}
        onChange={(e) => onReviewRejectionReasonChange(e.target.value)}
        multiline
        minRows={2}
        disabled={reviewSubmitting}
      />
    </Box>
  );
}

export default ReviewForm;