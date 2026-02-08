import { Box, TableCell, TableRow, Tooltip } from '@mui/material';
import type { ParkApplication } from '../../types/parkApplication';
import { formatDateTime, getStatusMeta, truncateText } from '../../utils/parkApplication';
import ActionButtons from './ActionButtons';
import ParkNameCell from './ParkNameCell';
import StatusCell from './StatusCell';

interface ParkAppTableRowProps {
  app: ParkApplication;
  showApplicantCallsign: boolean;
  showActions: boolean;
  onDetailClick: (app: ParkApplication) => void;
  onFlowClick?: (app: ParkApplication) => void;
  onReviewClick?: (app: ParkApplication) => void;
}

function getNotes(app: ParkApplication) {
  return app.rejection_reason || app.pota_notes || '';
}

function getNotesPreview(notes: string) {
  return truncateText(notes, 24);
}

function shouldShowNotesTooltip(notes: string, notesPreview: string) {
  return !!notes && notesPreview !== notes;
}

function getPotaSyncedStatus(app: ParkApplication) {
  return app.pota_synced_at ? '已同步' : '-';
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
  const notes = getNotes(app);
  const notesPreview = getNotesPreview(notes);
  const showNotesTooltip = shouldShowNotesTooltip(notes, notesPreview);
  const potaSyncedStatus = getPotaSyncedStatus(app);

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
        <ParkNameCell
          provinces={app.provinces as string[] | null}
          parkName={app.park_name}
        />
      </TableCell>

      <StatusCell statusMeta={statusMeta} />

      <TableCell
        sx={{
          whiteSpace: 'nowrap',
          width: 100,
          display: { xs: 'none', md: 'table-cell' },
        }}
      >
        {potaSyncedStatus}
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
          <ActionButtons
            onDetailClick={() => onDetailClick(app)}
            onFlowClick={onFlowClick ? () => onFlowClick(app) : undefined}
            onReviewClick={onReviewClick ? () => onReviewClick(app) : undefined}
          />
        </TableCell>
      )}
    </TableRow>
  );
}

export default ParkAppTableRow;
