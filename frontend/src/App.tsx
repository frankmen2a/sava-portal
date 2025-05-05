import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import LoginPage from './pages/Auth/LoginPage';
import RegistrationPage from './pages/Auth/RegistrationPage';
import { useAuth } from './context/AuthContext';
import DashboardPage from './pages/DashboardPage';
import PaymentPage from './pages/PaymentPage'; // Import PaymentPage
import ProtectedRoute from './components/ProtectedRoute'; // Import ProtectedRoute
import PaymentSuccessPage from './pages/PaymentSuccessPage'; // Import the actual PaymentSuccessPage

// Component to handle payment status check and redirection
const PaymentCheckWrapper: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Checking payment status...</div>; // Or a spinner
  }

  // If user data is available and payment is not 'paid', redirect to payment page
  if (user && user.paymentStatus !== 'paid') {
    return <Navigate to="/payment" replace />;
  }

  // If paid or user data not yet loaded (should be handled by ProtectedRoute outer layer)
  // Render the nested routes (e.g., Dashboard)
  return <Outlet />;
};

// Removed the placeholder PaymentSuccessPage component definition

function App() {
  const { token, user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading application...</div>; // Global loading state
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={!token ? <LoginPage /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!token ? <RegistrationPage /> : <Navigate to="/dashboard" />} />

      {/* Routes requiring login but potentially pending payment */}
      <Route element={<ProtectedRoute />}>
        <Route path="/payment" element={user?.paymentStatus !== 'paid' ? <PaymentPage /> : <Navigate to="/dashboard" />} />
        {/* Use the imported PaymentSuccessPage component */}
        <Route path="/payment-success" element={<PaymentSuccessPage />} />
      </Route>

      {/* Routes requiring login AND payment */}
      <Route element={<ProtectedRoute />}>
        <Route element={<PaymentCheckWrapper />}>
          {/* Add all routes that require payment here */}
          <Route path="/dashboard" element={<DashboardPage />} />
          {/* Add other protected and paid routes here */}
        </Route>
      </Route>

      {/* Fallback route - redirect based on auth and payment status */}
      <Route path="*" element={
          !token ? <Navigate to="/login" replace /> :
          user?.paymentStatus !== 'paid' ? <Navigate to="/payment" replace /> :
          <Navigate to="/dashboard" replace />
      } />
    </Routes>
  );
}

export default App;

