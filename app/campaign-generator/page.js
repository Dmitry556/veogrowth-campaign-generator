'use client';
import { useState } from 'react';

export default function CampaignGenerator() {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [positioning, setPositioning] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  // Function to normalize URLs
  const normalizeUrl = (url) => {
    // Remove any whitespace
    url = url.trim();
    
    // If no protocol, add https://
    if (!url.match(/^https?:\/\//)) {
      url = 'https://' + url;
    }
    
    // Remove trailing slashes
    url = url.replace(/\/+$/, '');
    
    return url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !website || !positioning) {
      alert('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Normalize the website URL
      const normalizedWebsite = normalizeUrl(website);
      
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
        setResults(data.data);
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError('Failed to generate analysis. Please try again.');
    }
    
    setLoading(false);
  };

  return (
    <>
      <script src="https://cdn.tailwindcss.com"></script>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-900">VeoGrowth</h1>
                <span className="ml-3 text-sm text-gray-500">AI-Powered B2B Lead Generation</span>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 py-12">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Get Free Cold Email Campaign Ideas<br />for Your Business
            </h2>
            <p className="text-xl text-gray-600 mb-2">
              Our AI analyzes your website and generates hyper-personalized campaign strategies in 20 seconds
            </p>
            <p className="text-sm text-gray-500">
              Used by 500+ B2B companies to generate qualified meetings
            </p>
          </div>

          {!loading && !results && (
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 mb-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Work Email <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">We'll send the full analysis to your email</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Website <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="yourcompany.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">Enter your website (e.g., company.com or www.company.com)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Does your website have clear positioning? <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={positioning}
                    onChange={(e) => setPositioning(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select an option</option>
                    <option value="yes">Yes - Our value prop and target market are clear</option>
                    <option value="no">No - We need to work on our messaging</option>
                    <option value="unsure">Not sure</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">This helps us tailor the analysis to your needs</p>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-indigo-600 text-white font-semibold py-4 px-6 rounded-lg hover:bg-indigo-700 transition duration-200"
                >
                  Generate My Free Campaign Ideas →
                </button>

                <div className="flex items-center justify-center space-x-6 text-sm text-gray-500 pt-2">
                  <span>✓ No credit card required</span>
                  <span>✓ Results in 20 seconds</span>
                  <span>✓ Sent to your email</span>
                </div>
              </div>
            </form>
          )}

          {loading && (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mb-4"></div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Analyzing your website...</h3>
              <p className="text-gray-600">Our AI is reviewing your positioning, identifying your ICP, and crafting personalized campaigns</p>
              <p className="text-sm text-gray-500 mt-2">This usually takes 15-20 seconds</p>
            </div>
          )}

          {results && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-lg p-8">
                <div dangerouslySetInnerHTML={{ __html: results.analysis }} />
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <svg className="w-12 h-12 text-green-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-green-900 mb-2">Analysis Sent to Your Email!</h3>
                <p className="text-green-700">Check your inbox for the complete campaign analysis and next steps.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 rounded-lg p-6 mb-8">
              <div className="flex items-start">
                <svg className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-red-800">Error analyzing website</h3>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-8 mt-16">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-sm text-gray-400">© 2025 VeoGrowth. Powered by AI and years of B2B lead generation expertise.</p>
          </div>
        </footer>
      </div>
    </>
  );
}
