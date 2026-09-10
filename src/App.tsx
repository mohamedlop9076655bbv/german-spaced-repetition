import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { DeckView } from './pages/DeckView';
import { Review } from './pages/Review';
import { UpdatePassword } from './pages/UpdatePassword';
import { NotificationTracker } from './components/NotificationTracker';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return (
    <>
      <NotificationTracker />
      {children}
    </>
  );
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/update-password" element={<UpdatePassword />} />
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/deck/:deckId" 
        element={
          <ProtectedRoute>
            <DeckView />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/review/:deckId" 
        element={
          <ProtectedRoute>
            <Review />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
