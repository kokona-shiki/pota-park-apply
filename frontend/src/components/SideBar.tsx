// src/components/SideBar.tsx
import {
  Drawer,
} from '@mui/material';
import { useAuth } from '../auth/useAuth';
import SideBarHeader from './SideBar/SideBarHeader';
import GuestMenu from './SideBar/GuestMenu';
import UserMenu from './SideBar/UserMenu';
import AdminMenu from './SideBar/AdminMenu';
import PotaMenu from './SideBar/PotaMenu';

interface SideBarProps {
  isOpen: boolean;
  isAdmin: boolean;
  isSysAdmin: boolean;
  isPotaRepresentative: boolean;
}

function SideBar({ isOpen, isSysAdmin, isPotaRepresentative }: SideBarProps) {
  const { user } = useAuth();

  return (
    <>
      <Drawer
        variant="persistent"
        anchor="left"
        open={isOpen}
        sx={{
          width: 240,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: 240 },
        }}
      >
        <SideBarHeader />

        {/* 未登录用户 */}
        {!user ? (
          <GuestMenu />
        ) : (
          // 登录用户根据角色显示不同菜单
          <>
            {/* 系统管理员 */}
            {isSysAdmin ? (
              <AdminMenu />
            ) : isPotaRepresentative ? (
              // POTA 代表
              <PotaMenu />
            ) : (
              // 普通登录用户
              <UserMenu />
            )}
          </>
        )}
      </Drawer>
    </>
  );
}

export default SideBar;
