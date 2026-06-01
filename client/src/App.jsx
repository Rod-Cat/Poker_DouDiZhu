/**
 * 应用根组件
 * 负责路由管理、认证守卫和全局Provider包裹
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/common/Toast.jsx';
import LoginPage from './pages/LoginPage.jsx';
import LobbyPage from './pages/LobbyPage.jsx';
import RoomPage from './pages/RoomPage.jsx';
import GamePage from './pages/GamePage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import { useAuthStore } from './stores/auth-store.js';

/**
 * 认证守卫组件：未登录用户重定向到登录页
 */
function ProtectedRoute({ children }) {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/lobby" element={
            <ProtectedRoute><LobbyPage /></ProtectedRoute>
          } />
          <Route path="/room" element={
            <ProtectedRoute><RoomPage /></ProtectedRoute>
          } />
          <Route path="/game" element={
            <ProtectedRoute><GamePage /></ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute><SettingsPage /></ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
