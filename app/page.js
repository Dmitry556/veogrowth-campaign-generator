'use client';

import React, { useState } from 'react';

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
          @keyframes countUp {
            from {
              opacity: 0;
              transform: scale(0.8);
            }
            to {
              opacity: 1;
              transform: scale(1);
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
          .animate-count-up {
            animation: countUp 0.5s ease-out forwards;
          }
          .glass-card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
          .glass-card-dark {
            background: rgba(0, 0, 0, 0.2);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
        `}} />

        {/* Animated background - enhanced */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none no-print">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-indigo-500 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '4s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-8">
          {/* AI Status Header */}
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
                  <div className="text-gray-300">
                    <span className="text-gray-400">Company:</span> <span className="text-white font-medium">{analysisData.companyName}</span>
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

          {/* Hero Insight Section */}
          <div className="mb-8 animate-slide-in-top" style={{ animationDelay: '0.1s' }}>
            <div className="glass-card rounded-2xl p-8 text-center border-2 border-blue-400/30">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/20 rounded-full mb-6">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">
                {analysisData.analysis.positioningAssessmentOutput.split(':')[0]}
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                {analysisData.analysis.positioningAssessmentOutput.split(':')[1]?.trim() || ''}
              </p>
              <div className="mt-6 inline-flex items-center space-x-2 text-sm">
                <span className="text-gray-400">Confidence:</span>
                <div className="flex items-center">
                  <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full" style={{ width: '94%' }}></div>
                  </div>
                  <span className="ml-2 text-white font-medium">94%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Summary Stats - Animated */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="glass-card p-6 rounded-xl text-center animate-slide-in-left" style={{ animationDelay: '0.2s' }}>
              <div className="text-3xl font-bold text-blue-400 animate-count-up">3</div>
              <div className="text-sm text-gray-300 mt-1">Campaign Ideas</div>
            </div>
            <div className="glass-card p-6 rounded-xl text-center animate-slide-in-left" style={{ animationDelay: '0.3s' }}>
              <div className="text-3xl font-bold text-purple-400 animate-count-up">3</div>
              <div className="text-sm text-gray-300 mt-1">Key Personas</div>
            </div>
            <div className="glass-card p-6 rounded-xl text-center animate-slide-in-right" style={{ animationDelay: '0.4s' }}>
              <div className="text-3xl font-bold text-green-400 animate-count-up">
                {analysisData.analysis.prospectTargetingNote?.match(/(\d+,\d+)/)?.[0] || '10,000+'}
              </div>
              <div className="text-sm text-gray-300 mt-1">Target Prospects</div>
            </div>
            <div className="glass-card p-6 rounded-xl text-center animate-slide-in-right" style={{ animationDelay: '0.5s' }}>
              <div className="text-3xl font-bold animate-count-up">
                {analysisData.analysis.positioningAssessmentOutput.startsWith('✅') ? '✅' : 
                 analysisData.analysis.positioningAssessmentOutput.startsWith('⚠️') ? '⚠️' : '❌'}
              </div>
              <div className="text-sm text-gray-300 mt-1">Positioning</div>
            </div>
          </div>

          {/* Full Analysis - Redesigned */}
          <div className="space-y-6 mb-8">
            {/* Ideal Customer Profile */}
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
                <div className="glass-card-dark rounded-lg p-4">
                  <span className="text-xs text-blue-400 uppercase tracking-wide font-semibold">Industry</span>
                  <p className="text-white mt-1 font-medium">{analysisData.analysis.idealCustomerProfile.industry}</p>
                </div>
                <div className="glass-card-dark rounded-lg p-4">
                  <span className="text-xs text-purple-400 uppercase tracking-wide font-semibold">Company Size</span>
                  <p className="text-white mt-1 font-medium">{analysisData.analysis.idealCustomerProfile.companySize}</p>
                </div>
              </div>
              
              <div className="mt-6">
                <span className="text-xs text-green-400 uppercase tracking-wide font-semibold">Key Characteristics</span>
                <div className="mt-3 space-y-2">
                  {analysisData.analysis.idealCustomerProfile.keyCharacteristics.map((char, index) => (
                    <div key={index} className="flex items-start">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5 mr-3 flex-shrink-0"></div>
                      <span className="text-gray-300">{char}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Key Personas */}
            <div className="glass-card rounded-2xl p-8 animate-fade-in" style={{ animationDelay: '0.7s' }}>
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-600 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white">Key Personas</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {analysisData.analysis.keyPersonas.map((persona, index) => (
                  <div key={index} className="glass-card-dark rounded-xl p-6 border border-purple-500/20 hover:border-purple-500/40 transition-all transform hover:scale-105 cursor-pointer">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                      <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-white text-center mb-3">{persona.title}</h4>
                    <p className="text-sm text-gray-400 text-center">
                      <span className="text-purple-400 font-medium">Pain Points:</span> {persona.painPoints}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Campaign Ideas */}
            <div className="glass-card rounded-2xl p-8 animate-fade-in" style={{ animationDelay: '0.8s' }}>
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-600 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white">Campaign Ideas</h3>
              </div>
              
              <div className="space-y-6">
                {analysisData.analysis.campaignIdeas.map((campaign, index) => (
                  <div key={index} className="glass-card-dark rounded-xl p-6 border border-blue-500/20 hover:border-blue-500/40 transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-blue-400">{campaign.name}</h4>
                        <p className="text-sm text-gray-400 mt-1">
                          <span className="font-medium">Target:</span> {campaign.target}
                        </p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(campaign.emailBody, index)}
                        className={`px-4 py-2 rounded-lg transition-all no-print flex items-center space-x-2 ${
                          copiedIndex === index 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/40' 
                            : 'glass-card text-gray-400 hover:text-white hover:border-gray-500/40'
                        }`}
                      >
                        {copiedIndex === index ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-sm">Copied!</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="bg-gray-900/50 backdrop-blur-sm p-4 rounded-lg border border-gray-700">
                      <p className="text-sm font-medium text-gray-400 mb-2">Example Email:</p>
                      <p className="text-gray-300 italic">{campaign.emailBody}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Social Proof Note */}
            {analysisData.analysis.socialProofNote && analysisData.analysis.socialProofNote.trim() !== "" && (
              <div className="glass-card rounded-2xl p-6 animate-fade-in border border-yellow-500/30" style={{ animationDelay: '0.9s' }}>
                <div className="flex">
                  <svg className="w-5 h-5 text-yellow-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-yellow-300">{analysisData.analysis.socialProofNote}</p>
                </div>
              </div>
            )}
            
            {/* Prospect Targeting Note */}
            <div className="glass-card rounded-2xl p-8 animate-fade-in" style={{ animationDelay: '1s' }}>
              <div className="space-y-4">
                <p className="text-white">
                  <span className="font-semibold text-blue-400">VeoGrowth Pitch:</span> {analysisData.analysis.veoGrowthPitch}
                </p>
                <p className="text-gray-300 text-sm italic">
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
