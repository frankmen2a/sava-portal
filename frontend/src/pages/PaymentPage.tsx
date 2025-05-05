import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '../components/CheckoutForm'; // Create this component next

// Load Stripe with your publishable key (should come from environment variables in a real app)
const stripePromise = loadStripe('pk_test_51PNP5ZDl2XsLNeAgspBrZZI1K1ZZ6Netb5d8gVXxSIUPdEotVp0cBpK1DEXupxs4OlRMQiAC02lpVbJmwpOMxA1B00kC3gGMvn');

const PaymentPage: React.FC = () => {
  const options = {
    // Need to fetch the client secret from your backend endpoint /api/create-payment-intent
    // This will be done within the CheckoutForm component
    mode: 'payment' as const,
    amount: 10000, // $100 in cents
    currency: 'usd',
    // appearance: {/* Custom appearance */},
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">Complete Your Setup Payment</h1>
        <p className="text-center text-gray-600">Please enter your payment details below to activate your account ($100 setup fee).</p>
        {/* Pass clientSecret obtained from backend to Elements options */}
        {/* For now, we'll fetch it inside CheckoutForm */}
        <Elements stripe={stripePromise} options={options}>
          <CheckoutForm />
        </Elements>
      </div>
    </div>
  );
};

export default PaymentPage;

