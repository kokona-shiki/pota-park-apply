// src/components/TopBar.jsx
import React, { useState, useContext } from 'react';
import { AppBar, Toolbar, IconButton, Typography, Avatar, Menu, MenuItem, Button } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';

function TopBar({ isSidebarOpen, setIsSidebarOpen }) {
  const { user, setUser } = useContext(AuthContext);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();

  const handleMenu = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
  };

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <IconButton color="inherit" onClick={() => setIsSidebarOpen(!isSidebarOpen)} edge="start" sx={{ mr: 2 }}>
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          POTA公园申请网站
        </Typography>
        {/* Logo placeholder */}
        {/* <img src="logo.png" alt="Logo" style={{ height: 40, marginRight: 10 }} /> */}
        {user ? (
          <>
            <IconButton onClick={handleMenu} color="inherit">
              <Avatar src={user.avatar} />
              <Typography sx={{ ml: 1 }}>{user.username}</Typography>
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
              <MenuItem onClick={() => { handleClose(); navigate('/user-info'); }}>用户信息</MenuItem>
              <MenuItem onClick={() => { handleClose(); navigate('/user-info'); }}>修改信息</MenuItem>
              <MenuItem onClick={handleLogout}>登出</MenuItem>
              {user.user_group === 'admin' && <MenuItem onClick={() => { handleClose(); navigate('/applications'); }}>配置网站</MenuItem>}
              {user.user_group === 'sysadmin' && <MenuItem onClick={() => { handleClose(); navigate('/admin-panel'); }}>管理网站</MenuItem>}
            </Menu>
          </>
        ) : (
          <>
            <Button color="inherit" onClick={() => navigate('/login')}>登录</Button>
            <Button color="inherit" onClick={() => navigate('/register')}>注册</Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
}

export default TopBar;