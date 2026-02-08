// src/components/ParkApplicationTable/TableRow.tsx
import { TableCell, TableRow, Chip, Box, Tooltip } from '@mui/material';
import type { ParkApplication } from '../../types/parkApplication';
import { formatDateTime, getStatusMeta, truncateText } from '../../utils/parkApplication';
import regionData from '../../../../shared/region.json';

interface ParkAppTableRowProps {
  app: ParkApplication;
  showApplicantCallsign: boolean;
  showActions: boolean;
  onDetailClick: (app: ParkApplication) => void;
  onFlowClick?: (app: ParkApplication) => void;
  onReviewClick?: (app: ParkApplication) => void;
}

function ParkAppTableRow({
  app,
  showApplicantCallsign,
  showActions,
  onDetailClick,
  onFlowClick,
  onReviewClick,
}: ParkAppTableRowProps) {
  const statusMeta = getStatusMeta(app.status);
  const notes = app.rejection_reason || app.pota_notes || '';
  const notesPreview = truncateText(notes, 24);
  const showNotesTooltip = !!notes && notesPreview !== notes;

  return (
    <TableRow
      key={app.id}
      hover
      sx={{
        height: 'auto',
        '& td': {
          py: 1.5,
        },
        '&:last-child td, &:last-child th': { border: 0 },
        '&:hover': {
          backgroundColor: 'action.hover',
        },
      }}
    >
      <TableCell sx={{ whiteSpace: 'nowrap', width: 160 }}>
        {formatDateTime(app.created_at)}
      </TableCell>

      {showApplicantCallsign && (
        <TableCell
          sx={{
            display: { xs: 'none', sm: 'table-cell' },
            whiteSpace: 'nowrap',
            width: 140,
          }}
        >
          {app.applicant_callsign || '-'}
        </TableCell>
      )}

      <TableCell sx={{ width: 280, maxWidth: 280, verticalAlign: 'top' }}>
        <Box
          sx={{
            display: 'flex',
            gap: 0.5,
            maxWidth: 280,
            overflowX: 'auto',
            '&::-webkit-scrollbar': {
              display: 'none',
            },
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          }}
        >
          {app.provinces && app.provinces.length > 0 ? (
            (app.provinces as string[]).map((code: string) => {
              const province = regionData.find(
                (p: { code: string; name: string }) => p.code === code
              );
              return (
                <Chip
                  key={code}
                  label={`${province ? province.name : ''} (${code})`}
                  size="small"
                  variant="outlined"
                />
              );
            })
          ) : (
            <Tooltip title={app.park_name} arrow>
              <Box sx={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {app.park_name}
              </Box>
            </Tooltip>
          )}
        </Box>
      </TableCell>

      <TableCell
        sx={{
          whiteSpace: 'nowrap',
          width: 100,
          backgroundColor: statusMeta.bgcolor,
          color: statusMeta.color,
        }}
      >
        <Chip
          label={statusMeta.label}
          size="small"
          sx={{
            backgroundColor: statusMeta.bgcolor,
            color: statusMeta.color,
          }}
        />
      </TableCell>

      <TableCell
        sx={{
          whiteSpace: 'nowrap',
          width: 100,
          display: { xs: 'none', md: 'table-cell' },
        }}
      >
        {app.pota_synced_at ? '已同步' : '-'}
      </TableCell>

      <TableCell
        sx={{
          width: 200,
          backgroundColor: 'background.paper',
          fontWeight: 600,
        }}
      >
        <Tooltip title={showNotesTooltip ? notes : ''} arrow>
          <Box sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {notesPreview || '-'}
          </Box>
        </Tooltip>
      </TableCell>

      {showActions && (
        <TableCell align="right" sx={{ whiteSpace: 'nowrap', width: 280 }}>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Box
              component="button"
              onClick={() => onDetailClick(app)}
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
                onClick={() => onFlowClick(app)}
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
                onClick={() => onReviewClick(app)}
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
        </TableCell>
      )}
    </TableRow>
  );
}

export default ParkAppTableRow;