import React, { useState, useEffect } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from './ui/button'; // Assuming shadcn/ui
import { useAuth } from '../context/AuthContext'; // To get token for API calls

const CheckoutForm: React.FC = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { token } = useAuth(); // Get auth token

  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5003'; // Use env variable

  useEffect(() => {
    // Fetch the client secret from the backend when the component mounts
    const fetchClientSecret = async () => {
      if (!token) {
        setMessage("Authentication error. Please log in again.");
        return;
      }
      try {
        const response = await fetch(`${backendUrl}/api/create-payment-intent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // Send token for authentication
          },
          // Body can be empty or include items if needed by backend
          body: JSON.stringify({}),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create payment intent');
        }
        setClientSecret(data.clientSecret);
      } catch (error: any) {
        setMessage(`Failed to initialize payment: ${error.message}`);
      }
    };

    fetchClientSecret();
  }, [token]); // Re-fetch if token changes

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      // Stripe.js has not yet loaded or client secret not fetched.
      // Make sure to disable form submission until Stripe.js has loaded.
      setMessage("Payment system not ready. Please wait or refresh.");
      return;
    }

    setIsLoading(true);
    setMessage(null);

    // Trigger the payment confirmation. If successful, Stripe redirects the user
    // to the return_url. If there's an immediate error (e.g., card declined),
    // the error is caught below.
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Make sure to change this to your payment completion page
        return_url: `${window.location.origin}/payment-success`, // Redirect URL after payment
      },
    });

    // This point will only be reached if there is an immediate error when
    // confirming the payment. Otherwise, the customer is redirected to the return_url.
    if (error) {
      if (error.type === "card_error" || error.type === "validation_error") {
        setMessage(error.message || "An error occurred with your payment details.");
      } else {
        setMessage("An unexpected error occurred. Please try again.");
      }
      setIsLoading(false); // Stop loading only if there's an error here
    }
    // No need for an else block, success is handled by redirection.
    // The loading state will persist until redirection or error.
  };

  const paymentElementOptions = {
    layout: "tabs" as const
  }

  if (!clientSecret) {
    // Show loading state or message while client secret is being fetched
    return <div>Loading payment form... {message && <p className="text-red-500">{message}</p>}</div>;
  }

  return (
    <form id="payment-form" onSubmit={handleSubmit}>
      <PaymentElement id="payment-element" options={paymentElementOptions} />
      <Button disabled={isLoading || !stripe || !elements} id="submit" className="w-full mt-4">
        <span id="button-text">
          {isLoading ? <div className="spinner" id="spinner"></div> : "Pay now ($100.00)"}
        </span>
      </Button>
      {/* Show any error or success messages */}      {message && <div id="payment-message" className="text-red-500 text-sm mt-2">{message}</div>}
    </form>
  );
}

export default CheckoutForm;

