import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripePaymentForm from '../components/StripePaymentForm'; // Assuming StripePaymentForm.tsx is in src/components/

// Load Stripe with your publishable key. 
// IMPORTANT: Replace with your ACTUAL Stripe Publishable Key. It should be a string.
// It's best practice to load this from an environment variable.
const STRIPE_PUBLISHABLE_KEY = "pk_test_YOUR_STRIPE_PUBLISHABLE_KEY"; // Replace this placeholder
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

const PaymentPage: React.FC = () => {
  console.log("PaymentPage component is rendering."); // For debugging

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">Complete Your Setup Payment</h1>
        <p className="text-center text-gray-600">Please enter your payment details below to activate your account ($100 setup fee).</p>
        
        {/* 
          The StripePaymentForm component (which I provided earlier and you saved as PaymentForm.tsx or StripePaymentForm.tsx)
          already includes the <Elements> provider and the CheckoutForm logic within it.
          You just need to render StripePaymentForm here.
        */}
        <StripePaymentForm />

      </div>
    </div>
  );
};

export default PaymentPage;
