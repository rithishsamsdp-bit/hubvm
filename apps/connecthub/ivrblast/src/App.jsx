import React, { useState, useEffect } from 'react';
import "./App.css"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider, Spin, message } from 'antd';

import { Error, Login, Layout } from './pages/common';
import userContext from './Contexter';
import { useNodesState } from 'reactflow';
import { useAuthStore } from './store/useAuthStore.js';


//user
import Users from "./pages/User/Users.jsx";

import Settings from './pages/settings/Settings.jsx';

import Ivrblast from './pages/IvrBlast/Ivrblast.jsx';

// import Livedashboard from './pages/Dashboard/Livedashboard.jsx';

import Livedashboard from './pages/dashboard/Livedashboard.jsx';

import Onboard from './pages/Onboard/Onboard.jsx';
import Queue from "./pages/Queue.jsx";
import Report from "./pages/Report.jsx";
const initialNodes = [
  {
    id: "1",
    type: "IvrStart",
    data: { value: "IVR Flow Start" },
    position: { x: 300, y: 30 }
  }
];

const App = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [objectEdit, setObjectEdit] = useState({});
  const [initialEdges, setinitialEdges] = useState();
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();
  const [messageApi, contextHolder] = message.useMessage();





  useEffect(() => {
    checkAuth();
    console.log("running")
  }, [checkAuth])

  console.log({authUser})
  const role = 'tl';

  if (isCheckingAuth && !authUser) {
    return (
      <div className='App_loading_container'>
        <Spin size="large" />
      </div>
    )
  }


  return (
    <userContext.Provider value={{
      nodes, setNodes, onNodesChange,
      objectEdit, setObjectEdit, initialEdges, setinitialEdges
    }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={!authUser ? <Navigate to="/login" /> : <Navigate to="/dashboard" />} />
          <Route path='/login' element={!authUser ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/Onboard" element={<Onboard />} />

          <Route path="/*" element={authUser ?
            <Layout>
              <Routes>

                <Route path="/dashboard" element={<Livedashboard />} />
                {role !== 'agent' && (
                  <>
                    <Route path="/users" element={<Users />} />
                    <Route path="/queue" element={<Queue />} />
                  </>
                )}
                <Route path="/report" element={<Report />} />
                <Route path="/ivrblast/:item" element={<Ivrblast />} />
                <Route path="/settings/:item" element={<Settings />} />
                <Route path='*' element={<Error />} />
              </Routes>
            </Layout> : <Navigate to="/login" />
          } />



          <Route path='*' element={<Error />} />
        </Routes>
      </BrowserRouter>
    </userContext.Provider>

  );
}

export default App;
