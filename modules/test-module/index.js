const io = require('socket.io-client');

const MODULE_ID = 'test-module-1';
const MODULE_NAME = 'Test Module';
const SERVER_URL = 'http://localhost:3000';

const socket = io(SERVER_URL);

socket.on('connect', () => {
  console.log(`[${MODULE_NAME}] Connected to server`);
  
  socket.emit('join', {
    role: 'module',
    moduleId: MODULE_ID,
    moduleName: MODULE_NAME
  });
});

socket.on('process-message', (data) => {
  console.log(`[${MODULE_NAME}] Received message: "${data.message}"`);
  
  // Simulate processing delay
  setTimeout(() => {
    // Send output back
    socket.emit('module-output', {
      type: 'text',
      content: `Processed: "${data.message.toUpperCase()}"`,
      messageId: data.id
    });
    
    console.log(`[${MODULE_NAME}] Sent output`);
  }, 1000);
});

socket.on('disconnect', () => {
  console.log(`[${MODULE_NAME}] Disconnected`);
});

console.log(`[${MODULE_NAME}] Starting...`);
