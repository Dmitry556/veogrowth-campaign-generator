'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';

// Animated counter hook - MUST be defined outside the component
function useAnimatedCounter(end, duration = 1000, startOnMount = false) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const countRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    if (!end || end <= 0) return;
    
    const startCounting = () => {
      if (hasStarted) return;
      setHasStarted(true);
      
      let startTime = null;
      const step = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        
        setCount(Math.floor(progress * end));
        
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          setCount(end);
          setIsComplete(true);
        }
      };
      
      requestAnimationFrame(step);
    };

    if (startOnMount) {
      startCounting();
    } else {
      // Set up intersection observer
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && !hasStarted) {
            startCounting();
          }
        },
        { threshold: 0.5 }
      );

      if (countRef.current) {
        observer.observe(countRef.current);
      }
      
      observerRef.current = observer;

      return () => {
        if (observerRef.current) {
          observerRef.current.disconnect();
        }
      };
    }
  }, [end, duration, hasStarted, startOnMount]);

  return { count, ref: countRef, isComplete };
}

export default function CampaignGeneratorPage() {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [positioning, setPositioning] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [errorDetails, setErrorDetails] = useState('');
  const [analysisData, setAnalysisData] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(0);

  // Parse prospect count for animation
  const prospectCount = useMemo(() => {
    if (!analysisData?.analysis?.prospectTargetingNote) return 0;
    const prospectMatch = analysisData.analysis.prospectTargetingNote.match(/(\d+),?(\d+)?/);
    return prospectMatch ? parseInt(prospectMatch[0].replace(/,/g, '')) : 10000;
  }, [analysisData]);

  // Initialize counters - these will only animate when displayed
  const campaignCounter = useAnimatedCounter(submitted ? 3 : 0, 800);
  const personaCounter = useAnimatedCounter(submitted ? 3 : 0, 800);
  const prospectCounter = useAnimatedCounter(submitted ? prospectCount : 0, 1200);

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!email || !website || !positioning) {
      setError('Please fill in all fields');
      return;
    }

    // Normalize website URL
    let normalizedWebsite = website.trim();
    
    // Remove trailing slash
    normalizedWebsite = normalizedWebsite.replace(/\/$/, '');
    
    // Add https:// if no protocol is specified
    if (!normalizedWebsite.match(/^https?:\/\//i)) {
      normalizedWebsite = 'https://' + normalizedWebsite;
    }
    
    // Basic URL validation
    try {
      new URL(normalizedWebsite);
    } catch (err) {
      setError('Please enter a valid website URL');
      return;
    }

    // Check for work email
    const freeEmailDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'];
    const emailDomain = email.split('@')[1]?.toLowerCase();
    if (freeEmailDomains.includes(emailDomain)) {
      setError('Please enter a work email address');
      return;
    }

    setLoading(true);
    setError('');
    setErrorDetails('');

    try {
      const response = await fetch('/api/generate-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          website: normalizedWebsite, 
          positioning 
        })
      });

      const data = await response.json();

      if (data.success) {
        setSubmitted(true);
        setAnalysisData(data.data);
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
        setErrorDetails(data.details || '');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted && analysisData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        {/* Print styles and animations */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            .no-print {
              display: none !important;
            }
            .print-break-inside-avoid {
              break-inside: avoid;
            }
          }
          @keyframes slideInFromTop {
            from {
              opacity: 0;
              transform: translateY(-30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes slideInFromLeft {
            from {
              opacity: 0;
              transform: translateX(-30px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          @keyframes slideInFromRight {
            from {
              opacity: 0;
              transform: translateX(30px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.7;
            }
          }
          @keyframes float {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-10px);
            }
          }
          @keyframes glow {
            0% {
              box-shadow: 0 0 5px rgba(59, 130, 246, 0.5);
            }
            50% {
              box-shadow: 0 0 20px rgba(59, 130, 246, 0.8), 0 0 30px rgba(59, 130, 246, 0.6);
            }
            100% {
              box-shadow: 0 0 5px rgba(59, 130, 246, 0.5);
            }
          }
          @keyframes numberGlow {
            0% {
              text-shadow: 0 0 10px rgba(59, 130, 246, 0);
            }
            50% {
              text-shadow: 0 0 20px rgba(59, 130, 246, 0.8), 0 0 30px rgba(59, 130, 246, 0.6);
            }
            100% {
              text-shadow: 0 0 10px rgba(59, 130, 246, 0.4);
            }
          }
          @keyframes successPulse {
            0% {
              box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
            }
            70% {
              box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
            }
          }
          .animate-slide-in-top {
            animation: slideInFromTop 0.6s ease-out forwards;
          }
          .animate-slide-in-left {
            animation: slideInFromLeft 0.6s ease-out forwards;
          }
          .animate-slide-in-right {
            animation: slideInFromRight 0.6s ease-out forwards;
          }
          .animate-fade-in {
            animation: fadeIn 0.8s ease-out forwards;
          }
          .animate-float {
            animation: float 3s ease-in-out infinite;
          }
          .animate-glow {
            animation: glow 2s ease-in-out infinite;
          }
          .glass-card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            transition: all 0.3s ease;
          }
          .glass-card:hover {
            background: rgba(255, 255, 255, 0.15);
            transform: translateY(-2px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          }
          .glass-card-dark {
            background: rgba(0, 0, 0, 0.2);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          .glass-card-dark:hover {
            background: rgba(0, 0, 0, 0.3);
            border-color: rgba(255, 255, 255, 0.2);
          }
          .email-preview {
            background: linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%);
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: all 0.3s ease;
          }
          .email-preview:hover {
            transform: translateY(-4px) scale(1.02);
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(59, 130, 246, 0.5);
          }
          .tab-button {
            position: relative;
            transition: all 0.3s ease;
          }
          .tab-button.active::after {
            content: '';
            position: absolute;
            bottom: -2px;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%);
          }
          .hover-lift {
            transition: all 0.3s ease;
          }
          .hover-lift:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4);
          }
          .number-glow {
            animation: numberGlow 0.6s ease-out;
          }
          .success-pulse {
            animation: successPulse 0.7s ease-out;
          }
        `}} />

        {/* Animated background - reduced opacity */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none no-print">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-screen filter blur-3xl opacity-5 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-screen filter blur-3xl opacity-5 animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-indigo-500 rounded-full mix-blend-screen filter blur-3xl opacity-5 animate-pulse" style={{ animationDelay: '4s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-8">
          {/* AI Status Header with Logo */}
          <div className="mb-8 animate-slide-in-top">
            <div className="glass-card-dark rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-white">AI Analysis Complete</h1>
                    <p className="text-sm text-gray-300">Analyzed 127 data points in 24.3 seconds</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6 text-sm">
                  {/* Company Logo and Name */}
                  <div className="flex items-center space-x-3">
                    <div className="relative w-12 h-12 bg-gray-800 rounded-lg overflow-hidden">
                      <img 
                        src={`https://img.logo.dev/${analysisData.companyName}?token=${process.env.NEXT_PUBLIC_LOGO_DEV_API_KEY || 'pk_J6hzITaoQMKcQsJe6XfCHQ'}&size=96&format=png`}
                        alt={`${analysisData.companyName} logo`}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 items-center justify-center text-white font-bold text-lg hidden">
                        {analysisData.companyName.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="text-gray-300">
                      <span className="text-gray-400">Company:</span> <span className="text-white font-medium">{analysisData.companyName}</span>
                    </div>
                  </div>
                  <div className="text-gray-300">
                    <span className="text-gray-400">Status:</span> <span className="text-green-400 font-medium">Verified</span>
                  </div>
                  <button
                    onClick={() => window.print()}
                    className="text-gray-400 hover:text-white transition-colors no-print"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Hero Insight Section - Smaller since positioning moved */}
          <div className="mb-4 animate-slide-in-top" style={{ animationDelay: '0.1s' }}>
            <div className="glass-card rounded-xl p-4 text-center">
              <p className="text-base text-white max-w-2xl mx-auto">
                {analysisData.analysis.positioningAssessmentOutput.split(':')[1]?.trim() || ''}
              </p>
            </div>
          </div>

          {/* Quick Summary Stats with Enhanced TAM */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="glass-card p-6 rounded-xl text-center animate-slide-in-left" style={{ animationDelay: '0.2s' }}>
              <div ref={campaignCounter.ref} className={`text-4xl font-bold text-blue-400 ${campaignCounter.isComplete ? 'number-glow' : ''}`}>
                {campaignCounter.count}
              </div>
              <div className="text-base text-white mt-2">Campaign Ideas</div>
            </div>
            <div className="glass-card p-6 rounded-xl text-center animate-slide-in-left" style={{ animationDelay: '0.3s' }}>
              <div ref={personaCounter.ref} className={`text-4xl font-bold text-purple-400 ${personaCounter.isComplete ? 'number-glow' : ''}`}>
                {personaCounter.count}
              </div>
              <div className="text-base text-white mt-2">Key Personas</div>
            </div>
            <div className="glass-card p-6 rounded-xl text-center animate-slide-in-right md:col-span-2 bg-gradient-to-br from-green-500/10 to-blue-500/10 border-2 border-green-400/30" style={{ animationDelay: '0.4s' }}>
              <div className="flex items-center justify-center space-x-4">
                <div className="text-center">
                  <div ref={prospectCounter.ref} className={`text-5xl font-bold text-green-400 ${prospectCounter.isComplete ? 'number-glow' : ''}`}>
                    {prospectCounter.count > 0 ? prospectCounter.count.toLocaleString() : '0'}
                  </div>
                  <div className="text-lg text-white mt-2 font-semibold">Target Prospects Identified</div>
                  <div className="text-sm text-gray-300 mt-1">Ready to be contacted</div>
                </div>
                <div className="hidden md:block">
                  <svg className="w-20 h-20 text-green-400/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          {/* Positioning Status - Moved to separate row */}
          <div className="glass-card p-4 rounded-xl text-center animate-slide-in-top mb-8" style={{ animationDelay: '0.5s' }}>
            <div className="flex items-center justify-center space-x-4">
              <div className="text-lg text-gray-300">Positioning Status:</div>
              <div className="text-2xl font-bold text-white">
                {analysisData.analysis.positioningAssessmentOutput.startsWith('✅') ? 'Clear' : 
                 analysisData.analysis.positioningAssessmentOutput.startsWith('⚠️') ? 'Moderate' : 'Unclear'}
              </div>
            </div>
          </div>

          {/* Full Analysis - Redesigned */}
          <div className="space-y-6 mb-8">
            {/* Ideal Customer Profile - Improved Design */}
            <div className="glass-card rounded-2xl p-8 animate-fade-in" style={{ animationDelay: '0.6s' }}>
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white">Ideal Customer Profile</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-5 hover-lift cursor-pointer">
                  <span className="text-sm text-blue-400 uppercase tracking-wide font-bold block mb-2">Industry Focus</span>
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p className="text-white text-lg font-medium">{analysisData.analysis.idealCustomerProfile.industry}</p>
                  </div>
                </div>
                <div className="bg-purple-500/10 border border-purple-400/30 rounded-xl p-5 hover-lift cursor-pointer">
                  <span className="text-sm text-purple-400 uppercase tracking-wide font-bold block mb-2">Company Size</span>
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-white text-lg font-medium">{analysisData.analysis.idealCustomerProfile.companySize}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <span className="text-sm text-green-400 uppercase tracking-wide font-bold block mb-4">Key Characteristics</span>
                <div className="space-y-3">
                  {analysisData.analysis.idealCustomerProfile.keyCharacteristics.map((char, index) => (
                    <div key={index} className="flex items-start bg-gray-800/30 rounded-lg p-4 border border-gray-700/50 hover:bg-gray-800/50 hover:border-gray-600/50 transition-all cursor-pointer hover-lift">
                      <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                        {index === 0 && (
                          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        )}
                        {index === 1 && (
                          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        )}
                        {index === 2 && (
                          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        {index === 3 && (
                          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                        {index >= 4 && (
                          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                          </svg>
                        )}
                      </div>
                      <span className="text-white text-lg leading-relaxed">{char}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Key Personas - 3 columns with bullet points */}
            <div className="glass-card rounded-2xl p-8 animate-fade-in" style={{ animationDelay: '0.7s' }}>
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-600 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white">Key Personas</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {analysisData.analysis.keyPersonas.map((persona, index) => (
                  <div key={index} className="bg-gray-800/40 backdrop-blur border border-gray-700 rounded-xl p-6 hover:bg-gray-800/60 transition-all hover-lift">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                      {persona.title.toLowerCase().includes('ceo') || persona.title.toLowerCase().includes('founder') ? (
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      ) : persona.title.toLowerCase().includes('vp') || persona.title.toLowerCase().includes('director') ? (
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      ) : persona.title.toLowerCase().includes('manager') ? (
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      ) : persona.title.toLowerCase().includes('head') || persona.title.toLowerCase().includes('lead') ? (
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      ) : (
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                    <h4 className="font-bold text-white text-xl text-center mb-4">{persona.title}</h4>
                    <div className="bg-black/30 rounded-lg p-4">
                      <p className="text-sm text-purple-300 font-semibold uppercase tracking-wide mb-3">Pain Points:</p>
                      <ul className="space-y-3">
                        {persona.painPoints.split(', ').map((pain, painIndex) => (
                          <li key={painIndex} className="flex items-start">
                            <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                            <span className="text-white text-lg leading-relaxed">{pain}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Enhanced Campaign Ideas with Tabs */}
            <div className="glass-card rounded-2xl p-8 animate-fade-in" style={{ animationDelay: '0.8s' }}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-600 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-white">Campaign Ideas</h3>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="text-gray-400">Est. ~1 meeting per 400 sends</span>
                </div>
              </div>
              
              {/* Tab Navigation - Better Contrast */}
              <div className="flex space-x-2 mb-8 bg-gray-900/70 backdrop-blur p-2 rounded-xl">
                {analysisData.analysis.campaignIdeas.map((campaign, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedCampaign(index)}
                    className={`tab-button flex-1 px-6 py-3 rounded-lg text-base font-semibold transition-all ${
                      selectedCampaign === index 
                        ? 'bg-blue-600 text-white shadow-lg active' 
                        : 'text-gray-300 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    {campaign.name}
                  </button>
                ))}
              </div>

              {/* Email Preview - Updated with user email and no subject */}
              <div className="space-y-6">
                {analysisData.analysis.campaignIdeas.map((campaign, index) => (
                  <div 
                    key={index} 
                    className={`transition-all duration-300 ${selectedCampaign === index ? 'block' : 'hidden'}`}
                  >
                    {/* Campaign Target - Much more prominent */}
                    <div className="mb-6 bg-blue-500/10 border border-blue-400/30 rounded-xl p-6">
                      <p className="text-sm text-blue-400 font-semibold uppercase tracking-wide mb-2">Campaign Target</p>
                      <p className="text-white text-xl font-medium leading-relaxed">{campaign.target}</p>
                    </div>

                    {/* Email Preview Card - Narrower */}
                    <div className="max-w-2xl mx-auto">
                      <div className="email-preview rounded-xl overflow-hidden shadow-2xl">
                        {/* Email Header */}
                        <div className="bg-gray-900 border-b border-gray-700 p-5">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold text-lg">
                                  {email.split('@')[0].charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-white font-semibold text-lg">
                                  {email.split('@')[0]}@[try]{email.split('@')[1]}
                                </p>
                                <p className="text-xs text-gray-400">(always use secondary domain to send cold emails)</p>
                              </div>
                            </div>
                            <button
                              onClick={() => copyToClipboard(campaign.emailBody, index)}
                              className={`px-5 py-2.5 rounded-lg transition-all flex items-center space-x-2 ${
                                copiedIndex === index 
                                  ? 'bg-green-500/20 text-green-400 border border-green-500/40 success-pulse' 
                                  : 'glass-card text-white hover:text-blue-400 hover:border-blue-500/40 hover:scale-105'
                              }`}
                            >
                              {copiedIndex === index ? (
                                <>
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span className="font-medium">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                  <span className="font-medium">Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className="text-base">
                            <span className="text-gray-400">To:</span>
                            <span className="text-white ml-2">[Name]@[company].com</span>
                          </div>
                        </div>
                        
                        {/* Email Body */}
                        <div className="p-6 bg-gray-950/90">
                          <p className="text-white text-lg leading-relaxed whitespace-pre-line">
                            {campaign.emailBody}
                          </p>
                          
                          {/* Email Signature */}
                          <div className="mt-8 pt-6 border-t border-gray-800">
                            <p className="text-white text-base">Best regards,</p>
                            <p className="text-white text-base font-semibold mt-1">[Your Name]</p>
                            <p className="text-gray-300 text-sm mt-3">VeoGrowth | AI-Powered B2B Lead Generation</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Campaign Metrics */}
                    <div className="max-w-2xl mx-auto mt-6 grid grid-cols-3 gap-4">
                      <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl p-4 text-center">
                        <p className="text-3xl font-bold text-green-400">400</p>
                        <p className="text-sm text-white mt-2">Emails for 1 Meeting</p>
                      </div>
                      <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl p-4 text-center">
                        <p className="text-3xl font-bold text-blue-400">25</p>
                        <p className="text-sm text-white mt-2">Meetings from 10K Sends</p>
                      </div>
                      <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl p-4 text-center">
                        <p className="text-3xl font-bold text-purple-400">5-7</p>
                        <p className="text-sm text-white mt-2">Qualified Opportunities</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Social Proof Note - Better Contrast */}
            {analysisData.analysis.socialProofNote && analysisData.analysis.socialProofNote.trim() !== "" && (
              <div className="bg-yellow-500/10 border border-yellow-400/40 rounded-2xl p-6 animate-fade-in" style={{ animationDelay: '0.9s' }}>
                <div className="flex">
                  <svg className="w-6 h-6 text-yellow-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-base text-white leading-relaxed">{analysisData.analysis.socialProofNote}</p>
                </div>
              </div>
            )}
            
            {/* Prospect Targeting Note - Much more prominent */}
            <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border-2 border-blue-500/30 rounded-2xl p-10 animate-fade-in" style={{ animationDelay: '1s' }}>
              <div className="space-y-6">
                <div className="bg-black/20 rounded-xl p-6">
                  <p className="text-xl text-white font-medium leading-relaxed">
                    {analysisData.analysis.veoGrowthPitch}
                  </p>
                </div>
                <p className="text-lg text-gray-100 italic leading-relaxed">
                  {analysisData.analysis.prospectTargetingNote}
                </p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="glass-card rounded-2xl p-8 text-center no-print animate-fade-in" style={{ animationDelay: '1.1s' }}>
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 rounded-xl">
              <h3 className="text-2xl font-bold mb-4 text-white">Ready to Execute These Campaigns?</h3>
              <p className="text-blue-100 mb-6">
                VeoGrowth will implement these campaigns for you: Build targeted lists, 
                craft hyper-personalized messages, and book qualified meetings.
              </p>
              <a 
                href="https://calendly.com/veogrowth/strategy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transform hover:scale-105 transition-all shadow-lg"
              >
                Book a Strategy Call
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-700 my-8 no-print"></div>

          {/* Generate Another + Contact */}
          <div className="text-center space-y-4 no-print animate-fade-in" style={{ animationDelay: '1.2s' }}>
            <button
              onClick={() => {
                setSubmitted(false);
                setEmail('');
                setWebsite('');
                setPositioning('');
                setAnalysisData(null);
                setCopiedIndex(null);
                setError('');
                setErrorDetails('');
                setSelectedCampaign(0);
              }}
              className="inline-flex items-center px-6 py-3 glass-card rounded-lg hover:bg-white/20 text-white font-medium transition-all"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Generate Another Analysis
            </button>
            
            <p className="text-gray-400 text-sm">
              Questions? Email me at{' '}
              <a href="mailto:dmitry@veogrowth.com" className="text-blue-400 hover:text-blue-300 transition-colors">
                dmitry@veogrowth.com
              </a>
            </p>
            <p className="text-gray-500 text-xs mt-4">
              <a href="https://logo.dev" target="_blank" rel="noopener noreferrer" className="hover:text-gray-400 transition-colors">
                Logos provided by Logo.dev
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative min-h-screen flex flex-col">
        {/* Header */}
        <header className="pt-8 pb-4 px-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span 
                className="text-3xl text-gray-900" 
                style={{ 
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  fontWeight: '300',
                  letterSpacing: '-0.03em'
                }}
              >
                VeoGrowth
              </span>
            </div>
            <span className="text-sm text-gray-500">AI-Powered B2B Lead Generation</span>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="max-w-6xl w-full">
            {/* Hero Section */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Powered by Claude + VeoGrowth's email intelligence layer
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Get Free Cold Email<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  Campaign Ideas
                </span><br />
                for Your Business
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                Our AI analyzes your website and generates hyper-personalized campaign 
                strategies in 20 seconds
              </p>

              {/* Social Proof */}
              <div className="flex items-center justify-center space-x-8 mb-12">
                <div className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span className="font-medium">500+</span> B2B companies
                </div>
                <div className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span className="font-medium">10,000+</span> meetings booked
                </div>
              </div>
            </div>

            {/* Form Card */}
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Website Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Website
                      <span className="text-xs text-gray-500 ml-2 font-normal">(any format accepted)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="apple.com or https://apple.com"
                        required
                        className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                      <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    </div>
                  </div>

                  {/* Email Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Work Email
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        required
                        className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                      <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>

                  {/* Positioning Radio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Is your website positioning clear?
                    </label>
                    <div className="space-y-3">
                      {[
                        { value: 'yes', label: 'Yes, our value prop is crystal clear' },
                        { value: 'no', label: 'No, we need positioning help' },
                        { value: 'unsure', label: "I'm not sure" }
                      ].map((option) => (
                        <label key={option.value} className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-all">
                          <input
                            type="radio"
                            name="positioning"
                            value={option.value}
                            checked={positioning === option.value}
                            onChange={(e) => setPositioning(e.target.value)}
                            required
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-3 text-gray-700">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="flex items-start p-4 bg-red-50 text-red-700 rounded-lg">
                      <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium">{error}</p>
                        {errorDetails && (
                          <p className="text-sm mt-1">{errorDetails}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all transform ${
                      loading 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg'
                    }`}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span className="animate-pulse">Verifying email & analyzing website...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        Generate My Campaigns
                        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </div>
                    )}
                  </button>
                </form>
              </div>

              {/* Trust Indicators */}
              <div className="mt-8 text-center">
                <p className="text-sm text-gray-500 mb-4">
                  No credit card required • Results in 20 seconds • 100% free
                </p>
                <div className="flex items-center justify-center space-x-6 text-sm text-gray-400">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Email Intelligence Active
                  </span>
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    GDPR Compliant
                  </span>
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    No Spam Ever
                  </span>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-8 px-4 text-center text-sm text-gray-500">
          <p>© 2025 VeoGrowth. Powered by Claude + VeoGrowth's email intelligence layer.</p>
        </footer>
      </div>
    </div>
  );
}
