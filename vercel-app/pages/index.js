// Vercel Audience Submission UI - Main Page
// Minimal, accessible interface following IBM Carbon, WCAG AAA, and Nielsen's heuristics
// Modular design with computational efficiency and clear user feedback

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Head from 'next/head';

// Configuration constants
const CONFIG = {
  WS_URL: process.env.NEXT_PUBLIC_HUB_URL || 'ws://localhost:3000',
  MAX_LENGTH: 280,
  COOLDOWN_SECONDS: 30,
  CONNECTION_CHECK_INTERVAL: 15000,
  REQUEST_TIMEOUT: 5000
};

// Utility functions for better modularity
const createSessionId = () => `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const formatDate = () => new Date().toLocaleDateString('en-GB', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
});

// Status configuration following IBM Carbon color tokens
const STATUS_CONFIG = {
  connected: { color: '#24a148', text: 'Connected to Exhibition', ariaLabel: 'System connected' },
  connecting: { color: '#f1c21b', text: 'Connecting...', ariaLabel: 'System connecting' },
  error: { color: '#da1e28', text: 'Connection Error', ariaLabel: 'System disconnected' }
};

export default function Home() {
  // Core state management
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('connecting');
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [history, setHistory] = useState([]);
  
  // Memoized API URL for efficiency
  const HUB_API = useMemo(() => CONFIG.WS_URL.replace(/^ws/, 'http'), []);
  
  // Refs for cleanup and persistence
  const cooldownRef = useRef(null);
  const sessionId = useRef(null);
  const connectionCheckRef = useRef(null);

  // Session initialization with error handling
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      let stored = localStorage.getItem('exhibition_session_id');
      if (!stored) {
        stored = createSessionId();
        localStorage.setItem('exhibition_session_id', stored);
      }
      sessionId.current = stored;
      
      // Load submission history
      const savedHistory = localStorage.getItem('exhibition_history');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory).slice(-5)); // Keep last 5 entries
      }
    } catch (error) {
      console.warn('Storage access failed:', error);
      sessionId.current = createSessionId();
    }
  }, []);

  // Connection management with cleanup
  useEffect(() => {
    checkConnection();
    connectionCheckRef.current = setInterval(checkConnection, CONFIG.CONNECTION_CHECK_INTERVAL);
    
    return () => {
      if (connectionCheckRef.current) clearInterval(connectionCheckRef.current);
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  // Memoized connection check for efficiency
  const checkConnection = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);
      
      const res = await fetch(`${HUB_API}/api/prompt`, { 
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      
      clearTimeout(timeoutId);
      
      if (res.ok) {
        setConnected(true);
        setStatus('connected');
      } else {
        setConnected(false);
        setStatus('error');
      }
    } catch (error) {
      setConnected(false);
      setStatus('error');
    }
  }, [HUB_API]);

  // Optimized input handler with validation
  const handleChange = useCallback((e) => {
    const value = e.target.value;
    if (value.length <= CONFIG.MAX_LENGTH) {
      setMessage(value);
    }
  }, []);

  // Enhanced submit handler with history tracking
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    const text = message.trim();
    if (!text || submitting || cooldown > 0) return;
    
    if (!connected) {
      setFeedback('Connection required to submit');
      setFeedbackType('error');
      return;
    }
    
    setSubmitting(true);
    setFeedback('Submitting...');
    setFeedbackType('info');
    
    try {
      const res = await fetch(`${HUB_API}/api/submit`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          message: text,
          sessionId: sessionId.current
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // Success - update history and clear form
        const newEntry = {
          id: data.id || Date.now().toString(),
          message: text,
          timestamp: new Date().toISOString(),
          status: 'submitted'
        };
        
        const updatedHistory = [newEntry, ...history.slice(0, 4)];
        setHistory(updatedHistory);
        
        try {
          localStorage.setItem('exhibition_history', JSON.stringify(updatedHistory));
        } catch (error) {
          console.warn('Failed to save history:', error);
        }
        
        setMessage('');
        setFeedback('Submitted successfully');
        setFeedbackType('success');
        startCooldown(CONFIG.COOLDOWN_SECONDS);
      } else if (res.status === 429) {
        const match = data.error?.match(/(\d+)s/);
        const wait = match ? parseInt(match[1]) : CONFIG.COOLDOWN_SECONDS;
        setFeedback(`Please wait ${wait}s before submitting again`);
        setFeedbackType('error');
        startCooldown(wait);
      } else {
        setFeedback(data.error || 'Submission failed');
        setFeedbackType('error');
      }
    } catch (error) {
      setFeedback('Network error - please try again');
      setFeedbackType('error');
    } finally {
      setSubmitting(false);
    }
  }, [message, submitting, cooldown, connected, history, HUB_API]);

  // Modular cooldown management
  const startCooldown = useCallback((seconds) => {
    setCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Memoized status display for efficiency
  const statusDisplay = useMemo(() => STATUS_CONFIG[status] || STATUS_CONFIG.error, [status]);
  const currentDate = useMemo(() => formatDate(), []);
  
  return (
    <>
      <Head>
        <title>AI Exhibition</title>
        <meta name="description" content="Submit to AI Exhibition" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center px-4">
        {/* Skip link for accessibility */}
        <a 
          href="#main-form" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-white text-black px-4 py-2 rounded z-50 font-medium"
        >
          Skip to submission form
        </a>

        {/* Main centered content */}
        <main className="w-full max-w-md space-y-6" role="main">
          
          {/* Dynamic status heading */}
          <h1 className="text-center text-xl text-white mb-8">
            {!connected ? 'Connecting...' : 'Send a dream...'}
          </h1>

          {/* Submission form */}
          <form 
            id="main-form"
            onSubmit={handleSubmit} 
            className="space-y-4"
            noValidate
          >
            <div>
              <label htmlFor="message-input" className="sr-only">
                Type your response here
              </label>
              <textarea
                id="message-input"
                value={message}
                onChange={handleChange}
                placeholder="Type your response here..."
                className="w-full h-32 p-4 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-400 
                         focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500
                         disabled:bg-gray-900 disabled:border-gray-800 disabled:text-gray-500
                         resize-none text-base"
                maxLength={CONFIG.MAX_LENGTH}
                disabled={!connected}
                aria-describedby="char-count"
                required
              />
              <div 
                id="char-count"
                className="text-right text-sm text-gray-400 mt-2"
                aria-live="polite"
              >
                {message.length}/{CONFIG.MAX_LENGTH}
              </div>
            </div>

            <button
              type="submit"
              disabled={!connected || !message.trim() || submitting || cooldown > 0}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded
                       disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed
                       focus:outline-none focus:ring-1 focus:ring-gray-500
                       transition-colors duration-200"
              aria-describedby="feedback"
            >
              {submitting ? 'Sending...' : cooldown > 0 ? `Wait ${cooldown}s` : 'Send'}
            </button>
          </form>

          {/* Disclaimer */}
          <div className="text-center text-sm text-gray-400 space-y-1">
            <p>Your submission will be displayed publicly.</p>
            <p>Please don't include personal information.</p>
          </div>

          {/* Feedback messages */}
          {feedback && (
            <div 
              id="feedback"
              className={`text-center text-sm p-3 rounded ${
                feedbackType === 'success' 
                  ? 'text-green-400 bg-green-950/30' :
                feedbackType === 'error' 
                  ? 'text-red-400 bg-red-950/30' :
                  'text-gray-300 bg-gray-800/30'
              }`}
              role="alert"
              aria-live="assertive"
            >
              {feedback}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
