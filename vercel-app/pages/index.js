// Vercel Audience Submission UI - Main Page
// Public interface for audience to submit content to Hub v2

import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import Head from 'next/head';

export default function Home() {
  // Core state
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('connecting');
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState(''); // 'success' | 'error' | 'info'
  
  // Configuration
  const HUB_URL = process.env.NEXT_PUBLIC_HUB_URL || 'ws://localhost:3000';
  const MAX_LENGTH = 280;
  
  const socketRef = useRef(null);
  const reconnectRef = useRef(null);
  const sessionId = useRef(`sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, []);

  const connect = () => {
    setStatus('connecting');
    setFeedback('');
    
    const newSocket = io(HUB_URL, {
      transports: ['websocket', 'polling'],
      timeout: 8000
    });
    
    newSocket.on('connect', () => {
      setConnected(true);
      setStatus('connected');
      setFeedback('');
      newSocket.emit('identify', { role: 'audience', sessionId: sessionId.current });
    });
    
    newSocket.on('disconnect', () => {
      setConnected(false);
      setStatus('disconnected');
      reconnectRef.current = setTimeout(connect, 3000);
    });
    
    newSocket.on('connect_error', () => {
      setConnected(false);
      setStatus('error');
      setFeedback('Connection failed');
      setFeedbackType('error');
      reconnectRef.current = setTimeout(connect, 5000);
    });
    
    newSocket.on('submission-received', () => {
      setFeedback('Message sent successfully');
      setFeedbackType('success');
      setTimeout(() => setFeedback(''), 3000);
    });
    
    newSocket.on('submission-error', (error) => {
      setFeedback(error.message || 'Failed to send');
      setFeedbackType('error');
      setTimeout(() => setFeedback(''), 4000);
    });
    
    socketRef.current = newSocket;
    setSocket(newSocket);
  };

  const handleChange = (e) => {
    const value = e.target.value;
    if (value.length <= MAX_LENGTH) {
      setMessage(value);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const text = message.trim();
    if (!text) return;
    
    if (!connected || !socket) {
      setFeedback('Not connected');
      setFeedbackType('error');
      return;
    }
    
    socket.emit('submit-content', {
      message: text,
      sessionId: sessionId.current,
      timestamp: Date.now()
    });
    
    setMessage('');
    setFeedback('Sending...');
    setFeedbackType('info');
  };

  const getStatusDisplay = () => {
    switch (status) {
      case 'connected': return { color: 'rgb(34, 197, 94)', text: 'Connected' };
      case 'connecting': return { color: 'rgb(251, 191, 36)', text: 'Connecting' };
      case 'error': return { color: 'rgb(239, 68, 68)', text: 'Offline' };
      default: return { color: 'rgb(156, 163, 175)', text: 'Unknown' };
    }
  };

  const statusDisplay = getStatusDisplay();
  
  return (
    <>
      <Head>
        <title>AI Exhibition</title>
        <meta name="description" content="Submit to AI Exhibition" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-black text-white flex flex-col">
        {/* Skip link for screen readers */}
        <a 
          href="#main-form" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 bg-white text-black p-2 z-50"
        >
          Skip to main form
        </a>

        {/* Header */}
        <header className="p-6 text-center border-b border-gray-800" role="banner">
          <h1 className="text-2xl font-bold">AI Exhibition</h1>
        </header>

        {/* Main content */}
        <main className="flex-1 flex items-center justify-center p-6" role="main">
          <div className="w-full max-w-md space-y-6">
            
            {/* Connection status */}
            <div 
              className="flex items-center gap-2 text-sm"
              role="status" 
              aria-live="polite"
            >
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: statusDisplay.color }}
                aria-hidden="true"
              ></div>
              <span>{statusDisplay.text}</span>
            </div>

            {/* Submission form */}
            <form 
              id="main-form"
              onSubmit={handleSubmit} 
              className="space-y-6"
              noValidate
            >
              <div>
                <label 
                  htmlFor="message-input"
                  className="block text-lg font-medium mb-3"
                >
                  Your message
                </label>
                <textarea
                  id="message-input"
                  value={message}
                  onChange={handleChange}
                  placeholder="Share a thought..."
                  className="w-full h-24 p-4 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent resize-none"
                  maxLength={MAX_LENGTH}
                  disabled={!connected}
                  aria-describedby="char-count feedback"
                  required
                />
                <div 
                  id="char-count"
                  className="text-sm text-gray-400 mt-1"
                  aria-live="polite"
                >
                  {message.length}/{MAX_LENGTH}
                </div>
              </div>

              <button
                type="submit"
                disabled={!connected || !message.trim()}
                className="w-full bg-white text-black font-medium py-4 px-6 rounded hover:bg-gray-100 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black transition-colors"
                aria-describedby="feedback"
              >
                {connected ? 'Send' : 'Connecting...'}
              </button>
            </form>

            {/* Feedback */}
            {feedback && (
              <div 
                id="feedback"
                className={`text-center text-sm p-3 rounded ${
                  feedbackType === 'success' ? 'text-green-400 bg-green-950' :
                  feedbackType === 'error' ? 'text-red-400 bg-red-950' :
                  'text-gray-300 bg-gray-800'
                }`}
                role="alert"
                aria-live="assertive"
              >
                {feedback}
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="p-4 text-center text-sm text-gray-500 border-t border-gray-800" role="contentinfo">
          Nottingham Contemporary 2026
        </footer>
      </div>
    </>
  );
}
