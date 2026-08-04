# Chatbot Renewal Engine

Bot Discord alimenté par Groq (LLaMA/Gemma) avec quatre modes de personnalité : **Insulte** (ultra-agressif), **Suceur Ultime** (ultra-gentil et approbateur), **Vantard** (arrogant et persuadé d'être supérieur) et **Adulte** (flirt suggestif non graphique).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — lancer le serveur API + bot Discord (port 5000)
- `pnpm run typecheck` — typecheck complet de tous les packages
- `pnpm run build` — typecheck + build tous les packages

## Variables d'environnement requises sur Vercel

| Variable | Description |
|---|---|
| `DISCORD_BOT_TOKEN` | Token du bot Discord |
| `DISCORD_APPLICATION_ID` | Application ID du bot dans le portail développeur Discord |
| `DISCORD_PUBLIC_KEY` | Public Key du bot dans le portail développeur Discord |
| `DISCORD_REGISTER_SECRET` | Secret choisi par toi pour protéger l'enregistrement des commandes |
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

## Architecture Vercel-only

- `artifacts/api-server/src/index.ts` — export de l'application Express détecté par Vercel
- `artifacts/api-server/src/app.ts` — site, endpoint health, webhook Discord signé et enregistrement des commandes slash
- `artifacts/api-server/src/start.ts` — ancien runtime Gateway long-running, utilisé uniquement hors Vercel
- `POST /api/discord/interactions` — endpoint à configurer dans Discord
- `POST /api/discord/register` — enregistre les commandes slash avec `X-Register-Secret`

Vercel ne maintient pas de connexion Gateway Discord permanente. En mode Vercel-only, le bot répond aux commandes slash `/bot`, `/mode` et `/panel`, ainsi qu'aux clics et soumissions du panel ; il ne lit pas automatiquement les messages normaux.

Configuration :

1. Dans Discord Developer Portal → General Information, copie `Application ID` dans `DISCORD_APPLICATION_ID` et `Public Key` dans `DISCORD_PUBLIC_KEY`.
2. Dans Discord Developer Portal → Interactions Endpoint URL, mets `https://TON-DOMAINE-VERCEL/api/discord/interactions`.
3. Ajoute un secret aléatoire de ton choix dans `DISCORD_REGISTER_SECRET`.
4. Pour enregistrer les commandes, appelle `POST https://TON-DOMAINE-VERCEL/api/discord/register` avec l'en-tête `X-Register-Secret: ton-secret`. Ajoute `DISCORD_GUILD_ID` temporairement pour une installation immédiate dans un serveur; sans lui, les commandes sont globales et leur propagation peut prendre du temps.
5. Utilise ensuite `/bot message: ta question` dans `ALLOWED_CHANNEL_ID`. Un administrateur peut utiliser `/mode` ou `/mode mode: adulte`; le mode choisi est enregistré dans le sujet du salon sous la forme `[bot-mode:adulte]`, puis relu par chaque interaction, même après un redémarrage Vercel. Le bot doit avoir la permission **Gérer le salon** pour mettre à jour ce sujet. Si cette permission manque, utilise l'option `mode` directement dans `/bot`.
6. Un administrateur peut utiliser `/panel` dans le salon autorisé pour créer ou mettre à jour le message panel et l'épingler. Le bouton **Poser une question** ouvre une modale avec un message obligatoire et un style facultatif (`insulte`, `suceur`, `vantard` ou `adulte`). Si le style est vide, le panel utilise le mode défini par `/mode`. Le bot doit pouvoir **Voir le salon**, **Envoyer des messages**, **Lire l'historique des messages** et **Gérer les messages** pour installer et épingler le panel.

## Architecture historique

- `artifacts/api-server/src/bot/index.ts` — cœur du bot : quatre modes, prompts, fallbacks, rotation des clés Groq, queue par salon
- `artifacts/api-server/src/bot/affinities.ts` — système d'affinité par utilisateur (score -100 → +100)
- `artifacts/api-server/src/bot/index.ts` — moteur partagé des prompts, fallbacks, rotation Groq et mémoire courte, utilisé par Gateway et Vercel

## Déploiement Vercel

Le projet est déployé depuis GitHub sur Vercel. Les variables doivent être configurées dans les environnements Vercel **Production** et **Preview** selon le besoin, puis un nouveau déploiement doit être déclenché après toute modification. Le webhook Vercel réutilise le même moteur que l’ancien déploiement Render : prompts complets par mode, historique des 12 derniers messages, rotation des modèles/clés Groq, retries et fallbacks locaux.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Ne jamais appeler `pnpm dev` à la racine — passer par les workflows Replit
- Le bot ne démarre pas si `DISCORD_BOT_TOKEN` ou `ALLOWED_CHANNEL_ID` est absent (warning loggé, pas de crash)
- Si toutes les clés Groq sont rate-limitées, le bot utilise des fallbacks locaux (pas d'arrêt)
- `BOT_MODE` sert de mode initial ; `/mode mode:<mode>` persiste ensuite le choix dans le sujet du salon autorisé. Le bot doit avoir la permission Discord **Gérer le salon** pour cette persistance.
- Le panel est installé avec `/panel`; ses clics et soumissions de modale passent par le même webhook Discord signé que `/bot` et `/mode`.
