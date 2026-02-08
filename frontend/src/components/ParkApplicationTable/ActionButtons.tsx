// src/components/ParkApplicationTable/ActionButtons.tsx
import { Box } from '@mui/material';
import type { ParkApplication } from '../../types/parkApplication';

interface ActionButtonsProps {
  onDetailClick: (app: ParkApplication) => void;
  onFlowClick?: (app: ParkApplication) => void;
  onReviewClick?: (app: ParkApplication) => void;
}

function ActionButtons({
  onDetailClick,
  onFlowClick,
  onReviewClick,
}: ActionButtonsProps) {
  return (
    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
      <Box
        component="button"
        onClick={onDetailClick}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 0.5,
          px: 1.5,
          py: 0.75,
          cursor: 'pointer',
          backgroundColor: 'background.paper',
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
      >
        详情
      </Box>
      {onFlowClick && (
        <Box
          component="button"
          onClick={onFlowClick}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 0.5,
            px: 1.5,
            py: 0.75,
            cursor: 'pointer',
            backgroundColor: 'background.paper',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          流程
        </Box>
      )}
      {onReviewClick && (
        <Box
          component="button"
          onClick={onReviewClick}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 0.5,
            px: 1.5,
            py: 0.75,
            cursor: 'pointer',
            backgroundColor: 'background.paper',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          审核
        </Box>
      )}
    </Box>
  );
}

export default ActionButtons;