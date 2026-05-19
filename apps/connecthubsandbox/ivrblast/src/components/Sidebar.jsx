import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './style/Sidebar.css';

// Icons
import { RxDashboard } from 'react-icons/rx';
import { FaUser } from 'react-icons/fa';
import { HiUserGroup } from 'react-icons/hi';
import { TbReportAnalytics } from 'react-icons/tb';
import { IoSettingsSharp } from 'react-icons/io5';
import { HiSpeakerphone } from "react-icons/hi";

const  Sidebar = () => {

  const [activeMenu, setActiveMenu] = useState('');


  const navigate = useNavigate();


  const location = useLocation();


  const role = 'tl';

  const menuItemsTL = [
    { id: 'dashboard', icon: <RxDashboard />, label: 'Dashboard', route: '/dashboard' },
    { id: 'users', icon: <FaUser />, label: 'Users', route: '/users' },
    { id: 'queue', icon: <HiUserGroup />, label: 'Queue', route: '/queue' },
    { id: 'report', icon: <TbReportAnalytics />, label: 'Report', route: '/report' },
    { id: 'settings', icon: <IoSettingsSharp />, label: 'Settings', route: '/settings/skill' },
    { id: 'ivrblast', icon: <HiSpeakerphone />, label: 'Ivrblast', route: '/ivrblast/campaigncreation' },
  ];

  const menuItemsAgent = [
    { id: 'dashboard', icon: <RxDashboard />, label: 'Dashboard', route: '/dashboard' },
    { id: 'report', icon: <TbReportAnalytics />, label: 'Report', route: '/report' },
    { id: 'settings', icon: <IoSettingsSharp />, label: 'Settings', route: '/settings/skill' }
  ];

  const menuItemsAdmin = [
    { id: 'dashboard', icon: <RxDashboard />, label: 'Dashboard', route: '/dashboard' },
    { id: 'user', icon: <FaUser />, label: 'User', route: '/user' },
    { id: 'queue', icon: <HiUserGroup />, label: 'Queue', route: '/queue' },
    { id: 'report', icon: <TbReportAnalytics />, label: 'Report', route: '/report' },
    { id: 'settings', icon: <IoSettingsSharp />, label: 'Settings', route: '/settings/skill' },
    { id: 'admin', icon: <IoSettingsSharp />, label: 'Admin', route: '/admin' },
    { id: 'ivrblast', icon: <HiSpeakerphone />, label: 'Ivrblast', route: '/ivrblast/campaigncreation' },
  ];


  const menuItems = role === 'admin' ? menuItemsAdmin : role === 'tl' ? menuItemsTL : menuItemsAgent;

  useEffect(() => {
    setActiveMenu('')
    const currentPath = location.pathname;
    let value = currentPath.split('/')[1];
    const activeItem = menuItems.find(item => value.includes(item.id));
    if (activeItem) {
      setActiveMenu(activeItem.id);
    }
  }, [location.pathname, menuItems]);


  const handleMenuClick = (id, route) => {
    if (id != activeMenu) {
      setActiveMenu('')
      setActiveMenu(id);
      navigate(route);
    }

  };

  return (
    <div className='sidebar_container'>
      <div className='sidebar_menu_wrapper'>
        {menuItems.map(({ id, icon, label, route }) => (
          <div
            key={id}
            className={`sidebar_menu ${activeMenu === id ? 'active' : ''}`}
            onClick={() => handleMenuClick(id, route)}
          >
            <div className={`sidebar_menu_icon ${activeMenu === id ? 'active' : ''}`}>{icon}</div>
            <p className='sidebar_menu_name'>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Sidebar;
