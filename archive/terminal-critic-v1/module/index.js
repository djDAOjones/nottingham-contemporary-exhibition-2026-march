const io = require('socket.io-client');
const axios = require('axios');

const MODULE_ID = 'terminal-critic';
const MODULE_NAME = 'Terminal Critic';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

const socket = io(SERVER_URL);

// Persona system
const PERSONAS = {
  neutral: {
    name: 'neutral',
    prompt: 'Respond with a brief, neutral critique. Be concise (1-2 sentences).'
  },
  doom: {
    name: 'doom-monger',
    prompt: 'Respond as a pessimistic doom-monger. Predict the worst outcome. Be dramatic but brief (1-2 sentences).'
  },
  psychoanalytic: {
    name: 'psychoanalytic',
    prompt: 'Respond as a theatrical psychoanalyst. Interpret the dream symbolically. Be theatrical but brief (1-2 sentences).'
  },
  sycophantic: {
    name: 'sycophantic',
    prompt: 'Respond as an overly flattering sycophant. Praise excessively. Be brief (1-2 sentences).'
  },
  deadpan: {
    name: 'deadpan',
    prompt: 'Respond with dry, deadpan humor. Take the mick gently. Be brief (1-2 sentences).'
  },
  hypercritical: {
    name: 'hypercritical',
    prompt: 'Respond as a hypercritical art snob. Find fault with everything. Be brief (1-2 sentences).'
  }
};

const PERSONA_KEYS = Object.keys(PERSONAS);
let personaIndex = 0;

function selectPersona() {
  // 50% neutral, 50% split among other 5
  if (Math.random() < 0.5) {
    return PERSONAS.neutral;
  }
  const otherPersonas = PERSONA_KEYS.filter(k => k !== 'neutral');
  const selected = otherPersonas[Math.floor(Math.random() * otherPersonas.length)];
  return PERSONAS[selected];
}

async function generateCritique(message) {
  const persona = selectPersona();
  
  const systemPrompt = `You are a critic responding to a dream or prompt. ${persona.prompt}`;
  
  try {
    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: 'mistral',
      prompt: message,
      system: systemPrompt,
      stream: false,
      temperature: 0.7
    });
    
    return {
      text: response.data.response.trim(),
      persona: persona.name
    };
  } catch (e) {
    console.error('[Terminal Critic] Ollama error:', e.message);
    // Fallback response
    return {
      text: '> SYSTEM ERROR: LLM UNAVAILABLE',
      persona: 'error'
    };
  }
}

socket.on('connect', () => {
  console.log(`[${MODULE_NAME}] Connected to server at ${SERVER_URL}`);
  
  socket.emit('join', {
    role: 'module',
    moduleId: MODULE_ID,
    moduleName: MODULE_NAME
  });
});

socket.on('process-message', async (data) => {
  console.log(`[${MODULE_NAME}] Processing: "${data.message.slice(0, 50)}..."`);
  
  try {
    const critique = await generateCritique(data.message);
    
    // Send output with typing effect metadata
    socket.emit('module-output', {
      type: 'text',
      content: critique.text,
      persona: critique.persona,
      messageId: data.id,
      typingSpeed: 50 // ms per character
    });
    
    console.log(`[${MODULE_NAME}] Sent critique (${critique.persona})`);
  } catch (e) {
    console.error('[Terminal Critic] Error:', e.message);
    socket.emit('module-output', {
      type: 'text',
      content: '> ERROR: FAILED TO GENERATE RESPONSE',
      persona: 'error',
      messageId: data.id
    });
  }
});

socket.on('disconnect', () => {
  console.log(`[${MODULE_NAME}] Disconnected`);
});

console.log(`[${MODULE_NAME}] Starting...`);
console.log(`  Server: ${SERVER_URL}`);
console.log(`  Ollama: ${OLLAMA_URL}`);
console.log(`  Model: mistral`);
