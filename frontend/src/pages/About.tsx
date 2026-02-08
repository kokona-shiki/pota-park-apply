// src/pages/About.tsx
import { Paper, Typography, Link, Box, Card, CardContent, Avatar, Container, Grid, Chip } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import PeopleIcon from '@mui/icons-material/People';
import LinkIcon from '@mui/icons-material/Link';

function About() {
  // 开发者信息
  const developers = [
    {
      callsign: 'BI1QJQ',
      qrzLink: 'https://www.qrz.com/db/BI1QJQ'
    },
    {
      callsign: 'BG0FFH',
      qrzLink: 'https://www.qrz.com/db/BG0FFH'
    },
    {
      callsign: 'BH3XZT',
      qrzLink: 'https://www.qrz.com/db/BH3XZT'
    }
  ];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={0} sx={{ p: 4, borderRadius: 2 }}>
        {/* 项目介绍模块 */}
        <Box sx={{ mb: 6 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <InfoIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h4" component="h1" gutterBottom>
              POTA 中国公园录入系统
            </Typography>
          </Box>
          <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.6 }}>
            本系统专为 POTA (Parks on the Air) 中国公园的录入和审核而设计，致力于为无线电爱好者提供一个便捷的平台，
            用于提交新的公园信息并进行审核管理。
          </Typography>
          <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
            通过本系统，用户可以轻松提交公园申请，管理员可以高效审核和管理公园信息，
            共同促进 POTA 活动在中国的发展。
          </Typography>
        </Box>

        {/* 开发者信息模块 */}
        <Box sx={{ mb: 6 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <PeopleIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h5" component="h2" gutterBottom>
              开发者
            </Typography>
          </Box>
          <Grid container spacing={3}>
            {developers.map((dev, index) => (
              <Grid item xs={12} sm={4} key={index}>
                <Card elevation={1} sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Avatar sx={{ width: 64, height: 64, mx: 'auto', mb: 2, bgcolor: 'primary.light' }}>
                      {dev.callsign.charAt(0)}
                    </Avatar>
                    <Typography variant="h6" gutterBottom>
                      {dev.callsign}
                    </Typography>
                    <Link 
                      href={dev.qrzLink} 
                      target="_blank" 
                      rel="noreferrer" 
                      sx={{ display: 'inline-flex', alignItems: 'center', mt: 1 }}
                    >
                      <Chip 
                        label="QRZ 信息" 
                        size="small" 
                        variant="outlined" 
                        color="primary" 
                        sx={{ '&:hover': { bgcolor: 'primary.lighter' } }}
                      />
                    </Link>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* POTA 官网链接模块 */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <LinkIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h5" component="h2" gutterBottom>
              相关链接
            </Typography>
          </Box>
          <Card elevation={1} sx={{ p: 3 }}>
            <Link 
              href="https://pota.app" 
              target="_blank" 
              rel="noreferrer" 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' }
              }}
            >
              <Box sx={{ mr: 3, p: 2, bgcolor: 'primary.lighter', borderRadius: '50%' }}>
                <LinkIcon sx={{ color: 'primary.main', fontSize: 32 }} />
              </Box>
              <Box>
                <Typography variant="h6" color="primary.main">
                  POTA 官网
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  https://pota.app
                </Typography>
              </Box>
            </Link>
          </Card>
        </Box>
      </Paper>
    </Container>
  );
}

export default About;
