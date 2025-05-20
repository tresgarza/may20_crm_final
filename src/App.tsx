import * as React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PermissionsProvider } from './contexts/PermissionsContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import HealthCheck from './components/HealthCheck';
import Login from './pages/auth/Login';
import Dashboard from './pages/Dashboard';
import Applications from './pages/Applications';
import ApplicationsKanban from './pages/ApplicationsKanban';
import ApplicationDetail from './pages/ApplicationDetail';
import ApplicationForm from './pages/ApplicationForm';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import NewClient from './pages/NewClient';
import EditClient from './pages/EditClient';
import Reports from './pages/Reports';
import Users from './pages/Users';
import UserForm from './pages/UserForm';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import Companies from './pages/Companies';
import Notifications from './pages/Notifications';
import Messages from './pages/Messages';
import Admin from './pages/Admin';
import { initDbStructureCheck } from './utils/dbStructureCheck';
import { runAdvisorIdMigration } from './utils/runMigrations';

const App: React.FC = () => {
  // Check and set up required database structure
  React.useEffect(() => {
    const checkDbStructure = async () => {
      try {
        await initDbStructureCheck();
        console.log('Database structure check completed successfully');
        
        // Run advisor ID migration in the background (won't affect app startup)
        runAdvisorIdMigration().then(success => {
          if (success) {
            console.log('Advisor ID migration completed successfully');
          } else {
            console.warn('Advisor ID migration failed or was skipped');
          }
        }).catch(error => {
          console.error('Error running advisor ID migration:', error);
        });
      } catch (error) {
        console.error('Error checking database structure:', error);
      }
    };

    checkDbStructure();
  }, []);

  // Add event listener to track if user has interacted with the page
  // This helps with browser autoplay restrictions
  React.useEffect(() => {
    const markUserInteraction = () => {
      document.documentElement.setAttribute('data-user-interacted', 'true');
    };

    // Listen for common user interaction events
    const events = ['click', 'keydown', 'mousedown', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, markUserInteraction, { once: true });
    });

    // Clean up event listeners
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, markUserInteraction);
      });
    };
  }, []);

  return (
    <Router>
      <AuthProvider>
        <PermissionsProvider>
          <NotificationProvider>
            <HealthCheck />
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              
              {/* Protected routes */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/applications"
                element={
                  <ProtectedRoute>
                    <Applications />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/applications/kanban"
                element={
                  <ProtectedRoute>
                    <ApplicationsKanban />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/applications/new"
                element={
                  <ProtectedRoute>
                    <ApplicationForm />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/applications/:id"
                element={
                  <ProtectedRoute>
                    <ApplicationDetail />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/applications/:id/edit"
                element={
                  <ProtectedRoute>
                    <ApplicationForm />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/clients"
                element={
                  <ProtectedRoute>
                    <Clients />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/clients/new"
                element={
                  <ProtectedRoute>
                    <NewClient />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/clients/:id"
                element={
                  <ProtectedRoute>
                    <ClientDetail />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/clients/:id/edit"
                element={
                  <ProtectedRoute>
                    <EditClient />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <Reports />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/users"
                element={
                  <ProtectedRoute>
                    <Users />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/users/new"
                element={
                  <ProtectedRoute>
                    <UserForm />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/users/:id/edit"
                element={
                  <ProtectedRoute>
                    <UserForm />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/companies"
                element={
                  <ProtectedRoute>
                    <Companies />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <Notifications />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/messages"
                element={
                  <ProtectedRoute>
                    <Messages />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/messages/:userId"
                element={
                  <ProtectedRoute>
                    <Messages />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <Admin />
                  </ProtectedRoute>
                }
              />
              
              {/* 404 page */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </NotificationProvider>
        </PermissionsProvider>
      </AuthProvider>
    </Router>
  );
};

export default App; 