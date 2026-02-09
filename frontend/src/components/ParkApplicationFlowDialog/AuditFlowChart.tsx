// src/components/ParkApplicationFlowDialog/AuditFlowChart.tsx
import { useTheme, alpha } from '@mui/material/styles';
import { Box } from '@mui/material';
import type { ApplicationStatus } from '../../types/parkApplication';

type AuditFlowNodeId = 'submitted' | 'pending' | 'approved' | 'pota_synced' | 'rejected';

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

function AuditFlowChart({ status }: { status: ApplicationStatus }) {
  const theme = useTheme();
  const { current, next } = getNormalFlowCurrentNext(status);

  const nodeWidth = 120;
  const nodeHeight = 40;
  const nodeSpacing = 160;
  const startX = 80;
  const normalFlowY = 50;
  const rejectedY = 150;

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

  const nodeHalfWidth = nodeWidth / 2;
  const nodeHalfHeight = nodeHeight / 2;
  const edgeOffset = 35;

  const svgWidth = startX + nodeSpacing * 3 + nodeWidth + 40;
  const svgHeight = 200;

  return (
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ maxWidth: '100%', height: 'auto' }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="currentColor"
            />
          </marker>
        </defs>

        {edges.map((edge, idx) => {
          const from = findNode(edge.from);
          const to = findNode(edge.to);
          const isHighlighted =
            (edge.from === current && edge.to === next) ||
            (edge.from === 'pending' && edge.to === 'rejected' && status === 'rejected');

          const isVertical = edge.from === 'pending' && edge.to === 'rejected';

          let points: string;

          if (isVertical) {
            const x1 = from.x;
            const y1 = from.y + nodeHalfHeight;
            const x2 = to.x;
            const y2 = to.y - nodeHalfHeight;
            const midY = y1 + edgeOffset;
            points = `${x1},${y1} ${x1},${midY} ${x2},${midY} ${x2},${y2}`;
          } else {
            const x1 = from.x + nodeHalfWidth;
            const y1 = from.y;
            const x2 = to.x - nodeHalfWidth;
            const y2 = to.y;
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

        {nodes.map((node) => {
          const style = getNodeStyle(node.id);
          return (
            <g key={node.id}>
              <rect
                x={node.x}
                y={node.y}
                width={nodeWidth}
                height={nodeHeight}
                rx={4}
                fill={style.bgcolor}
                stroke={style.borderColor}
                strokeWidth={style.borderWidth}
              />
              <text
                x={node.x + nodeWidth / 2}
                y={node.y + nodeHeight / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="12"
                fill="currentColor"
              >
                {node.id === 'submitted' && '提交申请'}
                {node.id === 'pending' && '待审核'}
                {node.id === 'approved' && '已通过'}
                {node.id === 'pota_synced' && '已上传 POTA'}
                {node.id === 'rejected' && '未通过'}
              </text>
            </g>
          );
        })}
      </svg>
    </Box>
  );
}

export default AuditFlowChart;