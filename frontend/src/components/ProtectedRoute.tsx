import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { token } = useAuth();

  if (!token) {
    // User not authenticated
    return <Navigate to="/login" replace />;
  }

  // User is authenticated, render the child route element
  // If children are provided, render them, otherwise render the Outlet for nested routes
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;

