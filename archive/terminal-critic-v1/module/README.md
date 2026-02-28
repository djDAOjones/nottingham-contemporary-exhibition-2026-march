# Terminal Critic Module

AI-powered critique with 70s terminal styling and persona system.

## Setup

### 1. Install Ollama

Download from [ollama.ai](https://ollama.ai)

### 2. Pull the Mistral model

```bash
ollama pull mistral
```

This downloads the model (~4GB). Run once.

### 3. Start Ollama

```bash
ollama serve
```

Ollama will run on `http://localhost:11434` by default.

### 4. Install dependencies

```bash
npm install
```

### 5. Start the module

```bash
npm start
```

Or with custom server URL:

```bash
SERVER_URL=http://192.168.1.252:3000 npm start
```

## How It Works

1. **Receives message** from central server via WebSocket
2. **Selects persona** (50% neutral, 50% random from 5 flavours)
3. **Queries Ollama** with persona-specific prompt
4. **Sends response** back to display with typing animation metadata
5. **Display renders** with 70s green terminal styling

## Personas

- **Neutral** (50%): Balanced, brief critique
- **Doom-monger**: Pessimistic, predicts worst outcome
- **Psychoanalytic**: Theatrical interpretation, symbolic
- **Sycophantic**: Overly flattering, excessive praise
- **Deadpan**: Dry humor, takes the mick gently
- **Hypercritical**: Art snob, finds fault with everything

## Fallback

If Ollama is unavailable, returns error message instead of crashing.

## Performance

- First response: ~2-5 seconds (model loading)
- Subsequent responses: ~1-3 seconds
- Typing animation: 50ms per character (configurable)

## Troubleshooting

**Module won't connect:**
- Check `SERVER_URL` matches your server IP
- Verify server is running at that address

**Ollama errors:**
- Ensure `ollama serve` is running
- Check `OLLAMA_URL` environment variable (default: `http://localhost:11434`)

**Slow responses:**
- First run loads model into memory (slow)
- Subsequent runs are faster
- Consider running on a machine with GPU for faster inference
