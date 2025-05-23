import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { 
  Elements, 
  CardElement, 
  useStripe, 
  useElements
} from '@stripe/react-stripe-js';

// --- IMPORTANT: Replace with your ACTUAL Stripe Publishable Key ---
// Ensure this key is a string and is your correct publishable key.
const STRIPE_PUBLISHABLE_KEY = "pk_live_51PNP5ZDl2XsLNeAgMwaapn11vfeHyPj9FDRLsudJ3FNPSAHVZq0yg3zKS16s1jAt69W2Jt7HdAFPO5pWAf5Eb1Zp00x8GRdd1C"; // User's key, keep it

const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

// Define types for the CardElement options
interface CardElementOptions {
  style: {
    base: {
      color: string;
      fontFamily: string;
      fontSmoothing: string;
      fontSize: string;
      "::placeholder": {
        color: string;
      };
    };
    invalid: {
      color: string;
      iconColor: string;
    };
  };
  hidePostalCode?: boolean;
}

const CheckoutForm: React.FC = () => {
    const stripe = useStripe();
    const elements = useElements();
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState<boolean>(false);
    const [succeeded, setSucceeded] = useState<boolean>(false);
    const [clientSecret, setClientSecret] = useState<string>('');
    const [paymentMessage, setPaymentMessage] = useState<string>('');

    useEffect(() => {
        console.log("CheckoutForm useEffect hook is running.");

        const fetchClientSecret = async (): Promise<void> => {
            console.log("fetchClientSecret function was called.");
            const token = localStorage.getItem("authToken");
            console.log("Auth Token from localStorage:", token);

            if (!token) {
                console.log("No auth token found, returning early from fetchClientSecret.");
                setPaymentMessage("Authentication token not found. Please log in.");
                setError("Authentication token not found. Please log in.");
                return;
            }

            console.log("Auth token found, proceeding to fetch client secret.");
            try {
                console.log("Attempting to fetch /api/generate-payment-secret");
                const response = await fetch("/api/generate-payment-secret", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                });

                const responseText = await response.text();
                console.log("Raw response from /api/generate-payment-secret:", responseText);

                try {
                    const data = JSON.parse(responseText);
                    if (response.ok && data.clientSecret) {
                        setClientSecret(data.clientSecret);
                    } else {
                        const errorMsg = data.error || 'Failed to initialize payment. Server response not OK or clientSecret missing.';
                        setError(errorMsg);
                        setPaymentMessage(errorMsg);
                        console.error('Failed to fetch client secret (parsed data):', data);
                    }
                } catch (parseError) {
                    console.error('Error parsing JSON response:', parseError, 'Raw response was:', responseText);
                    setError('Received an invalid response from the server.');
                    setPaymentMessage('Received an invalid response from the server.');
                }

            } catch (networkErr) {
                console.error('Network error fetching client secret:', networkErr);
                setError('Could not connect to payment server. Please check your network connection and try again later.');
                setPaymentMessage('Could not connect to payment server. Please check your network connection and try again later.');
            }
        };

        fetchClientSecret();
    }, []);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        setProcessing(true);
        setError(null);
        setPaymentMessage('');

        if (!stripe || !elements) {
            setError('Stripe.js has not loaded yet. Please wait a moment and try again.');
            setProcessing(false);
            return;
        }

        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
            setError('Card element not found. Please ensure Stripe Elements are correctly mounted.');
            setProcessing(false);
            return;
        }

        console.log("Client Secret in handleSubmit before check:", clientSecret);

        if (!clientSecret) {
            setError('Payment cannot be processed: Missing client secret. Please refresh and try again.');
            setProcessing(false);
            return;
        }

        // Using confirmCardPayment instead of confirmPayment
        const result = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: cardElement,
            },
        });

        const { error: stripeError, paymentIntent } = result;

        if (stripeError) {
            console.error('Stripe payment confirmation error:', stripeError);
            setError(stripeError.message || 'An unexpected error occurred during payment.');
            setPaymentMessage(stripeError.message || 'An unexpected error occurred during payment.');
            setProcessing(false);
        } else if (paymentIntent) {
            if (paymentIntent.status === 'succeeded') {
                setSucceeded(true);
                setPaymentMessage('Payment successful! Your account should be activated shortly.');
            } else {
                setPaymentMessage(`Payment status: ${paymentIntent.status}. Please contact support.`);
            }
            setProcessing(false);
        }
    };

    const cardElementOptions: CardElementOptions = {
        style: {
            base: {
                color: "#32325d",
                fontFamily: 'Arial, sans-serif',
                fontSmoothing: "antialiased",
                fontSize: "16px",
                "::placeholder": {
                    color: "#aab7c4"
                }
            },
            invalid: {
                color: "#fa755a",
                iconColor: "#fa755a"
            }
        },
        // Optional: Add built-in labels for better accessibility
        hidePostalCode: true
    };

    return (
        <form id="payment-form" onSubmit={handleSubmit} style={{ maxWidth: '500px', margin: '40px auto', padding: '30px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9'}}>
            <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Complete Your Payment</h2>
            
            {/* Improved accessibility for CardElement */}
            <div style={{ marginBottom: '15px' }}>
                {/* Use aria-labelledby instead of htmlFor */}
                <div id="card-label" style={{ marginBottom: '5px', fontWeight: 'bold' }}>
                    Credit or debit card
                </div>
                <div 
                    role="group" 
                    aria-labelledby="card-label"
                    className="card-element-container"
                >
                    <CardElement 
                        options={cardElementOptions} 
                        aria-label="Credit or debit card input"
                    />
                </div>
            </div>
            
            {error && <div id="card-errors" role="alert" style={{ color: 'red', marginTop: '10px', fontSize: '0.9em', textAlign: 'center' }}>{error}</div>}
            {paymentMessage && <div id="payment-message" style={{ marginTop: '20px', textAlign: 'center', fontWeight: 'bold', color: succeeded ? 'green' : 'red' }}>{paymentMessage}</div>}

            <button 
                disabled={processing || !stripe || !clientSecret || succeeded}
                id="submit-button"
                type="submit"
                aria-label="Submit payment"
                style={{
                    backgroundColor: (processing || !stripe || !clientSecret || succeeded) ? '#ccc' : '#6772e5',
                    color: 'white',
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '4px',
                    fontSize: '16px',
                    cursor: (processing || !stripe || !clientSecret || succeeded) ? 'not-allowed' : 'pointer',
                    display: 'block',
                    width: '100%',
                    marginTop: '20px'
                }}
            >
                {processing ? (
                    <div className="spinner" id="spinner" style={{ margin: '0 auto', width: '20px', height: '20px', border: '2px solid transparent', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                ) : (
                    succeeded ? 'Payment Successful' : 'Pay $100.00'
                )}
            </button>
            <style>
                {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
            </style>
        </form>
    );
};

const StripePaymentForm: React.FC = () => {
    // This console.log is to ensure StripePaymentForm itself is rendering.
    console.log("StripePaymentForm component is rendering (wrapper for Elements)."); 
    return (
        <Elements stripe={stripePromise}>
            <CheckoutForm />
        </Elements>
    );
};

export default StripePaymentForm;
