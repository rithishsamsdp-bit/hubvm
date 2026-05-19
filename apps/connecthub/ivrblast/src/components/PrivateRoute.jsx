import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';

const PrivateRoute = () => {
    const token = useSelector((state) => state.tokenInfo.token);
    if (!token) {
        return <Navigate to="/login" />
    }
    return <Outlet />
}


export default PrivateRoute
