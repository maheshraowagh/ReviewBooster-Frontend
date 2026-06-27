import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import api, { type ApiResponse } from '../lib/api';
import { useAppAuth } from '../providers/AuthProvider';
import type { Business } from '../types';

const BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { value: 'cafe', label: 'Café', icon: '☕' },
];

const PUBLIC_APP_URL = import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin;

type Step = 'type' | 'profile' | 'google-url' | 'confirmation';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { refetchUser } = useAppAuth();
  const qrRef = useRef<HTMLCanvasElement>(null);

  // Step state
  const [currentStep, setCurrentStep] = useState<Step>('type');

  // Form data
  const [businessType, setBusinessType] = useState('');
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

    try {
      // 1. Create business
      const res = await api.post<ApiResponse<Business>>('/business', {
        name: businessName.trim(),
        businessType,
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
      await refetchUser();

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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-12"
         style={{ background: 'var(--color-surface)' }}>
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none opacity-50"
           style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 60%)' }} />

      <div className="relative z-10 w-full max-w-xl">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-3 mb-10">
          {steps.map((step, i) => (
            <div
              key={step}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                i <= stepIndex
                  ? 'w-10 bg-gradient-to-r from-indigo-500 to-cyan-500'
                  : 'w-2.5 bg-white/10'
              } ${i < stepIndex ? 'opacity-60' : ''}`}
            />
          ))}
        </div>

        {/* ---- Step 1: Business Type ---- */}
        {currentStep === 'type' && (
          <div className="animate-fade-in">
            <h2 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              What type of business do you run?
            </h2>
            <p className="text-center mb-8" style={{ color: 'var(--color-text-secondary)' }}>
              We'll customize your review tags based on your business type
            </p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {BUSINESS_TYPES.map((type) => (
                <button
                  key={type.value}
                  className={`flex flex-col items-center gap-3 p-8 rounded-2xl border transition-all duration-200 cursor-pointer ${
                    businessType === type.value
                      ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.2)] scale-[1.02]'
                      : 'border-white/8 bg-[var(--color-surface-card)] hover:border-white/16 hover:bg-[var(--color-surface-elevated)]'
                  }`}
                  onClick={() => setBusinessType(type.value)}
                >
                  <span className="text-5xl">{type.icon}</span>
                  <span className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{type.label}</span>
                </button>
              ))}
            </div>
            {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}
            <div className="flex justify-end">
              <button
                className="px-8 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
                disabled={!businessType}
                onClick={goNext}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ---- Step 2: Profile ---- */}
        {currentStep === 'profile' && (
          <div className="animate-fade-in">
            <h2 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Tell us about your business
            </h2>
            <p className="text-center mb-8" style={{ color: 'var(--color-text-secondary)' }}>
              This info helps us personalize the review experience
            </p>

            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label htmlFor="businessName" className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  Business Name *
                </label>
                <input
                  id="businessName"
                  type="text"
                  placeholder="e.g. Spice Kitchen"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl border border-white/8 bg-[var(--color-surface-input)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-200"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="city" className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  placeholder="e.g. Mumbai"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-white/8 bg-[var(--color-surface-input)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-200"
                />
              </div>

              {/* Logo upload */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  Logo (optional)
                </label>
                <div
                  className={`flex items-center justify-center rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 overflow-hidden ${
                    logoPreview
                      ? 'border-indigo-500/30 p-2'
                      : 'border-white/10 hover:border-indigo-500/40 p-8'
                  }`}
                  style={{ background: 'var(--color-surface-input)' }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('logoInput')?.click()}
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo preview" className="h-24 w-24 rounded-xl object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-center">
                      <span className="text-3xl">📷</span>
                      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Drag & drop or click to upload</span>
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>JPEG, PNG, WebP · Max 2 MB</span>
                    </div>
                  )}
                  <input
                    id="logoInput"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoSelect(file);
                    }}
                  />
                </div>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm text-center mt-4">{error}</p>}
            <div className="flex justify-between mt-8">
              <button
                className="px-6 py-3 rounded-xl font-semibold border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all duration-200"
                style={{ color: 'var(--color-text-secondary)' }}
                onClick={goBack}
              >
                Back
              </button>
              <button
                className="px-8 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
                disabled={!businessName.trim()}
                onClick={goNext}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ---- Step 3: Google URL ---- */}
        {currentStep === 'google-url' && (
          <div className="animate-fade-in">
            <h2 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Your Google Review Link
            </h2>
            <p className="text-center mb-8" style={{ color: 'var(--color-text-secondary)' }}>
              This is where customers will be redirected to leave a review
            </p>

            <div className="flex flex-col gap-2 mb-4">
              <label htmlFor="googleUrl" className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                Google Review URL *
              </label>
              <div className="flex gap-2">
                <input
                  id="googleUrl"
                  type="url"
                  placeholder="https://g.page/r/your-business/review"
                  value={googleReviewUrl}
                  onChange={(e) => {
                    setGoogleReviewUrl(e.target.value);
                    setUrlVerified(false);
                  }}
                  className="flex-1 px-4 py-3 rounded-xl border border-white/8 bg-[var(--color-surface-input)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-200"
                />
                <button
                  className={`px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 shrink-0 ${
                    urlVerified
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-[var(--color-surface-elevated)] border border-white/10 hover:border-indigo-500/40 text-[var(--color-text-primary)]'
                  }`}
                  onClick={verifyUrl}
                  disabled={!googleReviewUrl.trim()}
                >
                  {urlVerified ? '✓ Verified' : 'Verify'}
                </button>
              </div>
            </div>

            {urlVerified && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm mb-4">
                <span>✅</span> Link verified — looks good!
              </div>
            )}

            <button
              className="text-sm font-medium hover:underline transition-all duration-200 mb-6 inline-block"
              style={{ color: 'var(--color-brand-light)' }}
              onClick={() => setShowHelpModal(true)}
            >
              Don't know your link? →
            </button>

            {/* Help modal */}
            {showHelpModal && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                onClick={() => setShowHelpModal(false)}
              >
                <div
                  className="w-full max-w-md p-8 rounded-2xl border border-white/10"
                  style={{ background: 'var(--color-surface-elevated)' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                    How to find your Google Review link
                  </h3>
                  <ol className="list-decimal list-inside flex flex-col gap-2 text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                    <li>Search for your business on <strong className="text-white">Google Maps</strong></li>
                    <li>Click your business listing</li>
                    <li>Click <strong className="text-white">"Share"</strong></li>
                    <li>Copy the link</li>
                    <li>Paste it above!</li>
                  </ol>
                  <p className="text-xs mb-6" style={{ color: 'var(--color-text-muted)' }}>
                    Tip: The link usually starts with <code className="px-1.5 py-0.5 rounded bg-white/5 font-mono text-xs">https://g.page/r/...</code> or{' '}
                    <code className="px-1.5 py-0.5 rounded bg-white/5 font-mono text-xs">https://maps.app.goo.gl/...</code>
                  </p>
                  <button
                    className="w-full px-6 py-3 rounded-xl font-semibold border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all duration-200"
                    style={{ color: 'var(--color-text-secondary)' }}
                    onClick={() => setShowHelpModal(false)}
                  >
                    Got it
                  </button>
                </div>
              </div>
            )}

            {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}
            <div className="flex justify-between mt-6">
              <button
                className="px-6 py-3 rounded-xl font-semibold border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all duration-200"
                style={{ color: 'var(--color-text-secondary)' }}
                onClick={goBack}
              >
                Back
              </button>
              <button
                className="px-8 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
                disabled={!urlVerified || isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting ? 'Creating...' : 'Create My Business'}
              </button>
            </div>
          </div>
        )}

        {/* ---- Step 4: Confirmation + QR ---- */}
        {currentStep === 'confirmation' && createdBusiness && (
          <div className="animate-fade-in text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              You're all set!
            </h2>
            <p className="mb-8" style={{ color: 'var(--color-text-secondary)' }}>
              Your QR code is ready. Print it and place it where customers can scan it.
            </p>

            <div className="inline-flex flex-col items-center gap-4 p-8 rounded-2xl border border-white/10 mb-8"
                 style={{ background: 'var(--color-surface-card)' }}>
              <div className="bg-white p-4 rounded-xl">
                <QRCodeCanvas
                  ref={qrRef}
                  value={`${PUBLIC_APP_URL}/r/${createdBusiness.businessCode}`}
                  size={220}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#1a1a2e"
                  imageSettings={
                    createdBusiness.logoUrl
                      ? {
                          src: createdBusiness.logoUrl,
                          height: 40,
                          width: 40,
                          excavate: true,
                        }
                      : undefined
                  }
                />
              </div>
              <p className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                {PUBLIC_APP_URL}/r/{createdBusiness.businessCode}
              </p>
              <button
                className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-indigo-500/20"
                onClick={downloadQR}
              >
                ⬇ Download QR Code
              </button>
            </div>

            <div className="p-6 rounded-2xl border border-white/10 text-left mb-8"
                 style={{ background: 'var(--color-surface-card)' }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                {createdBusiness.name}
              </h3>
              <dl className="grid gap-x-4 gap-y-2 text-sm" style={{ gridTemplateColumns: '80px 1fr' }}>
                <dt style={{ color: 'var(--color-text-muted)' }}>Type</dt>
                <dd className="capitalize">{createdBusiness.businessType}</dd>
                <dt style={{ color: 'var(--color-text-muted)' }}>Code</dt>
                <dd className="font-mono text-xs">{createdBusiness.businessCode}</dd>
                {createdBusiness.city && (
                  <>
                    <dt style={{ color: 'var(--color-text-muted)' }}>City</dt>
                    <dd>{createdBusiness.city}</dd>
                  </>
                )}
              </dl>
            </div>

            <button
              className="w-full px-8 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-indigo-500/20"
              onClick={() => navigate('/dashboard')}
            >
              Go to Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
