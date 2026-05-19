import React from 'react';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import { Spin } from 'antd';
import "./style/Layout.css";
import Dialpad from '../../components/Dialpad';

const Layout = ({ children }) => {

  // If user is not loaded yet, show loading spinner
  // if (!user) {
  //   return (
  //     <div className="layout_loading_container">
  //       <Spin size="large" />
  //       <p className="layout_loading_text">Loading...</p>
  //     </div>
  //   );
  // }

  return (
    <div className="layout_container">
      <Navbar />
      <div className="layout_children">
        <Sidebar />
        {children}
        <Dialpad />
      </div>
    </div>
  );
}

export default Layout;
