// Vercel Audience Submission UI - Main Page
// Public interface for audience to submit content to Hub v2

import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import Head from 'next/head';

export default function Home() {
  // Connection state
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [hubStatus, setHubStatus] = useState('disconnected');
  
  // Submission state
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionHistory, setSubmissionHistory] = useState([]);
  const [responseHistory, setResponseHistory] = useState([]);
  
  // UI state
  const [characterCount, setCharacterCount] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [lastSubmissionTime, setLastSubmissionTime] = useState(null);
  
  // Configuration - can be overridden via environment variables
  const HUB_URL = process.env.NEXT_PUBLIC_HUB_URL || 'ws://localhost:3000';
  const MAX_CONTENT_LENGTH = 500;
  const MIN_SUBMISSION_INTERVAL = 5000; // 5 seconds between submissions
  
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Initialize WebSocket connection on mount
  useEffect(() => {
    connectToHub();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Connect to Hub v2
  const connectToHub = () => {
    try {
      console.log(`Connecting to Hub v2 at ${HUB_URL}`);
      setConnectionError(null);
      
      const newSocket = io(HUB_URL, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true
      });
      
      newSocket.on('connect', () => {
        console.log('Connected to Hub v2');
        setConnected(true);
        setHubStatus('connected');
        setConnectionError(null);
        
        // Identify as public client
        newSocket.emit('identify', {
          role: 'public_client',
          type: 'vercel_submission_ui',
          timestamp: Date.now()
        });
      });
      
      newSocket.on('disconnect', (reason) => {
        console.log('Disconnected from Hub v2:', reason);
        setConnected(false);
        setHubStatus('disconnected');
        
        // Auto-reconnect after delay
        reconnectTimeoutRef.current = setTimeout(() => {
          connectToHub();
        }, 5000);
      });
      
      newSocket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setConnected(false);
        setHubStatus('error');
        setConnectionError(error.message);
        
        // Retry connection
        reconnectTimeoutRef.current = setTimeout(() => {
          connectToHub();
        }, 10000);
      });
      
      // Listen for hub status updates
      newSocket.on('hub-status', (status) => {
        setHubStatus(status.status || 'unknown');
      });
      
      // Listen for submission confirmations
      newSocket.on('submission-received', (confirmation) => {
        console.log('Submission confirmed:', confirmation);
        setIsSubmitting(false);
        
        // Add to submission history
        setSubmissionHistory(prev => [
          {
            id: confirmation.id,
            content: confirmation.content,
            timestamp: confirmation.timestamp,
            status: 'received'
          },
          ...prev.slice(0, 9) // Keep last 10 submissions
        ]);
      });
      
      // Listen for module responses (if enabled)
      newSocket.on('module-response', (response) => {
        console.log('Module response received:', response);
        
        // Add to response history
        setResponseHistory(prev => [
          {
            id: response.messageId,
            moduleId: response.moduleId,
            output: response.output,
            timestamp: Date.now()
          },
          ...prev.slice(0, 4) // Keep last 5 responses
        ]);
      });
      
      newSocket.on('submission-error', (error) => {
        console.error('Submission error:', error);
        setIsSubmitting(false);
        alert(`Submission failed: ${error.message}`);
      });
      
      socketRef.current = newSocket;
      setSocket(newSocket);
      
    } catch (error) {
      console.error('Failed to connect:', error);
      setConnectionError(error.message);
    }
  };

  // Handle content change
  const handleContentChange = (e) => {
    const newContent = e.target.value;
    if (newContent.length <= MAX_CONTENT_LENGTH) {
      setContent(newContent);
      setCharacterCount(newContent.length);
    }
  };

  // Submit content to Hub v2
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!content.trim()) {
      alert('Please enter some content before submitting.');
      return;
    }
    
    if (!connected || !socket) {
      alert('Not connected to exhibition system. Please wait and try again.');
      return;
    }
    
    // Rate limiting
    const now = Date.now();
    if (lastSubmissionTime && (now - lastSubmissionTime) < MIN_SUBMISSION_INTERVAL) {
      const remainingTime = Math.ceil((MIN_SUBMISSION_INTERVAL - (now - lastSubmissionTime)) / 1000);
      alert(`Please wait ${remainingTime} more seconds before submitting again.`);
      return;
    }
    
    setIsSubmitting(true);
    setLastSubmissionTime(now);
    
    try {
      const submission = {
        content: content.trim(),
        timestamp: now,
        source: 'vercel_public',
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        language: navigator.language
      };
      
      socket.emit('submit-content', submission);
      
      // Clear content after submission
      setContent('');
      setCharacterCount(0);
      
      console.log('Content submitted:', submission);
      
    } catch (error) {
      console.error('Submission error:', error);
      setIsSubmitting(false);
      alert('Failed to submit content. Please try again.');
    }
  };

  // Get status indicator color
  const getStatusColor = () => {
    switch (hubStatus) {
      case 'connected': return 'text-green-500';
      case 'disconnected': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  // Get status text
  const getStatusText = () => {
    switch (hubStatus) {
      case 'connected': return 'Connected to Exhibition';
      case 'disconnected': return 'Connecting...';
      case 'error': return 'Connection Error';
      default: return 'Unknown Status';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <Head>
        <title>Nottingham Contemporary AI Exhibition - Submit</title>
        <meta name="description" content="Submit your thoughts to the AI Exhibition" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Nottingham Contemporary
          </h1>
          <h2 className="text-2xl md:text-3xl text-blue-200 mb-6">
            AI Exhibition - February 25, 2026
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Share your thoughts, feelings, or ideas with our AI creative system. 
            Your submission will be interpreted by multiple AI artists and modules.
          </p>
        </div>

        {/* Status Bar */}
        <div className="bg-black/30 backdrop-blur-sm rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className={`font-medium ${getStatusColor()}`}>
                {getStatusText()}
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-blue-300 hover:text-blue-100 transition-colors"
              >
                {showHistory ? 'Hide History' : 'Show History'}
              </button>
              
              {submissionHistory.length > 0 && (
                <span className="text-gray-400 text-sm">
                  {submissionHistory.length} submissions
                </span>
              )}
            </div>
          </div>
          
          {connectionError && (
            <div className="mt-2 text-red-400 text-sm">
              Connection Error: {connectionError}
            </div>
          )}
        </div>

        {/* Submission Form */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="content" className="block text-lg font-medium text-white mb-3">
                Your Submission
              </label>
              <textarea
                id="content"
                value={content}
                onChange={handleContentChange}
                placeholder="Share your thoughts, describe a feeling, tell a story, or ask a question... The AI artists will interpret your words and create something unique."
                className="w-full h-32 p-4 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
                disabled={isSubmitting || !connected}
              />
              <div className="flex justify-between items-center mt-2">
                <span className={`text-sm ${characterCount > MAX_CONTENT_LENGTH * 0.9 ? 'text-yellow-400' : 'text-gray-400'}`}>
                  {characterCount} / {MAX_CONTENT_LENGTH} characters
                </span>
                {content.trim() && (
                  <span className="text-sm text-blue-300">
                    Ready to submit
                  </span>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !connected || !content.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 px-8 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Submitting to Exhibition...</span>
                </div>
              ) : connected ? (
                'Submit to AI Artists'
              ) : (
                'Connecting to Exhibition...'
              )}
            </button>
          </form>
        </div>

        {/* History Section */}
        {showHistory && (
          <div className="space-y-6">
            {/* Submission History */}
            {submissionHistory.length > 0 && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Your Recent Submissions</h3>
                <div className="space-y-3">
                  {submissionHistory.map((submission) => (
                    <div key={submission.id} className="bg-black/20 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm text-gray-400">
                          {new Date(submission.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">
                          {submission.status}
                        </span>
                      </div>
                      <p className="text-white text-sm">
                        {submission.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Response History */}
            {responseHistory.length > 0 && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">AI Artist Responses</h3>
                <div className="space-y-4">
                  {responseHistory.map((response) => (
                    <div key={response.id} className="bg-black/20 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm text-blue-300 font-medium">
                          {response.output?.metadata?.artist || response.moduleId}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(response.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-white text-sm">
                        {response.output?.content || 'Processing...'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-gray-400 text-sm">
          <p>
            Powered by Hub v2 • Real-time AI Creative System
          </p>
          <p className="mt-1">
            Your submissions are processed by AI artists including generative art, 
            music analysis, content criticism, and VR creation modules.
          </p>
        </div>
      </main>
    </div>
  );
}
