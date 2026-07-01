import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const ProtectedRoute = ({ allowedRoles }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/" replace />;
  }

  // Role-Based Access Control
  if (allowedRoles && allowedRoles.length > 0) {
    const userEmail = session.user?.email?.toLowerCase() || '';
    
    // Check if the user's email contains any of the allowed roles (e.g., 'admin' or 'fitter')
    const hasRole = allowedRoles.some(role => userEmail.includes(role));
    
    if (!hasRole) {
      // If they are not allowed here, bounce them to their correct dashboard
      if (userEmail.includes('admin')) return <Navigate to="/admin" replace />;
      if (userEmail.includes('fitter')) return <Navigate to="/fitter" replace />;
      return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
