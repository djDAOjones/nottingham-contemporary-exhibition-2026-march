const io = require('socket.io-client');

const MODULE_ID = 'test-module-1';
const MODULE_NAME = 'Test Module';
const SERVER_URL = 'http://localhost:3000';

const socket = io(SERVER_URL);

socket.on('connect', () => {
  console.log(`[${MODULE_NAME}] Connected to server`);
  
  socket.emit('identify', {
    role: 'module',
    moduleId: MODULE_ID,
    name: MODULE_NAME
  });
});

socket.on('process-message', (data) => {
  console.log(`[${MODULE_NAME}] Received message: "${data.content}"`);
  
  const startTime = Date.now();
  
  // Simulate processing delay
  setTimeout(() => {
    // Send output back using correct event name and format
    socket.emit('message-processed', {
      messageId: data.id,
      output: {
        type: 'text',
        content: `Processed: "${(data.content || '').toUpperCase()}"`
      },
      processingTime: Date.now() - startTime
    });
    
    console.log(`[${MODULE_NAME}] Sent output`);
  }, 1000);
});

socket.on('disconnect', () => {
  console.log(`[${MODULE_NAME}] Disconnected`);
});

console.log(`[${MODULE_NAME}] Starting...`);
