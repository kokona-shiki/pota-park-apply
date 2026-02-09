// src/components/ParkApplicationTable/ActionButtons.tsx
import { Button, Box } from '@mui/material';
import type { ParkApplication } from '../../types/parkApplication';

interface ActionButtonsProps {
  onDetailClick: (app: ParkApplication) => void;
  onFlowClick?: (app: ParkApplication) => void;
  onReviewClick?: (app: ParkApplication) => void;
  app: ParkApplication;
}

function ActionButtons({
  onDetailClick,
  onFlowClick,
  onReviewClick,
  app,
}: ActionButtonsProps) {
  return (
    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
      <Button
        variant="outlined"
        size="small"
        onClick={() => onDetailClick(app)}
      >
        详情
      </Button>
      {onFlowClick && (
        <Button
          variant="outlined"
          size="small"
          onClick={() => onFlowClick(app)}
        >
          流程
        </Button>
      )}
      {onReviewClick && (
        <Button
          variant="outlined"
          size="small"
          onClick={() => onReviewClick(app)}
        >
          审核
        </Button>
      )}
    </Box>
  );
}

export default ActionButtons;