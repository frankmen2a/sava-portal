declare module '@stripe/react-stripe-js' {
  import React from 'react';
  import { Stripe, StripeElements, StripeElement } from '@stripe/stripe-js';

  export interface ElementsProps {
    stripe: Promise<Stripe | null>;
    options?: any;
    children: React.ReactNode;
  }

  export const Elements: React.FC<ElementsProps>;
  export const CardElement: React.FC<any>;
  export const CardNumberElement: React.FC<any>;
  export const CardExpiryElement: React.FC<any>;
  export const CardCvcElement: React.FC<any>;
  // Remove PaymentElement completely

  export function useStripe(): Stripe | null;
  export function useElements(): StripeElements | null;
}

declare module '@stripe/stripe-js' {
  export interface Stripe {
    confirmCardPayment(clientSecret: string, data: any): Promise<{
      error?: any;
      paymentIntent?: any;
    }>;
    // Remove confirmPayment completely
  }

  export interface StripeElements {
    getElement(type: any): StripeElement | null;
  }

  export interface StripeElement {}

  export function loadStripe(publishableKey: string): Promise<Stripe | null>;
}
