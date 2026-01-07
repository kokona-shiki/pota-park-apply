// src/pages/About.tsx
import { Paper, Typography, Link, Box } from '@mui/material';

function About() {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        关于
      </Typography>
      <Typography sx={{ mb: 2 }}>
        本站用于提交与审核 POTA 公园信息（第一期版本）。
      </Typography>
      <Box>
        <Typography variant="body2" color="text.secondary">
          POTA: <Link href="https://pota.app" target="_blank" rel="noreferrer">https://pota.app</Link>
        </Typography>
      </Box>
    </Paper>
  );
}

export default About;
