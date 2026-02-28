# Nottingham Contemporary AI Exhibition - Public Submission Interface

A Next.js web application deployed on Vercel that provides a public interface for audience members to submit content to the AI Exhibition system. Features real-time WebSocket connection to Hub v2 and responsive modern UI.

## Features

- **Real-time WebSocket Connection**: Direct connection to Hub v2 for live submission processing
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Auto-reconnection**: Handles network disconnections gracefully with automatic reconnection
- **Rate Limiting**: Prevents spam with client-side submission throttling
- **Submission History**: Shows user's recent submissions and AI responses
- **Modern UI**: Beautiful gradient design with glassmorphism effects
- **Accessibility**: WCAG compliant with keyboard navigation and screen reader support

## Architecture

```
vercel-app/
├── pages/
│   ├── index.js          # Main submission interface
│   └── _app.js           # Global app wrapper
├── styles/
│   └── globals.css       # Global styles with Tailwind
├── package.json          # Dependencies and scripts
├── next.config.js        # Next.js configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── postcss.config.js     # PostCSS configuration
```

## Technology Stack

- **Next.js 14**: React framework with static export capability
- **React 18**: Modern React with hooks
- **Socket.IO Client**: WebSocket connection to Hub v2
- **Tailwind CSS**: Utility-first CSS framework
- **Vercel**: Deployment platform with global CDN

## Local Development

```bash
# Navigate to vercel-app directory
cd vercel-app

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Export static files
npm run export
```

The app will be available at `http://localhost:3000`

## Environment Variables

Set these in your Vercel deployment or `.env.local` file:

```bash
NEXT_PUBLIC_HUB_URL=wss://your-hub-domain.com
NEXT_PUBLIC_EXHIBITION_NAME="Nottingham Contemporary AI Exhibition"
NEXT_PUBLIC_EXHIBITION_DATE="February 25, 2026"
```

## Hub v2 Integration

The application connects to Hub v2 via WebSocket and:

1. **Identifies** as a public client on connection
2. **Submits** user content with metadata (timestamp, source, user agent)
3. **Receives** confirmation of successful submissions
4. **Listens** for AI module responses (optional)
5. **Handles** connection errors with automatic retry

### WebSocket Events

**Outgoing to Hub v2:**
- `identify` - Client identification
- `submit-content` - User content submission

**Incoming from Hub v2:**
- `hub-status` - Hub status updates
- `submission-received` - Submission confirmation
- `module-response` - AI module responses
- `submission-error` - Submission error notifications

## UI Components

### Main Interface
- Header with exhibition branding
- Real-time connection status indicator
- Large text input with character counter
- Submission button with loading states

### History Panel
- Recent submission history (last 10)
- AI response display (last 5)
- Timestamps and status indicators

### Status Management
- Connection status with color coding
- Error message display
- Auto-reconnection feedback

## Responsive Design

- **Desktop**: Full-width layout with optimal spacing
- **Tablet**: Adapted layout maintaining readability
- **Mobile**: Single-column design with touch-friendly controls
- **Accessibility**: High contrast support, reduced motion options

## Performance Features

- **Static Export**: Pre-built HTML for fast loading
- **Code Splitting**: Automatic Next.js optimization
- **Image Optimization**: Next.js image handling (disabled for static export)
- **CSS Optimization**: Tailwind CSS purging and minification

## Security Features

- **Rate Limiting**: Client-side submission throttling (5-second intervals)
- **Content Validation**: Input sanitization and length limits
- **CORS Headers**: Proper cross-origin configuration
- **No Sensitive Data**: No API keys or secrets in client code

## Deployment to Vercel

### Automatic Deployment (Recommended)

1. Connect your Git repository to Vercel
2. Set environment variables in Vercel dashboard
3. Push to main branch - auto-deployment triggers

### Manual Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod

# Set environment variables
vercel env add NEXT_PUBLIC_HUB_URL
```

### Build Configuration

The app is configured for static export to maximize Vercel compatibility:

```javascript
// next.config.js
{
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true }
}
```

## Production Considerations

### Hub v2 Connection
- Ensure Hub v2 server has CORS configured for your Vercel domain
- Use WSS (secure WebSocket) for production
- Consider connection pooling for high traffic

### Performance
- Monitor WebSocket connection stability
- Set up error tracking (Sentry, LogRocket, etc.)
- Implement analytics for submission tracking

### Scaling
- Vercel handles CDN and scaling automatically
- Hub v2 should be able to handle concurrent WebSocket connections
- Consider rate limiting at the Hub v2 level

## Troubleshooting

### Connection Issues
```javascript
// Check Hub URL is correct
console.log(process.env.NEXT_PUBLIC_HUB_URL);

// Verify Hub v2 is running and accessible
// Check CORS settings on Hub v2
// Ensure WSS is used for HTTPS sites
```

### Build Issues
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run lint
```

### WebSocket Connection
```javascript
// Enable debug logging
localStorage.debug = 'socket.io-client:socket';

// Check network tab for WebSocket connection
// Verify Hub v2 WebSocket endpoint is accessible
```

## Monitoring

### Analytics
Track key metrics:
- Submissions per hour/day
- Connection success rate
- User engagement (return visitors)
- Error rates and types

### Performance
Monitor:
- Page load times
- WebSocket connection latency
- Submission processing times
- Error frequency

## Future Enhancements

- **Real-time Gallery**: Display AI-generated responses in real-time
- **User Profiles**: Optional user accounts for submission history
- **Content Moderation**: Client-side content filtering
- **Offline Support**: Service worker for offline submission queuing
- **Push Notifications**: Notify users of AI responses
- **Multi-language**: Internationalization support

## API Reference

### Submission Format

```javascript
{
  content: "User's text content",
  timestamp: 1234567890,
  source: "vercel_public",
  userAgent: "Mozilla/5.0...",
  screenResolution: "1920x1080",
  language: "en-US"
}
```

### Response Format

```javascript
{
  messageId: "uuid",
  output: {
    type: "artist_creation",
    content: "Formatted display content",
    data: { /* AI-specific data */ },
    metadata: { /* Processing metadata */ }
  },
  processingTime: 1500,
  moduleId: "ai-module-id"
}
```

## Contributing

When making changes:
1. Test locally with `npm run dev`
2. Verify WebSocket connection to Hub v2
3. Test on multiple devices/browsers
4. Check accessibility with screen readers
5. Validate against WCAG guidelines

## License

MIT License - Part of the Nottingham Contemporary AI Exhibition system.

---

**Live at**: https://your-vercel-app.vercel.app  
**Hub v2**: Connect to your local or production Hub v2 instance  
**Support**: Check Hub v2 documentation for integration details
