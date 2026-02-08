// src/components/ParkApplicationDetailDialog/ReviewForm.tsx
import { TextField, Box } from '@mui/material';

interface ReviewFormProps {
  reviewNotes: string;
  reviewRejectionReason: string;
  reviewSubmitting: boolean;
  onReviewNotesChange: (value: string) => void;
  onReviewRejectionReasonChange: (value: string) => void;
}

function ReviewForm({
  reviewNotes,
  reviewRejectionReason,
  reviewSubmitting,
  onReviewNotesChange,
  onReviewRejectionReasonChange,
}: ReviewFormProps) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
      <TextField
        label="审核备注（必填）"
        value={reviewNotes}
        onChange={(e) => onReviewNotesChange(e.target.value)}
        multiline
        minRows={2}
      />
      <TextField
        label="拒绝原因（拒绝时必填）"
        value={reviewRejectionReason}
        onChange={(e) => onReviewRejectionReasonChange(e.target.value)}
        multiline
        minRows={2}
      />
    </Box>
  );
}

export default ReviewForm;