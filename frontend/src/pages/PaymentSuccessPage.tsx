import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth to get token

const PaymentSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const { token, updatePaymentStatus } = useAuth(); // Get token and updatePaymentStatus function
  const [updateStatus, setUpdateStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5003'; // Use env variable

  useEffect(() => {
    const updateUserPaymentStatus = async () => {
      if (!token) {
        setUpdateStatus('error');
        setErrorMessage('Authentication token not found. Cannot update status.');
        // Optionally redirect to login or show error message permanently
        return;
      }

      try {
        const response = await fetch(`${backendUrl}/api/update-payment-status`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}), // Send empty body as required by backend
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.paymentStatus === 'paid') {
          setUpdateStatus('success');
          // Refresh auth context state to reflect 'paid' status immediately
          updatePaymentStatus('paid'); // Update local state
          // Redirect to dashboard after a short delay
          const timer = setTimeout(() => {
            navigate('/dashboard');
          }, 3000); // 3-second delay
          return () => clearTimeout(timer); // Cleanup timer on unmount
        } else {
          throw new Error('Backend did not confirm payment status update.');
        }

      } catch (error) {
        console.error('Failed to update payment status:', error);
        setUpdateStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred.');
        // Keep user on this page to show error, or redirect elsewhere
      }
    };

    updateUserPaymentStatus();

  }, [navigate, token, backendUrl, updatePaymentStatus]); // Add dependencies

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md text-center">
        {updateStatus === 'pending' && (
          <h1 className="text-2xl font-bold text-blue-600 mb-4">Processing Payment Confirmation...</h1>
        )}
        {updateStatus === 'success' && (
          <>
            <h1 className="text-2xl font-bold text-green-600 mb-4">Payment Successful!</h1>
            <p className="text-gray-700 mb-6">Your account setup is complete. You will be redirected to your dashboard shortly.</p>
            <p className="text-gray-500 text-sm">If you are not redirected, <Link to="/dashboard" className="text-blue-600 hover:underline">click here</Link>.</p>
          </>
        )}
        {updateStatus === 'error' && (
           <>
            <h1 className="text-2xl font-bold text-red-600 mb-4">Payment Confirmation Failed</h1>
            <p className="text-gray-700 mb-6">There was an issue confirming your payment status with the backend.</p>
            <p className="text-red-500 text-sm mb-4">Error: {errorMessage || 'Unknown error'}</p>
            <p className="text-gray-500 text-sm">Please contact support or try <Link to="/dashboard" className="text-blue-600 hover:underline">refreshing</Link>.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
