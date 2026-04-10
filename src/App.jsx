import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreditCard } from 'lucide-react';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardOverview from './pages/DashboardOverview';
import FarmsPage from './pages/FarmsPage';
import FarmDetailsPage from './pages/FarmDetailsPage';
import WeatherRiskPage from './pages/WeatherRiskPage';
import ResiliencePage from './pages/ResiliencePage';
import CarbonCreditPage from './pages/CarbonCreditPage';
import DiagnosisPage from './pages/DiagnosisPage';
import LivestockPage from './pages/LivestockPage';
import { LivestockDetailsPage } from './pages/LivestockDetailsPage';
import LivestockHealthPage from './pages/LivestockHealthPage';
import LivestockHealthRecordsPage from './pages/LivestockHealthRecordsPage';
import LivestockDiagnosisPage from './pages/LivestockDiagnosisPage';
import LivestockFeedingPage from './pages/LivestockFeedingPage';
import LivestockBreedingPage from './pages/LivestockBreedingPage';
import LivestockInventoryPage from './pages/LivestockInventoryPage';
import VetConsultationPage from './pages/VetConsultationPage';
import DashboardLayout from './components/DashboardLayout';
import { Button } from './components/ui/Button';
import useAuthStore from './store/authStore';

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? (
    <DashboardLayout>{children}</DashboardLayout>
  ) : (
    <Navigate to="/login" />
  );
};

const PublicRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <Navigate to="/dashboard" /> : children;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardOverview />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/farms" 
            element={
              <ProtectedRoute>
                <FarmsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/farms/:farmId" 
            element={
              <ProtectedRoute>
                <FarmDetailsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/weather" 
            element={
              <ProtectedRoute>
                <WeatherRiskPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/resilience" 
            element={
              <ProtectedRoute>
                <ResiliencePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/credits" 
            element={
              <ProtectedRoute>
                <CarbonCreditPage />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/diagnosis" 
            element={
              <ProtectedRoute>
                <DiagnosisPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/livestock" 
            element={
              <ProtectedRoute>
                <LivestockPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/livestock/:livestockId" 
            element={
              <ProtectedRoute>
                <LivestockDetailsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/livestock-health" 
            element={
              <ProtectedRoute>
                <LivestockHealthRecordsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/livestock/:livestockId/health" 
            element={
              <ProtectedRoute>
                <LivestockHealthPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/livestock-diagnosis" 
            element={
              <ProtectedRoute>
                <LivestockDiagnosisPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/livestock-feeding" 
            element={
              <ProtectedRoute>
                <LivestockFeedingPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/livestock-breeding" 
            element={
              <ProtectedRoute>
                <LivestockBreedingPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/livestock-inventory" 
            element={
              <ProtectedRoute>
                <LivestockInventoryPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/vet-consultation" 
            element={
              <ProtectedRoute>
                <VetConsultationPage />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
