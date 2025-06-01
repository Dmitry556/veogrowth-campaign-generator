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
        body: JSON.stringify({ email, website, positioning })
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Print styles */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            .no-print {
              display: none !important;
            }
            .print-break-inside-avoid {
              break-inside: avoid;
            }
          }
        `}} />

        {/* Animated background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none no-print">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }}></div>
        </div>

        <div className="relative max-w-4xl mx-auto px-4 py-16">
          {/* Success Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Analysis Complete! 🎉
            </h1>
            <p className="text-xl text-gray-600 mb-2">
              Your AI-powered campaign analysis has been sent to <span className="font-semibold text-gray-900">{email}</span>
            </p>
            {analysisData.emailVerification && analysisData.emailVerification.status === 'valid' && (
              <p className="text-sm text-green-600 flex items-center justify-center mb-2">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Email verified with LeadMagic
                {analysisData.emailVerification.company && (
                  <span className="ml-1">• {analysisData.emailVerification.company}</span>
                )}
              </p>
            )}
            <p className="text-lg text-gray-500">
              The complete analysis is also displayed below for your convenience.
            </p>
          </div>

          {/* Quick Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-md text-center">
              <div className="text-3xl font-bold text-blue-600">3</div>
              <div className="text-sm text-gray-600 mt-1">Campaign Ideas</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md text-center">
              <div className="text-3xl font-bold text-purple-600">3</div>
              <div className="text-sm text-gray-600 mt-1">Key Personas</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md text-center">
              <div className="text-3xl font-bold text-green-600">
                {analysisData.analysis.prospectTargetingNote?.match(/(\d+,\d+)/)?.[0] || '10,000+'}
              </div>
              <div className="text-sm text-gray-600 mt-1">Target Prospects</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md text-center">
              <div className="text-3xl font-bold text-indigo-600">
                {analysisData.analysis.positioningAssessmentOutput.startsWith('✅') ? '✅' : 
                 analysisData.analysis.positioningAssessmentOutput.startsWith('⚠️') ? '⚠️' : '❌'}
              </div>
              <div className="text-sm text-gray-600 mt-1">Positioning</div>
            </div>
          </div>

          {/* Full Analysis */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <svg className="w-6 h-6 text-yellow-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Your Campaign Analysis for {analysisData.companyName}
              </h2>
              <button
                onClick={() => window.print()}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center px-3 py-1 rounded-md hover:bg-gray-100 transition-all no-print"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print / Save as PDF
              </button>
            </div>

            {/* Positioning Assessment */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Positioning Assessment</h3>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-gray-700">{analysisData.analysis.positioningAssessmentOutput}</p>
              </div>
            </div>

            {/* Ideal Customer Profile */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Ideal Customer Profile</h3>
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="text-sm text-gray-500 uppercase tracking-wide">Industry</span>
                    <p className="font-medium text-gray-900 mt-1">{analysisData.analysis.idealCustomerProfile.industry}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500 uppercase tracking-wide">Company Size</span>
                    <p className="font-medium text-gray-900 mt-1">{analysisData.analysis.idealCustomerProfile.companySize}</p>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-500 uppercase tracking-wide">Key Characteristics</span>
                  <ul className="mt-2 space-y-2">
                    {analysisData.analysis.idealCustomerProfile.keyCharacteristics.map((char, index) => (
                      <li key={index} className="flex items-start">
                        <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-gray-700">{char}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Key Personas */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Key Personas</h3>
              <div className="space-y-4">
                {analysisData.analysis.keyPersonas.map((persona, index) => (
                  <div key={index} className="bg-indigo-50 p-6 rounded-lg print-break-inside-avoid">
                    <h4 className="font-semibold text-gray-900 mb-2">{persona.title}</h4>
                    <p className="text-gray-700">
                      <span className="font-medium">Pain Points:</span> {persona.painPoints}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Campaign Ideas */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Campaign Ideas</h3>
              <div className="space-y-6">
                {analysisData.analysis.campaignIdeas.map((campaign, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-6 print-break-inside-avoid">
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="text-lg font-semibold text-blue-600">{campaign.name}</h4>
                      <button
                        onClick={() => copyToClipboard(campaign.emailBody, index)}
                        className={`text-sm flex items-center px-3 py-1 rounded-md transition-all no-print ${
                          copiedIndex === index 
                            ? 'bg-green-100 text-green-700' 
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {copiedIndex === index ? (
                          <>
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Copied!
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy Email
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      <span className="font-medium">Target:</span> {campaign.target}
                    </p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-gray-600 mb-2">Example Email:</p>
                      <p className="text-gray-700 italic">{campaign.emailBody}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Social Proof Note */}
            {analysisData.analysis.socialProofNote && (
              <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex">
                  <svg className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-yellow-800">{analysisData.analysis.socialProofNote}</p>
                </div>
              </div>
            )}

            {/* Prospect Targeting Note */}
            <div className="mb-8 p-6 bg-gray-50 rounded-lg">
              <p className="text-gray-700">
                <span className="font-semibold">VeoGrowth Pitch:</span> {analysisData.analysis.veoGrowthPitch}
              </p>
              <p className="text-gray-600 mt-3 text-sm italic">
                {analysisData.analysis.prospectTargetingNote}
              </p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-center text-white no-print">
            <h3 className="text-2xl font-bold mb-4">Ready to Execute These Campaigns?</h3>
            <p className="text-blue-100 mb-6">
              VeoGrowth will implement these campaigns for you: Build targeted lists, 
              craft hyper-personalized messages, and book qualified meetings.
            </p>
            <a 
              href="https://calendly.com/veogrowth/strategy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-all"
            >
              Book a Strategy Call
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 my-8 no-print"></div>

          {/* Generate Another + Contact */}
          <div className="text-center space-y-4 no-print">
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
              className="inline-flex items-center px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-all"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Generate Another Analysis
            </button>
            
            <p className="text-gray-500 text-sm">
              Questions? Email me at{' '}
              <a href="mailto:dmitry@veogrowth.com" className="text-blue-600 hover:underline">
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
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-2xl font-bold text-gray-900">VeoGrowth</span>
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
                Powered by Claude 4 Sonnet with Web Search
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
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://yourcompany.com"
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
                    Email Verified
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
          <p>© 2025 VeoGrowth. Powered by AI and years of B2B lead generation expertise.</p>
        </footer>
      </div>
    </div>
  );
}
