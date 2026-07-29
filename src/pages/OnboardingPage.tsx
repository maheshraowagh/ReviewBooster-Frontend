
import { useState, useRef, useCallback } from 'react';

import api, { type ApiResponse } from '../lib/api';
import { useUser } from '@clerk/clerk-react';
import { useAuthStore } from '../stores/authStore';
import type { Business } from '../types';

import { colors } from './onboarding/sharedStyles';
import { BusinessTypeStep } from './onboarding/components/BusinessTypeStep';
import { BusinessProfileStep } from './onboarding/components/BusinessProfileStep';
import { GoogleUrlStep } from './onboarding/components/GoogleUrlStep';
import { ConfirmationStep } from './onboarding/components/ConfirmationStep';

type Step = 'type' | 'profile' | 'google-url' | 'confirmation';

export default function OnboardingPage() {
  const { user: clerkUser } = useUser();
  const setAppUser = useAuthStore((state) => state.setAppUser);
  const qrRef = useRef<HTMLCanvasElement>(null);

  // Step state
  const [currentStep, setCurrentStep] = useState<Step>('type');

  // Form data
  const [businessType, setBusinessType] = useState('');
  const [customBusinessType, setCustomBusinessType] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [city, setCity] = useState('');
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');

  // Logo upload
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdBusiness, setCreatedBusiness] = useState<Business | null>(null);
  const [urlVerified, setUrlVerified] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // ---- Step navigation ----
  const steps: Step[] = ['type', 'profile', 'google-url', 'confirmation'];
  const stepIndex = steps.indexOf(currentStep);
  const stepLabels: Record<Step, string> = {
    type: '2. What kind of business?',
    profile: '3. Business profile',
    'google-url': '4. Connect Google',
    confirmation: '5. You\'re live',
  };

  const goNext = () => {
    if (stepIndex < steps.length - 1) {
      setError('');
      setCurrentStep(steps[stepIndex + 1]);
    }
  };

  const goBack = () => {
    if (stepIndex > 0) {
      setError('');
      setCurrentStep(steps[stepIndex - 1]);
    }
  };

  // ---- Logo handling ----
  const handleLogoSelect = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo must be under 2 MB');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Only JPEG, PNG, and WebP images are allowed');
      return;
    }
    setError('');
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleLogoSelect(file);
  }, []);

  // ---- Google URL verification ----
  const verifyUrl = () => {
    const patterns = [
      /^https?:\/\/g\.page\/r\/.+/i,
      /^https?:\/\/search\.google\.com\/local\/writereview\?placeid=.+/i,
      /^https?:\/\/(www\.)?google\.com\/maps\/place\/.+/i,
      /^https?:\/\/maps\.app\.goo\.gl\/.+/i,
      /^https?:\/\/maps\.google\.com\/.+/i,
    ];
    const isValid = patterns.some((p) => p.test(googleReviewUrl.trim()));
    if (isValid) {
      setUrlVerified(true);
      setError('');
    } else {
      setUrlVerified(false);
      setError('This doesn\'t look like a Google review URL. Try a g.page/r/... or Google Maps link.');
    }
  };

  // ---- Submit business ----
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');

    // Determine final business type (use custom if "other" was selected)
    const finalBusinessType = businessType === 'other' ? customBusinessType.trim().toLowerCase() : businessType;

    try {
      // 1. Create business
      const res = await api.post<ApiResponse<Business>>('/business', {
        name: businessName.trim(),
        businessType: finalBusinessType,
        googleReviewUrl: googleReviewUrl.trim(),
        city: city.trim(),
      });

      if (!res.data.success || !res.data.data) {
        setError(res.data.error?.message || 'Failed to create business');
        setIsSubmitting(false);
        return;
      }

      const business = res.data.data;

      // 2. Upload logo if selected
      if (logoFile) {
        try {
          const formData = new FormData();
          formData.append('logo', logoFile);
          const logoRes = await api.post<ApiResponse<Business>>('/business/logo', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          if (logoRes.data.success && logoRes.data.data) {
            setCreatedBusiness(logoRes.data.data);
          } else {
            setCreatedBusiness(business);
          }
        } catch {
          setCreatedBusiness(business);
        }
      } else {
        setCreatedBusiness(business);
      }

      // 3. Refetch user to get the updated businessId
      if (clerkUser) {
        const syncRes = await api.post<ApiResponse<Business & { role: string; businessId: string }>>('/auth/sync', {
          email: clerkUser.primaryEmailAddress?.emailAddress || '',
          firstName: clerkUser.firstName || '',
          lastName: clerkUser.lastName || '',
        });
        if (syncRes.data.success && syncRes.data.data) {
          // Update the auth store so guards and other components see the businessId
          setAppUser(syncRes.data.data as any);
        }
      }

      // 4. Move to confirmation
      goNext();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosErr.response?.data?.error?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- QR Download ----
  const downloadQR = () => {
    const canvas = qrRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `qr-${createdBusiness?.name || 'reviewboost'}.png`;
    link.href = url;
    link.click();
  };



  // ---- Render steps ----
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: colors.pageBg }}
    >
      <div
        className="w-full"
        style={{
          maxWidth: '560px',
          background: colors.cardBg,
          border: `1px solid ${colors.border}`,
          borderRadius: '10px',
          padding: '48px 40px',
        }}
      >
        {/* Step label */}
        {currentStep !== 'confirmation' && (
          <p style={{ fontSize: '13px', color: colors.inkMuted, textAlign: 'center', marginBottom: '16px' }}>
            {stepLabels[currentStep]}
          </p>
        )}

        {/* ---- Step 1: Business Type ---- */}
        {currentStep === 'type' && (
          <BusinessTypeStep
            businessType={businessType}
            setBusinessType={setBusinessType}
            customBusinessType={customBusinessType}
            setCustomBusinessType={setCustomBusinessType}
            error={error}
            goNext={goNext}
          />
        )}

        {/* ---- Step 2: Profile ---- */}
        {currentStep === 'profile' && (
          <BusinessProfileStep
            businessName={businessName}
            setBusinessName={setBusinessName}
            city={city}
            setCity={setCity}
            logoPreview={logoPreview}
            handleDrop={handleDrop}
            handleLogoSelect={handleLogoSelect}
            error={error}
            goBack={goBack}
            goNext={goNext}
          />
        )}

        {/* ---- Step 3: Google URL ---- */}
        {currentStep === 'google-url' && (
          <GoogleUrlStep
            googleReviewUrl={googleReviewUrl}
            setGoogleReviewUrl={setGoogleReviewUrl}
            urlVerified={urlVerified}
            setUrlVerified={setUrlVerified}
            verifyUrl={verifyUrl}
            showHelpModal={showHelpModal}
            setShowHelpModal={setShowHelpModal}
            error={error}
            isSubmitting={isSubmitting}
            goBack={goBack}
            handleSubmit={handleSubmit}
          />
        )}

        {/* ---- Step 4: Confirmation + QR ---- */}
        {currentStep === 'confirmation' && (
          <ConfirmationStep
            createdBusiness={createdBusiness}
            qrRef={qrRef}
            downloadQR={downloadQR}
          />
        )}
      </div>
    </div>
  );
}
