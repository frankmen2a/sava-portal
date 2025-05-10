import React from 'react';
// Assuming PaymentForm.tsx (which exports StripePaymentForm) is in the same 'pages' directory
import StripePaymentForm from './PaymentForm'; 

const PaymentPage: React.FC = () => {
  console.log("PaymentPage component is rendering."); // For debugging

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">Complete Your Setup Payment</h1>
        <p className="text-center text-gray-600">Please enter your payment details below to activate your account ($100 setup fee).</p>
        
        {/* 
          StripePaymentForm should handle the Stripe Elements provider and logic internally.
        */}
        <StripePaymentForm />

      </div>
    </div>
  );
};

export default PaymentPage;
