// src/components/ParkApplicationFlowDialog.tsx
import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { ApplicationAuditLogsDataSchema } from '../../../shared/schemas/parkApplication';
import { apiClient, requestWithSchema } from '../services/apiClient';
import type { ParkApplication, AuditLog } from '../types/parkApplication';
import { getStatusMeta } from '../utils/parkApplication';
import AuditFlowChart from './ParkApplicationFlowDialog/AuditFlowChart';
import AuditLogsTable from './ParkApplicationFlowDialog/AuditLogsTable';

interface ParkApplicationFlowDialogProps {
  open: boolean;
  onClose: () => void;
  application: ParkApplication | null;
}

export function ParkApplicationFlowDialog({
  open,
  onClose,
  application,
}: ParkApplicationFlowDialogProps) {
  const [flowTab, setFlowTab] = useState(0);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [auditLogsError, setAuditLogsError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !application) return;

    const loadAuditLogs = async () => {
      try {
        setAuditLogsLoading(true);
        setAuditLogsError(null);
        const payload = await requestWithSchema(
          apiClient.get(`/api/park-applications/${application.id}/audit-logs`),
          ApplicationAuditLogsDataSchema
        );
        setAuditLogs(payload.logs || []);
      } catch (e: unknown) {
        setAuditLogsError('获取审核日志失败');
      } finally {
        setAuditLogsLoading(false);
      }
    };

    loadAuditLogs();
  }, [open, application]);

  if (!application) return null;

  const statusMeta = getStatusMeta(application.status);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>流程信息</DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <Tabs
          value={flowTab}
          onChange={(_, newValue) => setFlowTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="流程图" />
          <Tab label="流程节点变动信息" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {flowTab === 0 && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                当前状态：{statusMeta.label}
              </Typography>
              {application.status === 'rejected' && (
                <Alert severity="info" variant="outlined">
                  该申请当前处于"未通过"，不在正常流程（提交申请 → 待审核 → 已通过 → 已上传
                  POTA）上，因此不会高亮当前/下一节点。
                </Alert>
              )}
              <AuditFlowChart status={application.status} />
            </Stack>
          )}

          {flowTab === 1 && (
            <AuditLogsTable
              auditLogs={auditLogs}
              auditLogsLoading={auditLogsLoading}
              auditLogsError={auditLogsError}
            />
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}