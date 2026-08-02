# Chatbot Renewal Engine

Bot Discord alimenté par Groq (LLaMA/Gemma) avec deux modes de personnalité : **Insulte** (ultra-agressif) et **Suceur Ultime** (ultra-gentil et approbateur).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — lancer le serveur API + bot Discord (port 5000)
- `pnpm run typecheck` — typecheck complet de tous les packages
- `pnpm run build` — typecheck + build tous les packages

## Variables d'environnement requises

| Variable | Description |
|---|---|
| `DISCORD_BOT_TOKEN` | Token du bot Discord |
| `GROQ_API_KEY` | Clé API Groq principale |
| `GROQ_API_KEY_1` … `GROQ_API_KEY_20` | Clés Groq supplémentaires (rotation automatique) |
| `DISCORD_CHANNEL_ID` | (optionnel) Restreindre le bot à un salon précis |
| `BOT_MODE` | `insulte` (défaut) ou `suceur` — choisir le mode du bot |

## Modes du bot

### Mode `insulte` (défaut)
Le bot répond avec des insultes violentes en français. 12 styles de prompts ultra-agressifs, liste de 150+ insultes, fallbacks locaux si l'API ne répond pas.

### Mode `suceur` (nouveau)
Le bot est **ultra-gentil**, approuve tout, flatte l'interlocuteur, valide chaque message avec enthousiasme. 10 styles de prompts positifs, 25 templates de fallback chaleureux. Pour l'activer : `BOT_MODE=suceur`.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API : Express 5
- Bot : Discord.js v14
- IA : Groq (OpenAI-compatible) — LLaMA 3.3 70B / 3.1 8B / Gemma2 9B
- DB : PostgreSQL + Drizzle ORM
- Build : esbuild (CJS bundle)

## Architecture

- `artifacts/api-server/src/bot/index.ts` — cœur du bot : deux modes, prompts, fallbacks, rotation des clés Groq, queue par salon
- `artifacts/api-server/src/bot/affinities.ts` — système d'affinité par utilisateur (score -100 → +100)
- `artifacts/api-server/src/index.ts` — point d'entrée : démarre Express + bot Discord

## Déploiement sur Render

Pour déployer via GitHub → Render :
1. Push le repo sur GitHub
2. Créer un **Web Service** sur Render depuis ce repo
3. Build command : `pnpm install && pnpm --filter @workspace/api-server run build`
4. Start command : `pnpm --filter @workspace/api-server run start`
5. Ajouter les variables d'environnement (`DISCORD_BOT_TOKEN`, `GROQ_API_KEY`, `BOT_MODE`, etc.) dans les settings Render
6. `PORT` est fourni automatiquement par Render

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Ne jamais appeler `pnpm dev` à la racine — passer par les workflows Replit
- Le bot ne démarre pas si `DISCORD_BOT_TOKEN` est absent (warning loggé, pas de crash)
- Si toutes les clés Groq sont rate-limitées, le bot utilise des fallbacks locaux (pas d'arrêt)
- `BOT_MODE` est lu au démarrage du bot — changer la variable nécessite un redémarrage
