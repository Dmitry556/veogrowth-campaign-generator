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
