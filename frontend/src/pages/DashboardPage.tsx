import React, { useState, useEffect, useContext } from 'react';
import RoadmapDisplay from '../../components/RoadmapDisplay';
import Step1Form from '../../components/forms/Step1Form';
import Step2DealAnalysis from '../../components/forms/Step2DealAnalysis';
import { AuthContext } from '../../context/AuthContext';
import apiClient from '../../services/apiClient';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '../../components/CheckoutForm'; // Import CheckoutForm

interface Step1FormData {
  contactInfo_name: string;
  contactInfo_email: string;
  contactInfo_phone: string;
  propertyAddress: string;
  reasonForSelling: string;
  propertyCondition: string;
  mortgageBalance: string;
  tenancyStatus: string;
  urgencyDeadlines: string;
}

interface Step1Files {
  photo?: File;
  mortgageStatement?: File;
}

interface Step2AddressData {
  propertyAddress: string;
}

// Load Stripe publishable key from environment variable
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const DashboardPage: React.FC = () => {
  const [currentRoadmapStep, setCurrentRoadmapStep] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [formSubmissionError, setFormSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const auth = useContext(AuthContext);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(auth?.paymentStatus || null);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const [paymentLoadingError, setPaymentLoadingError] = useState<string | null>(null);

  const fetchRoadmapAndPaymentStatus = async () => {
    if (!auth?.token) {
      setError("Authentication token not found. Please log in again.");
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const roadmapResponse = await apiClient.get('/api/roadmap/status');
      if (roadmapResponse.data && typeof roadmapResponse.data.currentRoadmapStep === 'number') {
        setCurrentRoadmapStep(roadmapResponse.data.currentRoadmapStep);
      } else {
        setError("Failed to fetch roadmap status or invalid data format.");
        setCurrentRoadmapStep(1); 
      }

      // Fetch payment status if not already set from auth context or if it might have changed
      const paymentResponse = await apiClient.get('/api/payment-status');
      if (paymentResponse.data && paymentResponse.data.paymentStatus) {
        setPaymentStatus(paymentResponse.data.paymentStatus);
        if (paymentResponse.data.paymentStatus === 'unpaid') {
          // Fetch client secret for payment form
          try {
            console.log("DashboardPage: Attempting to fetch payment client secret...");
            const intentResponse = await apiClient.post('/api/create-payment-intent', {});
            if (intentResponse.data && intentResponse.data.clientSecret) {
              setPaymentClientSecret(intentResponse.data.clientSecret);
              console.log("DashboardPage: paymentClientSecret fetched and set:", intentResponse.data.clientSecret);
              setPaymentLoadingError(null);
            } else {
              console.error("DashboardPage: Failed to fetch payment client secret. Response data:", intentResponse.data);
              setPaymentLoadingError('Failed to fetch payment client secret. Check console for details.');
            }
          } catch (intentErr: any) {
            console.error("DashboardPage: Exception while fetching payment client secret:", intentErr);
            setPaymentLoadingError(intentErr.response?.data?.error || intentErr.message || 'Error initializing payment. Check console for details.');
          }
        }
      } else {
        setError("Failed to fetch payment status.");
        setPaymentStatus('unknown');
      }
      setError(null);
    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
      setError(err.response?.data?.error || err.response?.data?.message || err.message || "An error occurred.");
      setCurrentRoadmapStep(1); 
      setPaymentStatus('unknown');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRoadmapAndPaymentStatus();
  }, [auth?.token]);

  const uploadFile = async (file: File, documentType: string): Promise<string | null> => {
    if (!auth?.token) {
      setFormSubmissionError("Authentication required to upload files.");
      return null;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("document_type", documentType);

    try {
      const response = await apiClient.post('/api/upload-document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (response.data && response.data.filePath) {
        console.log(`File ${documentType} uploaded: ${response.data.filePath}`);
        return response.data.filePath;
      } else {
        setFormSubmissionError(`Failed to upload ${documentType} or unexpected response.`);
        return null;
      }
    } catch (uploadError: any) {
      console.error(`Error uploading ${documentType}:`, uploadError);
      setFormSubmissionError(uploadError.response?.data?.error || uploadError.message || `An error occurred while uploading ${documentType}.`);
      return null;
    }
  };

  const handleStep1Submit = async (data: Step1FormData, files: Step1Files) => {
    if (!auth?.token) {
      setFormSubmissionError("Authentication required to submit form. Please log in again.");
      return;
    }
    setIsSubmitting(true);
    setFormSubmissionError(null);

    let photoPath: string | null = null;
    let mortgageStatementPath: string | null = null;

    if (files.photo) {
      photoPath = await uploadFile(files.photo, "step1_photo");
      if (!photoPath) {
        setIsSubmitting(false);
        return;
      }
    }

    if (files.mortgageStatement) {
      mortgageStatementPath = await uploadFile(files.mortgageStatement, "step1_mortgage_statement");
      if (!mortgageStatementPath) {
        setIsSubmitting(false);
        return;
      }
    }

    const submissionData = {
      ...data,
      photoFilePath: photoPath,
      mortgageStatementFilePath: mortgageStatementPath,
    };

    try {
      const response = await apiClient.post('/api/roadmap/step1-submit', submissionData);
      // Assuming step1-submit now returns the current step and status, not necessarily advancing it.
      if (response.data && response.data.message) {
        alert(response.data.message);
        fetchRoadmapAndPaymentStatus(); // Re-fetch to update status display
      } else {
        setFormSubmissionError("Failed to submit Step 1 data or unexpected response.");
      }
    } catch (err: any) {
      console.error("Error submitting Step 1 data:", err);
      setFormSubmissionError(err.response?.data?.error || err.response?.data?.message || err.message || "An error occurred while submitting Step 1 data.");
    }
    setIsSubmitting(false);
  };

  const handleStep2AddressSubmit = (data: Step2AddressData) => {
    console.log("Step 2 Address Submitted:", data);
    alert(`Address submitted for Zillow lookup: ${data.propertyAddress}. Backend Zillow integration is pending.`);
  };

  const handleStep2PdfSubmit = async (file: File) => {
    if (!auth?.token) {
      setFormSubmissionError("Authentication required to upload PDF. Please log in again.");
      return;
    }
    setIsSubmitting(true);
    setFormSubmissionError(null);

    const pdfPath = await uploadFile(file, "step2_realtor_pdf");

    if (!pdfPath) {
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await apiClient.post('/api/roadmap/step2-pdf-submit', { realtorPdfPath: pdfPath });
      if (response.data && response.data.message) {
        alert("Realtor PDF submitted successfully!");
        fetchRoadmapAndPaymentStatus(); // Re-fetch to update status display
      } else {
        setFormSubmissionError("Failed to submit Realtor PDF path or unexpected response.");
      }
    } catch (err: any) {
      console.error("Error submitting Step 2 PDF path:", err);
      setFormSubmissionError(err.response?.data?.error || err.response?.data?.message || err.message || "An error occurred while submitting PDF path.");
    }
    setIsSubmitting(false);
  };

  if (isLoading && currentRoadmapStep === null && paymentStatus === null) {
    return <div className="container mx-auto p-8 text-center">Loading dashboard...</div>;
  }

  // Payment Required View
  if (paymentStatus === 'unpaid') {
    if (paymentLoadingError) {
      return (
        <div className="container mx-auto p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">Payment Required</h2>
          <p className="text-red-500">Error: {paymentLoadingError}</p>
          <p>Please try refreshing the page or contact support. Check the browser console for more details.</p>
        </div>
      );
    }
    if (!paymentClientSecret) {
      console.log("DashboardPage: paymentClientSecret is still null or empty when trying to render Elements. This should not happen if fetched correctly.");
      return <div className="container mx-auto p-8 text-center">Loading payment form... (Waiting for client secret)</div>;
    }
    const options: StripeElementsOptions = {
      clientSecret: paymentClientSecret,
      appearance: { theme: 'stripe' },
    };
    console.log("DashboardPage: Rendering Stripe Elements with clientSecret:", paymentClientSecret);
    return (
      <div className="container mx-auto p-8 max-w-md">
        <h2 className="text-2xl font-semibold mb-4 text-center">Complete Your Setup Payment</h2>
        <p className="text-gray-600 mb-6 text-center">Please enter your payment details below to activate your account ($100 setup fee).</p>
        <Elements stripe={stripePromise} options={options}>
          <CheckoutForm />
        </Elements>
      </div>
    );
  }

  // Main Dashboard View (after payment or if not required)
  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Welcome to Your Seller Portal</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <p className="text-lg text-gray-700 mb-6">
        Here you can track your progress through the 7-step creative financing roadmap. 
        Follow the steps below to successfully navigate the process.
      </p>
      
      {currentRoadmapStep !== null && (
        <RoadmapDisplay currentStepId={currentRoadmapStep} />
      )}

      <div className="mt-8">
        {currentRoadmapStep === 1 && (
          <>
            {formSubmissionError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <strong className="font-bold">Submission Error: </strong>
                <span className="block sm:inline">{formSubmissionError}</span>
              </div>
            )}
            <Step1Form onSubmit={handleStep1Submit} />
            {isSubmitting && <p className="text-center mt-4">Submitting Step 1 data...</p>}
          </>
        )}
        {currentRoadmapStep === 2 && (
          <>
            {formSubmissionError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <strong className="font-bold">Submission Error: </strong>
                <span className="block sm:inline">{formSubmissionError}</span>
              </div>
            )}
            <Step2DealAnalysis 
              onAddressSubmit={handleStep2AddressSubmit} 
              onPdfSubmit={handleStep2PdfSubmit} 
            />
            {isSubmitting && <p className="text-center mt-4">Processing Step 2 submission...</p>}
          </>
        )}
        {/* Add conditional rendering for other step forms/content here */}
      </div>
      
    </div>
  );
};

export default DashboardPage;

