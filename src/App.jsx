import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import CreateTask from './pages/CreateTask';
import TaskDetail from './pages/TaskDetail';
import Departments from './pages/Departments';
import DelegationHistory from './pages/DelegationHistory';
import Settings from './pages/Settings';
import Profile from './pages/Profile';

// Helper component to check auth
const RequireAuth = ({ children }) => {
  const user = sessionStorage.getItem('iwogate_user');
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/create" element={<RequireAuth><CreateTask /></RequireAuth>} />
        <Route path="/history" element={<RequireAuth><DelegationHistory /></RequireAuth>} />
        <Route path="/task/:id" element={<RequireAuth><TaskDetail /></RequireAuth>} />
        <Route path="/departments" element={<RequireAuth><Departments /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
