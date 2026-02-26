#!/bin/bash
docker info >/dev/null 2>&1 || (echo "❌ Docker missing"; exit 1)
curl -s http://localhost:11434/api/tags >/dev/null || (echo "❌ Ollama missing"; exit 1)
ollama pull llama3.1
docker build -t clawsafe-runtime -f Dockerfile.runtime .
export OLLAMA_API_KEY="ollama-local"
npm run openclaw -- gateway --allow-unconfigured
