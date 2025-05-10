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
  // It's good to log here too, to see what PaymentCheckWrapper receives
  console.log('PaymentCheckWrapper: MOUNT/RE-RENDER - isLoading:', isLoading, 'user:', JSON.stringify(user, null, 2));

  if (isLoading) {
    // This specific loading state might be redundant if App.tsx has a global one,
    // but can be useful if PaymentCheckWrapper is used independently or if AuthContext isLoading is very granular.
    console.log('PaymentCheckWrapper: isLoading is true, showing checking payment status screen.');
    return <div>Checking payment status...</div>; // Or a spinner
  }

  // If user data is available and payment is not 'paid', redirect to payment page
  if (user && user.paymentStatus !== 'paid') {
    console.log('PaymentCheckWrapper: User paymentStatus is not paid. Redirecting to /payment. User:', JSON.stringify(user, null, 2));
    return <Navigate to="/payment" replace />;
  }

  console.log('PaymentCheckWrapper: User is paid or user object is null (should be caught by ProtectedRoute). Rendering Outlet. User:', JSON.stringify(user, null, 2));
  // If paid or user data not yet loaded (should be handled by ProtectedRoute outer layer)
  // Render the nested routes (e.g., Dashboard)
  return <Outlet />;
};

function App() {
  const { token, user, isLoading } = useAuth();

  // Log initial values from useAuth as soon as App component renders or re-renders
  console.log("App.tsx: MOUNT/RE-RENDER - isLoading:", isLoading, "token:", token, "user:", JSON.stringify(user, null, 2));

  if (isLoading) {
    console.log("App.tsx: Global isLoading is true, showing loading screen.");
    return <div>Loading application...</div>; // Global loading state
  }

  // Log values after isLoading is false, before rendering Routes
  console.log("App.tsx: RENDER ROUTES - isLoading:", isLoading, "token:", token, "user:", JSON.stringify(user, null, 2));

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={!token ? <LoginPage /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!token ? <RegistrationPage /> : <Navigate to="/dashboard" />} />

      {/* Routes requiring login but potentially pending payment */}
      <Route element={<ProtectedRoute />}>
        <Route path="/payment" element={user?.paymentStatus !== 'paid' ? <PaymentPage /> : <Navigate to="/dashboard" />} />
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
