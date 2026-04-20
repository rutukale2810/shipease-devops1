import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from './AuthContext';

export const PrivateRoute = ({ allowedRoles }) => {
  const { token, user } = useContext(AuthContext);

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const currentRole = user?.role || 'user';
    if (!allowedRoles.includes(currentRole)) {
      return <Navigate to={currentRole === 'driver' ? '/driver' : '/bookings'} />;
    }
  }

  return <Outlet />;
};
