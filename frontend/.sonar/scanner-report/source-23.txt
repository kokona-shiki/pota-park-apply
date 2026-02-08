// src/components/ParkApplicationFlowDialog.tsx
import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { ApplicationAuditLogsDataSchema } from '../../../shared/schemas/parkApplication';
import { apiClient, requestWithSchema } from '../services/apiClient';
import type { ParkApplication, AuditLog, ApplicationStatus } from '../types/parkApplication';
import { formatDateTime, getStatusMeta } from '../utils/parkApplication';
import { getApiErrorMessage } from '../utils/error';
import { getRoleDisplayName } from '../utils/roleDisplay';

// 操作和状态的中文映射
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

type AuditFlowNodeId = 'submitted' | 'pending' | 'approved' | 'pota_synced' | 'rejected';

const AUDIT_FLOW_LABELS: Record<AuditFlowNodeId, string> = {
  submitted: '提交申请',
  pending: '待审核',
  approved: '已通过',
  pota_synced: '已上传 POTA',
  rejected: '未通过',
};

function getNormalFlowCurrentNext(status: ApplicationStatus): {
  current: Extract<AuditFlowNodeId, 'submitted' | 'pending' | 'approved' | 'pota_synced'> | null;
  next: Extract<AuditFlowNodeId, 'submitted' | 'pending' | 'approved' | 'pota_synced'> | null;
} {
  switch (status) {
    case 'pending':
      return { current: 'pending', next: 'approved' };
    case 'approved':
      return { current: 'approved', next: 'pota_synced' };
    case 'pota_synced':
      return { current: 'pota_synced', next: null };
    case 'rejected':
      return { current: null, next: null };
    default:
      return { current: null, next: null };
  }
}

/**
 * 审核流程图组件
 */
function AuditFlowChart({ status }: { status: ApplicationStatus }) {
  const theme = useTheme();
  const { current, next } = getNormalFlowCurrentNext(status);

  // 节点尺寸和间距
  const nodeWidth = 120;
  const nodeHeight = 40;
  const nodeSpacing = 160; // 节点之间的间距，增大以容纳更大的箭头
  const startX = 80; // 起始 X 坐标，确保第一个节点完整显示
  const normalFlowY = 50; // 正常流程节点的 Y 坐标
  const rejectedY = 150; // rejected 节点的 Y 坐标

  const nodes: Array<{ id: AuditFlowNodeId; x: number; y: number }> = [
    { id: 'submitted', x: startX, y: normalFlowY },
    { id: 'pending', x: startX + nodeSpacing, y: normalFlowY },
    { id: 'approved', x: startX + nodeSpacing * 2, y: normalFlowY },
    { id: 'pota_synced', x: startX + nodeSpacing * 3, y: normalFlowY },
    { id: 'rejected', x: startX + nodeSpacing * 2, y: rejectedY },
  ];

  const edges: Array<{ from: AuditFlowNodeId; to: AuditFlowNodeId }> = [
    { from: 'submitted', to: 'pending' },
    { from: 'pending', to: 'approved' },
    { from: 'pending', to: 'rejected' },
    { from: 'approved', to: 'pota_synced' },
  ];

  const getNodeStyle = (id: AuditFlowNodeId) => {
    if (id === current) {
      return {
        bgcolor: alpha(theme.palette.primary.main, 0.6),
        borderColor: theme.palette.primary.main,
        borderWidth: 2,
      };
    }
    if (id === next) {
      return {
        bgcolor: alpha(theme.palette.success.main, 0.6),
        borderColor: theme.palette.success.main,
        borderWidth: 2,
      };
    }
    if (id === 'rejected' && status === 'rejected') {
      return {
        bgcolor: alpha(theme.palette.error.main, 0.4),
        borderColor: theme.palette.error.main,
        borderWidth: 2,
      };
    }
    return {
      bgcolor: alpha(theme.palette.grey[500], 0.2),
      borderColor: theme.palette.grey[400],
      borderWidth: 1,
    };
  };

  const findNode = (id: AuditFlowNodeId) => nodes.find((n) => n.id === id)!;

  // 节点尺寸常量
  const nodeHalfWidth = nodeWidth / 2;
  const nodeHalfHeight = nodeHeight / 2;
  const edgeOffset = 35; // 折线中间点的固定偏移量，增大以配合更大的箭头

  // 计算 SVG 宽度，确保所有节点都能完整显示
  const svgWidth = startX + nodeSpacing * 3 + nodeWidth + 40; // 最后一个节点宽度 + 右边距
  const svgHeight = 200;

  return (
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ maxWidth: '100%', height: 'auto' }}
      >
        {/* 边 */}
        {edges.map((edge, idx) => {
          const from = findNode(edge.from);
          const to = findNode(edge.to);
          const isHighlighted =
            (edge.from === current && edge.to === next) ||
            (edge.from === 'pending' && edge.to === 'rejected' && status === 'rejected');

          // 判断连接方向
          const isVertical = edge.from === 'pending' && edge.to === 'rejected';

          let points: string;

          if (isVertical) {
            // 垂直连接：从 from 节点下边缘，向下延伸，然后水平转向，最后向上到 to 节点上边缘
            const x1 = from.x;
            const y1 = from.y + nodeHalfHeight;
            const x2 = to.x;
            const y2 = to.y - nodeHalfHeight;
            const midY = y1 + edgeOffset; // 中间点 Y 坐标
            points = `${x1},${y1} ${x1},${midY} ${x2},${midY} ${x2},${y2}`;
          } else {
            // 水平连接：从 from 节点右边缘，向右延伸固定距离，然后垂直转向（如果需要），最后向左到 to 节点左边缘
            const x1 = from.x + nodeHalfWidth;
            const y1 = from.y;
            const x2 = to.x - nodeHalfWidth;
            const y2 = to.y;

            // 使用固定的偏移量，确保所有水平箭头的视觉效果一致
            const midX = x1 + edgeOffset;
            points = `${x1},${y1} ${midX},${y1} ${midX},${y2} ${x2},${y2}`;
          }

          return (
            <polyline
              key={idx}
              points={points}
              fill="none"
              stroke={isHighlighted ? theme.palette.primary.main : theme.palette.grey[400]}
              strokeWidth={isHighlighted ? 3 : 2}
              markerEnd="url(#arrowhead)"
            />
          );
        })}

        {/* 箭头标记 */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="12"
            markerHeight="12"
            refX="10"
            refY="6"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <polygon points="0 0, 12 6, 0 12" fill={theme.palette.grey[600]} />
          </marker>
        </defs>

        {/* 节点 */}
        {nodes.map((node) => {
          const style = getNodeStyle(node.id);
          return (
            <g key={node.id}>
              <rect
                x={node.x - nodeHalfWidth}
                y={node.y - nodeHalfHeight}
                width={nodeWidth}
                height={nodeHeight}
                rx="4"
                fill={style.bgcolor}
                stroke={style.borderColor}
                strokeWidth={style.borderWidth}
              />
              <text
                x={node.x}
                y={node.y + 5}
                textAnchor="middle"
                fontSize="12"
                fontWeight={node.id === current || node.id === next ? 700 : 400}
                fill={theme.palette.text.primary}
              >
                {AUDIT_FLOW_LABELS[node.id]}
              </text>
            </g>
          );
        })}
      </svg>

      <Stack direction="row" spacing={2} sx={{ mt: 2, flexWrap: 'wrap' }}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: 0.5,
              bgcolor: alpha(theme.palette.primary.main, 0.6),
            }}
          />
          <Typography variant="caption" color="text.secondary">
            当前节点（正常流程）
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: 0.5,
              bgcolor: alpha(theme.palette.success.main, 0.6),
            }}
          />
          <Typography variant="caption" color="text.secondary">
            下一节点（正常流程）
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: 0.5,
              bgcolor: alpha(theme.palette.error.main, 0.4),
            }}
          />
          <Typography variant="caption" color="text.secondary">
            未通过（分叉）
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}

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

  // 加载审核日志
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
        setAuditLogsError(getApiErrorMessage(e, '获取审核日志失败'));
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
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}
