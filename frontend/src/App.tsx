// frontend/src/App.tsx
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
  console.log('PaymentCheckWrapper: isLoading:', isLoading, 'user:', user);

  if (isLoading) {
    return <div>Checking payment status...</div>; // Or a spinner
  }

  if (user && user.paymentStatus !== 'paid') {
    console.log('PaymentCheckWrapper: Redirecting to /payment');
    return <Navigate to="/payment" replace />;
  }
  console.log('PaymentCheckWrapper: Rendering Outlet');
  return <Outlet />;
};

function App() {
  const { token, user, isLoading } = useAuth();

  // Log initial values from useAuth as soon as App component renders or re-renders
  console.log('App.tsx: Initial useAuth values - isLoading:', isLoading, 'token:', token, 'user:', user);

  if (isLoading) {
    console.log('App.tsx: Global isLoading is true, showing loading screen.');
    return <div>Loading application...</div>; // Global loading state
  }

  // Log values after isLoading is false
  console.log('App.tsx: After isLoading check - token:', token, 'user:', user);

  return (
    <Routes>
      <Route path="/login" element={!token ? <LoginPage /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!token ? <RegistrationPage /> : <Navigate to="/dashboard" />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/payment" element={user?.paymentStatus !== 'paid' ? <PaymentPage /> : <Navigate to="/dashboard" />} />
        <Route path="/payment-success" element={<PaymentSuccessPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<PaymentCheckWrapper />}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>
      </Route>

      <Route path="*" element={
          !token ? (
            <Navigate to="/login" replace />
          ) : user?.paymentStatus !== 'paid' ? (
            <Navigate to="/payment" replace />
          ) : (
            <Navigate to="/dashboard" replace />
          )
      } />
    </Routes>
  );
}

export default App;

