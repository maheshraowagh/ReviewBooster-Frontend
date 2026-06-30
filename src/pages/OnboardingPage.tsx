// import { useState, useRef, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { QRCodeCanvas } from 'qrcode.react';
// import api, { type ApiResponse } from '../lib/api';
// import { useAppAuth } from '../providers/AuthProvider';
// import type { Business } from '../types';

// const BUSINESS_TYPES = [
//   { value: 'restaurant', label: 'Restaurant', icon: '🍽️' },
//   { value: 'cafe', label: 'Café', icon: '☕' },
//   { value: 'bakery', label: 'Bakery', icon: '🥖' },
//   { value: 'other', label: 'Other', icon: '•••' },
// ];

// const PUBLIC_APP_URL = import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin;

// type Step = 'type' | 'profile' | 'google-url' | 'confirmation';

// export default function OnboardingPage() {
//   const navigate = useNavigate();
//   const { refetchUser } = useAppAuth();
//   const qrRef = useRef<HTMLCanvasElement>(null);

//   // Step state
//   const [currentStep, setCurrentStep] = useState<Step>('type');

//   // Form data
//   const [businessType, setBusinessType] = useState('');
//   const [customBusinessType, setCustomBusinessType] = useState('');
//   const [businessName, setBusinessName] = useState('');
//   const [city, setCity] = useState('');
//   const [googleReviewUrl, setGoogleReviewUrl] = useState('');

//   // Logo upload
//   const [logoFile, setLogoFile] = useState<File | null>(null);
//   const [logoPreview, setLogoPreview] = useState<string>('');

//   // UI state
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [error, setError] = useState('');
//   const [createdBusiness, setCreatedBusiness] = useState<Business | null>(null);
//   const [urlVerified, setUrlVerified] = useState(false);
//   const [showHelpModal, setShowHelpModal] = useState(false);

//   // ---- Step navigation ----
//   const steps: Step[] = ['type', 'profile', 'google-url', 'confirmation'];
//   const stepIndex = steps.indexOf(currentStep);

//   const goNext = () => {
//     if (stepIndex < steps.length - 1) {
//       setError('');
//       setCurrentStep(steps[stepIndex + 1]);
//     }
//   };

//   const goBack = () => {
//     if (stepIndex > 0) {
//       setError('');
//       setCurrentStep(steps[stepIndex - 1]);
//     }
//   };

//   // ---- Logo handling ----
//   const handleLogoSelect = (file: File) => {
//     if (file.size > 2 * 1024 * 1024) {
//       setError('Logo must be under 2 MB');
//       return;
//     }
//     if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
//       setError('Only JPEG, PNG, and WebP images are allowed');
//       return;
//     }
//     setError('');
//     setLogoFile(file);
//     setLogoPreview(URL.createObjectURL(file));
//   };

//   const handleDrop = useCallback((e: React.DragEvent) => {
//     e.preventDefault();
//     const file = e.dataTransfer.files[0];
//     if (file) handleLogoSelect(file);
//   }, []);

//   // ---- Google URL verification ----
//   const verifyUrl = () => {
//     const patterns = [
//       /^https?:\/\/g\.page\/r\/.+/i,
//       /^https?:\/\/search\.google\.com\/local\/writereview\?placeid=.+/i,
//       /^https?:\/\/(www\.)?google\.com\/maps\/place\/.+/i,
//       /^https?:\/\/maps\.app\.goo\.gl\/.+/i,
//       /^https?:\/\/maps\.google\.com\/.+/i,
//     ];
//     const isValid = patterns.some((p) => p.test(googleReviewUrl.trim()));
//     if (isValid) {
//       setUrlVerified(true);
//       setError('');
//     } else {
//       setUrlVerified(false);
//       setError('This doesn\'t look like a Google review URL. Try a g.page/r/... or Google Maps link.');
//     }
//   };

//   // ---- Submit business ----
//   const handleSubmit = async () => {
//     setIsSubmitting(true);
//     setError('');

//     // Determine final business type (use custom if "other" was selected)
//     const finalBusinessType = businessType === 'other' ? customBusinessType.trim().toLowerCase() : businessType;

//     try {
//       // 1. Create business
//       const res = await api.post<ApiResponse<Business>>('/business', {
//         name: businessName.trim(),
//         businessType: finalBusinessType,
//         googleReviewUrl: googleReviewUrl.trim(),
//         city: city.trim(),
//       });

//       if (!res.data.success || !res.data.data) {
//         setError(res.data.error?.message || 'Failed to create business');
//         setIsSubmitting(false);
//         return;
//       }

//       const business = res.data.data;

//       // 2. Upload logo if selected
//       if (logoFile) {
//         try {
//           const formData = new FormData();
//           formData.append('logo', logoFile);
//           const logoRes = await api.post<ApiResponse<Business>>('/business/logo', formData, {
//             headers: { 'Content-Type': 'multipart/form-data' },
//           });
//           if (logoRes.data.success && logoRes.data.data) {
//             setCreatedBusiness(logoRes.data.data);
//           } else {
//             setCreatedBusiness(business);
//           }
//         } catch {
//           setCreatedBusiness(business);
//         }
//       } else {
//         setCreatedBusiness(business);
//       }

//       // 3. Refetch user to get the updated businessId
//       await refetchUser();

//       // 4. Move to confirmation
//       goNext();
//     } catch (err: unknown) {
//       const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
//       setError(axiosErr.response?.data?.error?.message || 'Something went wrong. Please try again.');
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   // ---- QR Download ----
//   const downloadQR = () => {
//     const canvas = qrRef.current;
//     if (!canvas) return;
//     const url = canvas.toDataURL('image/png');
//     const link = document.createElement('a');
//     link.download = `qr-${createdBusiness?.name || 'reviewboost'}.png`;
//     link.href = url;
//     link.click();
//   };

//   // ---- Render steps ----
//   return (
//     <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-12"
//       style={{ background: 'var(--color-surface)' }}>
//       {/* Background gradient */}
//       <div className="absolute inset-0 pointer-events-none opacity-40"
//         style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.2) 0%, transparent 70%)' }} />

//       <div className="relative z-10 w-full max-w-3xl">
//         {/* Progress indicators */}
//         <div className="flex items-center justify-center gap-2.5 mb-16">
//           {steps.map((step, i) => (
//             <div
//               key={step}
//               className={`h-2 rounded-full transition-all duration-300 ${i <= stepIndex
//                 ? 'w-12 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500'
//                 : 'w-2 bg-white/10'
//                 }`}
//             />
//           ))}
//         </div>

//         {/* ---- Step 1: Business Type ---- */}
//         {currentStep === 'type' && (
//           <div className="onboarding-step">
//             <h1 className="onboarding-title">
//               What type of business do you run?
//             </h1>
//             <p className="onboarding-subtitle">
//               We'll customize your review tags based on your business type
//             </p>

//             <div className="grid grid-cols-2 gap-5 mb-8">
//               {BUSINESS_TYPES.map((type) => (
//                 <button
//                   key={type.value}
//                   className={`business-type-card ${businessType === type.value ? 'active' : ''}`}
//                   onClick={() => {
//                     setBusinessType(type.value);
//                     if (type.value !== 'other') {
//                       setCustomBusinessType('');
//                     }
//                   }}
//                 >
//                   <span className="text-6xl mb-3">{type.icon}</span>
//                   <span className="text-lg font-semibold text-white">{type.label}</span>
//                 </button>
//               ))}
//             </div>

//             {/* Custom business type input when "Other" is selected */}
//             {businessType === 'other' && (
//               <div className="flex flex-col gap-2 mb-8 animate-fade-in">
//                 <label htmlFor="customType" className="onboarding-label text-center">
//                   Please specify your business type
//                 </label>
//                 <input
//                   id="customType"
//                   type="text"
//                   placeholder="e.g. Spa, Salon, Gym..."
//                   value={customBusinessType}
//                   onChange={(e) => setCustomBusinessType(e.target.value)}
//                   autoFocus
//                   className="onboarding-input max-w-md mx-auto"
//                 />
//               </div>
//             )}

//             {error && <p className="text-red-400 text-sm text-center mb-6">{error}</p>}

//             <div className="flex justify-center mt-16">
//               <button
//                 className="onboarding-btn-primary px-12"
//                 disabled={!businessType || (businessType === 'other' && !customBusinessType.trim())}
//                 onClick={goNext}
//               >
//                 Continue
//               </button>
//             </div>
//           </div>
//         )}

//         {/* ---- Step 2: Profile ---- */}
//         {currentStep === 'profile' && (
//           <div className="onboarding-step">
//             <h1 className="onboarding-title">
//               Tell us about your business
//             </h1>
//             <p className="onboarding-subtitle">
//               This info helps us personalize the review experience
//             </p>

//             <div className="flex flex-col gap-6 mb-10">
//               <div className="flex flex-col gap-2">
//                 <label htmlFor="businessName" className="onboarding-label">
//                   Business Name *
//                 </label>
//                 <input
//                   id="businessName"
//                   type="text"
//                   placeholder="e.g. Spice Kitchen"
//                   value={businessName}
//                   onChange={(e) => setBusinessName(e.target.value)}
//                   autoFocus
//                   className="onboarding-input"
//                 />
//               </div>

//               <div className="flex flex-col gap-2">
//                 <label htmlFor="city" className="onboarding-label">
//                   City
//                 </label>
//                 <input
//                   id="city"
//                   type="text"
//                   placeholder="e.g. Mumbai"
//                   value={city}
//                   onChange={(e) => setCity(e.target.value)}
//                   className="onboarding-input"
//                 />
//               </div>

//               {/* Logo upload */}
//               <div className="flex flex-col gap-2">
//                 <label className="onboarding-label">
//                   Logo (optional)
//                 </label>
//                 <div
//                   className="logo-upload-zone"
//                   onDragOver={(e) => e.preventDefault()}
//                   onDrop={handleDrop}
//                   onClick={() => document.getElementById('logoInput')?.click()}
//                 >
//                   {logoPreview ? (
//                     <img src={logoPreview} alt="Logo preview" className="h-28 w-28 rounded-xl object-cover" />
//                   ) : (
//                     <div className="flex flex-col items-center gap-3 text-center py-6">
//                       <span className="text-5xl opacity-40">📷</span>
//                       <div className="flex flex-col gap-1">
//                         <span className="text-base font-medium text-white/70">Drag & drop or click to upload</span>
//                         <span className="text-xs text-white/40">JPEG, PNG, WebP · Max 2 MB</span>
//                       </div>
//                     </div>
//                   )}
//                   <input
//                     id="logoInput"
//                     type="file"
//                     accept="image/jpeg,image/png,image/webp"
//                     hidden
//                     onChange={(e) => {
//                       const file = e.target.files?.[0];
//                       if (file) handleLogoSelect(file);
//                     }}
//                   />
//                 </div>
//               </div>
//             </div>

//             {error && <p className="text-red-400 text-sm text-center mb-6">{error}</p>}

//             <div className="flex justify-between items-center">
//               <button className="onboarding-btn-back" onClick={goBack}>
//                 Back
//               </button>
//               <button
//                 className="onboarding-btn-primary"
//                 disabled={!businessName.trim()}
//                 onClick={goNext}
//               >
//                 Continue
//               </button>
//             </div>
//           </div>
//         )}

//         {/* ---- Step 3: Google URL ---- */}
//         {currentStep === 'google-url' && (
//           <div className="onboarding-step">
//             <h1 className="onboarding-title">
//               Your Google Review Link
//             </h1>
//             <p className="onboarding-subtitle">
//               This is where customers will be redirected to leave a review
//             </p>

//             <div className="flex flex-col gap-2 mb-5">
//               <label htmlFor="googleUrl" className="onboarding-label">
//                 Google Review URL *
//               </label>
//               <div className="relative">
//                 <input
//                   id="googleUrl"
//                   type="url"
//                   placeholder="https://g.page/r/your-business/review"
//                   value={googleReviewUrl}
//                   onChange={(e) => {
//                     setGoogleReviewUrl(e.target.value);
//                     setUrlVerified(false);
//                   }}
//                   className="onboarding-input pr-24"
//                 />
//                 <button
//                   className={`absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${urlVerified
//                     ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
//                     : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30'
//                     }`}
//                   onClick={verifyUrl}
//                   disabled={!googleReviewUrl.trim()}
//                 >
//                   {urlVerified ? '✓ Verified' : 'Verify'}
//                 </button>
//               </div>
//             </div>

//             {urlVerified && (
//               <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm mb-5">
//                 <span className="text-lg">✓</span>
//                 <span>link verified</span>
//               </div>
//             )}

//             <button
//               className="text-sm font-medium transition-all duration-200 mb-8 inline-block"
//               style={{ color: '#818cf8' }}
//               onClick={() => setShowHelpModal(true)}
//             >
//               Don't know your link? →
//             </button>

//             {/* Help modal */}
//             {showHelpModal && (
//               <div
//                 className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
//                 onClick={() => setShowHelpModal(false)}
//               >
//                 <div
//                   className="w-full max-w-md p-8 rounded-2xl border border-white/10 shadow-2xl"
//                   style={{ background: 'var(--color-surface-elevated)' }}
//                   onClick={(e) => e.stopPropagation()}
//                 >
//                   <h3 className="text-xl font-bold mb-4 text-white">
//                     How to find your Google Review link
//                   </h3>
//                   <ol className="list-decimal list-inside flex flex-col gap-2.5 text-sm mb-6 text-gray-300">
//                     <li>Search for your business on <strong className="text-white">Google Maps</strong></li>
//                     <li>Click your business listing</li>
//                     <li>Click <strong className="text-white">"Share"</strong></li>
//                     <li>Copy the link</li>
//                     <li>Paste it above!</li>
//                   </ol>
//                   <p className="text-xs mb-6 text-gray-400">
//                     Tip: The link usually starts with <code className="px-2 py-0.5 rounded bg-white/5 font-mono text-xs">https://g.page/r/...</code> or{' '}
//                     <code className="px-2 py-0.5 rounded bg-white/5 font-mono text-xs">https://maps.app.goo.gl/...</code>
//                   </p>
//                   <button
//                     className="w-full px-6 py-3 rounded-xl font-semibold border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all duration-200 text-gray-300"
//                     onClick={() => setShowHelpModal(false)}
//                   >
//                     Got it
//                   </button>
//                 </div>
//               </div>
//             )}

//             {error && <p className="text-red-400 text-sm text-center mb-6">{error}</p>}

//             <div className="flex justify-between items-center">
//               <button className="onboarding-btn-back" onClick={goBack}>
//                 Back
//               </button>
//               <button
//                 className="onboarding-btn-primary"
//                 disabled={!urlVerified || isSubmitting}
//                 onClick={handleSubmit}
//               >
//                 {isSubmitting ? 'Creating...' : 'Create My Business'}
//               </button>
//             </div>
//           </div>
//         )}

//         {/* ---- Step 4: Confirmation + QR ---- */}
//         {currentStep === 'confirmation' && createdBusiness && (
//           <div className="onboarding-step text-center">
//             <div className="text-6xl mb-5">✓</div>
//             <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
//               {createdBusiness.name} is ready
//             </h1>
//             <p className="mb-10 text-lg" style={{ color: 'var(--color-text-secondary)' }}>
//               Your QR code is ready. Share it with customers to start collecting reviews!
//             </p>

//             <div className="inline-flex flex-col items-center gap-5 p-8 rounded-2xl border border-white/10 mb-8"
//               style={{ background: 'var(--color-surface-card)' }}>
//               <div className="bg-white p-5 rounded-2xl shadow-xl">
//                 <QRCodeCanvas
//                   ref={qrRef}
//                   value={`${PUBLIC_APP_URL}/r/${createdBusiness.businessCode}`}
//                   size={200}
//                   level="H"
//                   bgColor="#ffffff"
//                   fgColor="#1a1a2e"
//                   imageSettings={
//                     createdBusiness.logoUrl
//                       ? {
//                         src: createdBusiness.logoUrl,
//                         height: 40,
//                         width: 40,
//                         excavate: true,
//                       }
//                       : undefined
//                   }
//                 />
//               </div>
//               <p className="text-xs font-mono px-4 py-2 rounded-lg bg-white/5" style={{ color: 'var(--color-text-muted)' }}>
//                 reviewboost.app/r/{createdBusiness.businessCode}
//               </p>
//               <button
//                 className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all duration-200 text-white"
//                 onClick={downloadQR}
//               >
//                 <span>⬇</span>
//                 Download QR code
//               </button>
//             </div>

//             <button
//               className="w-full max-w-md px-8 py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 hover:from-indigo-600 hover:via-purple-600 hover:to-indigo-700 transition-all duration-200 shadow-lg shadow-indigo-500/20"
//               onClick={() => navigate('/dashboard')}
//             >
//               Go to dashboard →
//             </button>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }


import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import api, { type ApiResponse } from '../lib/api';
import { useAppAuth } from '../providers/AuthProvider';
import type { Business } from '../types';

const BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { value: 'cafe', label: 'Café', icon: '☕' },
  { value: 'bakery', label: 'Bakery', icon: '🥖' },
  { value: 'other', label: 'Other', icon: '•••' },
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

  // ---- Shared style tokens (match the approved minimal black/white/green design) ----
  const colors = {
    pageBg: '#F2F0EA',
    cardBg: '#FFFFFF',
    border: '#E3E1D9',
    borderActive: '#1A1A1A',
    ink: '#1A1A1A',
    inkMuted: '#6B6B63',
    inkFaint: '#A3A39A',
    green: '#3F7D45',
    greenBg: '#E9F2E7',
    link: '#2D5DA1',
    danger: '#B3433A',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    fontSize: '15px',
    color: colors.ink,
    background: colors.cardBg,
    border: `1px solid ${colors.border}`,
    borderRadius: '7px',
    padding: '13px 15px',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '14px',
    color: colors.ink,
    fontWeight: 500,
    marginBottom: '8px',
    display: 'block',
  };

  const primaryBtnStyle: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: 600,
    borderRadius: '8px',
    padding: '14px 28px',
    background: colors.ink,
    color: '#fff',
    border: `1px solid ${colors.ink}`,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    cursor: 'pointer',
  };

  const outlineBtnStyle: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: 600,
    borderRadius: '8px',
    padding: '14px 28px',
    background: '#fff',
    color: colors.ink,
    border: `1px solid ${colors.border}`,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    cursor: 'pointer',
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
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, textAlign: 'center', marginBottom: '10px', color: colors.ink }}>
              Choose your business type
            </h1>
            <p style={{ fontSize: '14px', color: colors.inkMuted, textAlign: 'center', marginBottom: '28px', lineHeight: 1.5 }}>
              This sets up the right tags and copy for you
            </p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              {BUSINESS_TYPES.map((type) => {
                const selected = businessType === type.value;
                return (
                  <button
                    key={type.value}
                    onClick={() => {
                      setBusinessType(type.value);
                      if (type.value !== 'other') setCustomBusinessType('');
                    }}
                    style={{
                      border: `1px solid ${selected ? colors.borderActive : colors.border}`,
                      borderWidth: selected ? '1.5px' : '1px',
                      borderRadius: '9px',
                      padding: '28px 12px',
                      textAlign: 'center',
                      background: colors.cardBg,
                      cursor: 'pointer',
                    }}
                  >
                    <span className="text-4xl mb-3 block">{type.icon}</span>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: colors.ink }}>{type.label}</span>
                  </button>
                );
              })}
            </div>

            {businessType === 'other' && (
              <div className="mb-8">
                <label htmlFor="customType" style={labelStyle}>
                  Please specify your business type
                </label>
                <input
                  id="customType"
                  type="text"
                  placeholder="e.g. Spa, Salon, Gym..."
                  value={customBusinessType}
                  onChange={(e) => setCustomBusinessType(e.target.value)}
                  autoFocus
                  style={inputStyle}
                />
              </div>
            )}

            {error && <p style={{ color: colors.danger, fontSize: '14px', textAlign: 'center', marginBottom: '20px' }}>{error}</p>}

            <button
              style={{
                ...primaryBtnStyle,
                width: '100%',
                marginTop: '20px',
                opacity: !businessType || (businessType === 'other' && !customBusinessType.trim()) ? 0.5 : 1,
                cursor: !businessType || (businessType === 'other' && !customBusinessType.trim()) ? 'not-allowed' : 'pointer',
              }}
              disabled={!businessType || (businessType === 'other' && !customBusinessType.trim())}
              onClick={goNext}
            >
              Continue →
            </button>
          </div>
        )}

        {/* ---- Step 2: Profile ---- */}
        {currentStep === 'profile' && (
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, textAlign: 'center', marginBottom: '10px', color: colors.ink }}>
              Tell us about your place
            </h1>
            <p style={{ fontSize: '14px', color: colors.inkMuted, textAlign: 'center', marginBottom: '28px', lineHeight: 1.5 }}>
              This info helps us personalize the review experience
            </p>

            <div className="flex flex-col gap-6 mb-8">
              <div>
                <label htmlFor="businessName" style={labelStyle}>Business name</label>
                <input
                  id="businessName"
                  type="text"
                  placeholder="e.g. Spice Kitchen"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  autoFocus
                  style={inputStyle}
                />
              </div>

              <div>
                <label htmlFor="city" style={labelStyle}>City</label>
                <input
                  id="city"
                  type="text"
                  placeholder="e.g. Mumbai"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Logo (optional)</label>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('logoInput')?.click()}
                  style={{
                    border: `1px dashed ${colors.border}`,
                    borderRadius: '9px',
                    padding: '32px 16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                  }}
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo preview" className="h-24 w-24 rounded-lg object-cover mx-auto" />
                  ) : (
                    <div>
                      <span className="text-3xl block mb-3" style={{ color: colors.inkFaint }}>📷</span>
                      <p style={{ fontSize: '14px', color: colors.inkMuted, margin: 0 }}>
                        Drag &amp; drop or click to upload
                      </p>
                      <p style={{ fontSize: '12px', color: colors.inkFaint, margin: '4px 0 0' }}>
                        JPEG, PNG, WebP · Max 2 MB
                      </p>
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

            {error && <p style={{ color: colors.danger, fontSize: '14px', textAlign: 'center', marginBottom: '20px' }}>{error}</p>}

            <div className="flex justify-between items-center gap-3" style={{ marginTop: '20px' }}>
              <button style={outlineBtnStyle} onClick={goBack}>Back</button>
              <button
                style={{ ...primaryBtnStyle, flex: 1, opacity: !businessName.trim() ? 0.5 : 1, cursor: !businessName.trim() ? 'not-allowed' : 'pointer' }}
                disabled={!businessName.trim()}
                onClick={goNext}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ---- Step 3: Google URL ---- */}
        {currentStep === 'google-url' && (
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, textAlign: 'center', marginBottom: '10px', color: colors.ink }}>
              Add your Google review link
            </h1>
            <p style={{ fontSize: '14px', color: colors.inkMuted, textAlign: 'center', marginBottom: '28px', lineHeight: 1.5 }}>
              This is where customers will post their reviews
            </p>

            <div className="mb-5">
              <input
                id="googleUrl"
                type="url"
                placeholder="Paste your Google review link"
                value={googleReviewUrl}
                onChange={(e) => {
                  setGoogleReviewUrl(e.target.value);
                  setUrlVerified(false);
                }}
                style={inputStyle}
              />
            </div>

            {!urlVerified && (
              <button
                style={{ ...outlineBtnStyle, width: '100%', marginBottom: '18px' }}
                onClick={verifyUrl}
                disabled={!googleReviewUrl.trim()}
              >
                Verify link
              </button>
            )}

            {urlVerified && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  background: colors.greenBg,
                  color: colors.green,
                  fontSize: '14px',
                  fontWeight: 500,
                  padding: '11px 16px',
                  borderRadius: '8px',
                  marginBottom: '18px',
                }}
              >
                <span>✓</span>
                <span>link verified</span>
              </div>
            )}

            <button
              style={{ fontSize: '14px', color: colors.inkMuted, background: 'none', border: 'none', padding: 0, marginBottom: '32px', cursor: 'pointer' }}
              onClick={() => setShowHelpModal(true)}
            >
              don't know your link? <span style={{ color: colors.link, textDecoration: 'underline' }}>find it here</span>
            </button>

            {/* Help modal */}
            {showHelpModal && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ background: 'rgba(26,26,26,0.5)' }}
                onClick={() => setShowHelpModal(false)}
              >
                <div
                  className="w-full max-w-md"
                  style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: '10px', padding: '32px' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: colors.ink }}>
                    How to find your Google Review link
                  </h3>
                  <ol style={{ fontSize: '14px', color: colors.inkMuted, lineHeight: 1.8, paddingLeft: '20px', marginBottom: '20px' }}>
                    <li>Search for your business on <strong style={{ color: colors.ink }}>Google Maps</strong></li>
                    <li>Click your business listing</li>
                    <li>Click <strong style={{ color: colors.ink }}>"Share"</strong></li>
                    <li>Copy the link</li>
                    <li>Paste it above!</li>
                  </ol>
                  <p style={{ fontSize: '13px', color: colors.inkFaint, marginBottom: '20px' }}>
                    Tip: the link usually starts with <code>g.page/r/...</code> or <code>maps.app.goo.gl/...</code>
                  </p>
                  <button style={{ ...outlineBtnStyle, width: '100%' }} onClick={() => setShowHelpModal(false)}>
                    Got it
                  </button>
                </div>
              </div>
            )}

            {error && <p style={{ color: colors.danger, fontSize: '14px', textAlign: 'center', marginBottom: '20px' }}>{error}</p>}

            <div className="flex justify-between items-center gap-3" style={{ marginTop: '20px' }}>
              <button style={outlineBtnStyle} onClick={goBack}>Back</button>
              <button
                style={{ ...primaryBtnStyle, flex: 1, opacity: !urlVerified || isSubmitting ? 0.5 : 1, cursor: !urlVerified || isSubmitting ? 'not-allowed' : 'pointer' }}
                disabled={!urlVerified || isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting ? 'Creating...' : 'Continue →'}
              </button>
            </div>
          </div>
        )}

        {/* ---- Step 4: Confirmation + QR ---- */}
        {currentStep === 'confirmation' && createdBusiness && (
          <div className="text-center">
            <div
              style={{
                width: '32px',
                height: '32px',
                border: `2px solid ${colors.green}`,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.green,
                margin: '0 auto 12px',
                fontSize: '16px',
              }}
            >
              ✓
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px', color: colors.ink }}>
              {createdBusiness.name} is ready
            </h1>

            <div
              style={{
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '14px',
                padding: '24px',
                border: `1px solid ${colors.border}`,
                borderRadius: '9px',
                marginBottom: '24px',
              }}
            >
              <div style={{ background: '#fff', padding: '12px', borderRadius: '8px' }}>
                <QRCodeCanvas
                  ref={qrRef}
                  value={`${PUBLIC_APP_URL}/r/${createdBusiness.businessCode}`}
                  size={160}
                  level="H"
                  bgColor="#ffffff"
                  fgColor={colors.ink}
                  imageSettings={
                    createdBusiness.logoUrl
                      ? { src: createdBusiness.logoUrl, height: 34, width: 34, excavate: true }
                      : undefined
                  }
                />
              </div>
              <p style={{ fontSize: '13px', color: colors.inkMuted, margin: 0 }}>
                reviewboost.app/r/{createdBusiness.businessCode}
              </p>
              <button style={{ ...outlineBtnStyle, width: '100%' }} onClick={downloadQR}>
                ⬇ Download QR code
              </button>
            </div>

            <button
              style={{ ...primaryBtnStyle, width: '100%' }}
              onClick={() => navigate('/dashboard')}
            >
              Go to dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
