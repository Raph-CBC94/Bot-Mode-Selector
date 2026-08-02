# Chatbot Renewal Engine

Bot Discord alimenté par Groq (LLaMA/Gemma) avec quatre modes de personnalité : **Insulte** (ultra-agressif), **Suceur Ultime** (ultra-gentil et approbateur), **Vantard** (arrogant et persuadé d'être supérieur) et **Adulte** (flirt suggestif non graphique).

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
| `ALLOWED_CHANNEL_ID` | ID du seul salon Discord dans lequel le bot est autorisé à répondre |
| `BOT_MODE` | `insulte` (défaut), `suceur`, `vantard` ou `adulte` — choisir le mode du bot |

## Modes du bot

### Mode `insulte` (défaut)
Le bot répond avec des insultes violentes en français. 12 styles de prompts ultra-agressifs, liste de 150+ insultes, fallbacks locaux si l'API ne répond pas.

### Mode `suceur` (nouveau)
Le bot est **ultra-gentil**, approuve tout, flatte l'interlocuteur, valide chaque message avec enthousiasme. 10 styles de prompts positifs, 25 templates de fallback chaleureux. Pour l'activer : `BOT_MODE=suceur`.

### Mode `vantard`
Le bot est **arrogant et supérieur**, se vante de son intelligence et rabaisse les autres de manière théâtrale. Il répond d'abord au contenu du message et aux questions sur les membres mentionnés, puis ajoute sa vantardise. Pour l'activer : `BOT_MODE=vantard`.

### Mode `adulte`
Le bot répond d'abord réellement à la question, puis ajoute un ton de flirt suggestif avec des sous-entendus légers et des emojis comme 😉 😏 🔥. Le mode reste non graphique : pas de contenu sexuel explicite, pas de mineurs, pas de violence sexuelle, pas de contenu non consenti et pas de sexualisation automatique des membres mentionnés. Pour l'activer : `BOT_MODE=adulte`.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API : Express 5
- Bot : Discord.js v14
- IA : Groq (OpenAI-compatible) — LLaMA 3.3 70B / 3.1 8B / Gemma2 9B
- DB : PostgreSQL + Drizzle ORM
- Build : esbuild (CJS bundle)

## Architecture

- `artifacts/api-server/src/bot/index.ts` — cœur du bot : quatre modes, prompts, fallbacks, rotation des clés Groq, queue par salon
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

La racine de l'URL Render affiche une page d'aide expliquant comment changer `BOT_MODE`.

## Commande Discord de changement de mode

Dans le salon défini par `ALLOWED_CHANNEL_ID`, un administrateur peut changer le mode sans repasser par Render :

- `!mode` — affiche le mode actuel et les modes disponibles
- `!mode insulte`
- `!mode suceur`
- `!mode vantard`
- `!mode adulte`

Le changement est immédiat en mémoire et reste actif jusqu'au prochain redémarrage. Après un redémarrage, la valeur `BOT_MODE` configurée dans Render est utilisée.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Ne jamais appeler `pnpm dev` à la racine — passer par les workflows Replit
- Le bot ne démarre pas si `DISCORD_BOT_TOKEN` ou `ALLOWED_CHANNEL_ID` est absent (warning loggé, pas de crash)
- Si toutes les clés Groq sont rate-limitées, le bot utilise des fallbacks locaux (pas d'arrêt)
- `BOT_MODE` est utilisé au démarrage du bot ; un administrateur peut ensuite le remplacer temporairement avec `!mode <mode>` jusqu'au prochain redémarrage
