// src/components/SideBar/SideBarHeader.tsx
import { Toolbar, Typography } from '@mui/material';

const SideBarHeader = () => {
  return (
    <>
      <Toolbar />
      <Typography variant="h6" sx={{ p: 2 }}>
        POTA公园申请
      </Typography>
    </>
  );
};

export default SideBarHeader;