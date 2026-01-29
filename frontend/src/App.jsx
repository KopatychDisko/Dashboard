import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import BotSelectionPage from './pages/BotSelectionPage'
import AccountSwitchGuide from './pages/AccountSwitchGuide'

function AppRoutes() {
  const { user, loading, isAuthenticated } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-white/30 border-t-emerald-400 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={<LoginPage />}
      />
      <Route 
        path="/bots" 
        element={<BotSelectionPage />}
      />
      <Route 
        path="/dashboard/:botId" 
        element={
          isAuthenticated ? <DashboardPage /> : <Navigate to="/login" replace />
        } 
      />
      <Route 
        path="/account-switch" 
        element={<AccountSwitchGuide />}
      />
      <Route 
        path="/" 
        element={
          <Navigate to={isAuthenticated ? "/bots" : "/login"} replace />
        } 
      />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App