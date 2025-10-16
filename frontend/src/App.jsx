import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import BotSelectionPage from './pages/BotSelectionPage'
import LoadingSpinner from './components/LoadingSpinner'

function AppRoutes() {
  const { user, loading, isAuthenticated } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Загрузка..." />
      </div>
    )
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={
          isAuthenticated ? <Navigate to="/bots" replace /> : <LoginPage />
        } 
      />
      <Route 
        path="/bots" 
        element={
          isAuthenticated ? <BotSelectionPage /> : <Navigate to="/login" replace />
        } 
      />
      <Route 
        path="/dashboard/:botId" 
        element={
          isAuthenticated ? <DashboardPage /> : <Navigate to="/login" replace />
        } 
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