// src/components/ParkApplicationFlowDialog/AuditLogsTable.tsx
import {
  Alert,
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { AuditLog } from '../../../types/parkApplication';
import { formatDateTime } from '../../../utils/parkApplication';

const ACTION_LABELS: Record<string, string> = {
  submitted: '提交申请',
  approved: '批准',
  rejected: '拒绝',
  reverted_approved: '撤销批准',
  reverted_rejected: '撤销拒绝',
  pota_synced: '同步到POTA',
};

const STATUS_LABELS: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '未通过',
  pota_synced: '已上传POTA',
};

interface AuditLogsTableProps {
  auditLogs: AuditLog[];
  auditLogsLoading: boolean;
  auditLogsError: string | null;
}

function AuditLogsTable({ auditLogs, auditLogsLoading, auditLogsError }: AuditLogsTableProps) {
  const getRoleDisplayName = (role: string) => {
    const roleMap: Record<string, string> = {
      system_admin: '系统管理员',
      pota_representative: 'POTA 代表',
      reviewer: '审核员',
    };
    return roleMap[role] || role;
  };

  return (
    <Box>
      {auditLogsLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {auditLogsError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {auditLogsError}
        </Alert>
      )}

      {!auditLogsLoading && !auditLogsError && auditLogs.length === 0 && (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          暂无流程节点变动记录
        </Typography>
      )}

      {!auditLogsLoading && !auditLogsError && auditLogs.length > 0 && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>时间</TableCell>
              <TableCell>操作</TableCell>
              <TableCell>操作者</TableCell>
              <TableCell>状态变化</TableCell>
              <TableCell>备注</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {auditLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {formatDateTime(log.created_at)}
                </TableCell>
                <TableCell>{ACTION_LABELS[log.action] || log.action}</TableCell>
                <TableCell>
                  {log.operator_callsign} ({getRoleDisplayName(log.operator_role)})
                </TableCell>
                <TableCell>
                  {log.old_status
                    ? `${STATUS_LABELS[log.old_status as string] || log.old_status} → ${
                          STATUS_LABELS[log.new_status as string] || log.new_status
                        }`
                    : STATUS_LABELS[log.new_status as string] || log.new_status}
                </TableCell>
                <TableCell>{log.notes || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}

export default AuditLogsTable;