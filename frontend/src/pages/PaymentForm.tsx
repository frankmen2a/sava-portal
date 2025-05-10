import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// --- IMPORTANT: Replace with your ACTUAL Stripe Publishable Key ---
// Ensure this key is a string and is your correct publishable key.
const STRIPE_PUBLISHABLE_KEY = "pk_live_51PNP5ZDl2XsLNeAgMwaapn11vfeHyPj9FDRLsudJ3FNPSAHVZq0yg3zKS16s1jAt69W2Jt7HdAFPO5pWAf5Eb1Zp00x8GRdd1C";

const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

const CheckoutForm = () => {
    const stripe = useStripe();
    const elements = useElements();
    const [error, setError] = useState<string | null>(null); // Added type for error state
    const [processing, setProcessing] = useState(false);
    const [succeeded, setSucceeded] = useState(false);
    const [clientSecret, setClientSecret] = useState('');
    const [paymentMessage, setPaymentMessage] = useState('');

    useEffect(() => {
        const fetchClientSecret = async () => {
            const token = localStorage.getItem('authToken');
            if (!token) {
                setPaymentMessage('Authentication token not found. Please log in.');
                setError('Authentication token not found. Please log in.');
                return;
            }

            try {
                const response = await fetch('/api/create-payment-intent', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });

                const data = await response.json();
                if (response.ok && data.clientSecret) {
                    setClientSecret(data.clientSecret);
                } else {
                    const errorMsg = data.error || 'Failed to initialize payment. Please try again.';
                    setError(errorMsg);
                    setPaymentMessage(errorMsg);
                    console.error('Failed to fetch client secret:', data);
                }
            } catch (err) {
                console.error('Error fetching client secret:', err);
                setError('Could not connect to payment server. Please try again later.');
                setPaymentMessage('Could not connect to payment server. Please try again later.');
            }
        };

        fetchClientSecret();
    }, []);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => { // Added type for event
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
        if (!cardElement) { // Added a check for cardElement
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

        const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: cardElement,
            },
        });

        if (stripeError) {
            console.error('Stripe payment confirmation error:', stripeError);
            setError(stripeError.message || 'An unexpected error occurred during payment.');
            setPaymentMessage(stripeError.message || 'An unexpected error occurred during payment.');
            setProcessing(false);
        } else if (paymentIntent) { // Added check for paymentIntent
            if (paymentIntent.status === 'succeeded') {
                setSucceeded(true);
                setPaymentMessage('Payment successful! Your account should be activated shortly.');
            } else {
                setPaymentMessage(`Payment status: ${paymentIntent.status}. Please contact support.`);
            }
            setProcessing(false);
        }
    };

    const cardElementOptions = {
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
        }
    };

    return (
        <form id="payment-form" onSubmit={handleSubmit} style={{ maxWidth: '500px', margin: '40px auto', padding: '30px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Complete Your Payment</h2>
            <div style={{ marginBottom: '15px' }}>
                <label htmlFor="card-element" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Credit or debit card
                </label>
                <CardElement id="card-element" options={cardElementOptions} />
            </div>
            
            {error && <div id="card-errors" role="alert" style={{ color: 'red', marginTop: '10px', fontSize: '0.9em', textAlign: 'center' }}>{error}</div>}
            {paymentMessage && <div id="payment-message" style={{ marginTop: '20px', textAlign: 'center', fontWeight: 'bold', color: succeeded ? 'green' : 'red' }}>{paymentMessage}</div>}

            <button 
                disabled={processing || !stripe || !clientSecret || succeeded}
                id="submit-button"
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

const StripePaymentForm = () => {
    return (
        <Elements stripe={stripePromise}>
            <CheckoutForm />
        </Elements>
    );
};

export default StripePaymentForm;


