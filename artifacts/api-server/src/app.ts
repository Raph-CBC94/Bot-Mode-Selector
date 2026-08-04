import express, { type Express } from "express";
import cors from "cors";
import pino from "pino";
import { pinoHttp } from "pino-http";
import { createPublicKey, verify as verifySignature } from "node:crypto";
import {
  fallbackForMode,
  generateReply,
  loadGroqClients,
  type GroqClient,
} from "./bot/index";

type BotMode = "insulte" | "suceur" | "vantard" | "adulte";

const BOT_MODES = ["insulte", "suceur", "vantard", "adulte"] as const;
let activeBotMode: BotMode =
  parseInteractionMode(process.env["BOT_MODE"]) ?? "insulte";
const DISCORD_PING = 1;
const DISCORD_APPLICATION_COMMAND = 2;
const DISCORD_EPHEMERAL = 1 << 6;
const DISCORD_ADMINISTRATOR = 1n << 3n;
const DISCORD_PUBLIC_KEY_PREFIX = Buffer.from(
  "302a300506032b6570032100",
  "hex",
);

type DiscordInteraction = {
  type?: number;
  channel_id?: string;
  guild_id?: string;
  id?: string;
  token?: string;
  data?: {
    name?: string;
    options?: Array<{ name?: string; value?: unknown }>;
  };
  member?: {
    permissions?: string;
    user?: { username?: string; global_name?: string };
  };
  user?: { username?: string; global_name?: string };
};

type DiscordInteractionResponse =
  | { type: 1 }
  | { type: 5; data?: { flags?: number } }
  | { type: 4; data: { content: string; flags?: number } };

type FetchResponse = {
  ok: boolean;
  status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
};

const BOT_MODE_TOPIC_RE =
  /(?:^|\n)\[bot-mode:(insulte|suceur|vantard|adulte)\](?=\n|$)/i;
const vercelGroqClients: GroqClient[] = loadGroqClients();

function parseInteractionMode(raw: unknown): BotMode | null {
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().toLowerCase();
  return BOT_MODES.includes(normalized as BotMode)
    ? (normalized as BotMode)
    : null;
}

function getInteractionOption(
  interaction: DiscordInteraction,
  name: string,
): unknown {
  return interaction.data?.options?.find((option) => option.name === name)
    ?.value;
}

function getInteractionUsername(interaction: DiscordInteraction): string {
  const user = interaction.member?.user ?? interaction.user;
  return user?.global_name ?? user?.username ?? "toi";
}

function parseStoredMode(topic: string | null | undefined): BotMode | null {
  return parseInteractionMode(topic?.match(BOT_MODE_TOPIC_RE)?.[1]);
}

function getDiscordBotHeaders(): Record<string, string> | null {
  const token = process.env["DISCORD_BOT_TOKEN"];
  return token
    ? {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      }
    : null;
}

async function readStoredBotMode(channelId: string): Promise<BotMode | null> {
  const headers = getDiscordBotHeaders();
  if (!headers) return null;

  try {
    const response = (await globalThis.fetch(
      `https://discord.com/api/v10/channels/${encodeURIComponent(channelId)}`,
      {
        headers,
        signal: AbortSignal.timeout(650),
      },
    )) as unknown as FetchResponse;
    if (!response.ok) return null;
    const channel = (await response.json()) as { topic?: string | null };
    return parseStoredMode(channel.topic);
  } catch (error) {
    logger.warn({ error }, "Mode Discord persistant indisponible");
    return null;
  }
}

async function persistBotMode(
  channelId: string,
  mode: BotMode,
): Promise<boolean> {
  const headers = getDiscordBotHeaders();
  if (!headers) return false;

  try {
    const getResponse = (await globalThis.fetch(
      `https://discord.com/api/v10/channels/${encodeURIComponent(channelId)}`,
      {
        headers,
        signal: AbortSignal.timeout(650),
      },
    )) as unknown as FetchResponse;
    if (!getResponse.ok) {
      throw new Error(`Discord channel lookup failed (${getResponse.status})`);
    }

    const channel = (await getResponse.json()) as { topic?: string | null };
    const currentTopic = channel.topic ?? "";
    const withoutMode = currentTopic
      .replace(BOT_MODE_TOPIC_RE, "")
      .replace(/\n{3,}/g, "\n")
      .trim();
    const topic = withoutMode
      ? `${withoutMode}\n[bot-mode:${mode}]`
      : `[bot-mode:${mode}]`;
    const patchResponse = (await globalThis.fetch(
      `https://discord.com/api/v10/channels/${encodeURIComponent(channelId)}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ topic: topic.slice(0, 1_024) }),
        signal: AbortSignal.timeout(650),
      },
    )) as unknown as FetchResponse;
    if (!patchResponse.ok) {
      throw new Error(`Discord channel update failed (${patchResponse.status})`);
    }
    return true;
  } catch (error) {
    logger.warn(
      { error, mode },
      "Impossible de persister le mode dans le sujet Discord",
    );
    return false;
  }
}

type DiscordChannelMessage = {
  author?: { username?: string; bot?: boolean };
  content?: string;
  timestamp?: string;
};

async function resolveInteractionMentions(
  message: string,
  guildId: string | undefined,
): Promise<string> {
  if (!guildId || !message.includes("<@")) return message;
  const headers = getDiscordBotHeaders();
  if (!headers) return message.replace(/<@!?\d+>/g, "@membre_mentionné");

  const ids = [...message.matchAll(/<@!?(\d+)>/g)].map((match) => match[1]!);
  const names = new Map<string, string>();
  await Promise.all(
    [...new Set(ids)].slice(0, 5).map(async (userId) => {
      try {
        const response = (await globalThis.fetch(
          `https://discord.com/api/v10/guilds/${encodeURIComponent(guildId)}/members/${encodeURIComponent(userId)}`,
          { headers, signal: AbortSignal.timeout(500) },
        )) as unknown as FetchResponse;
        if (!response.ok) return;
        const member = (await response.json()) as {
          nick?: string | null;
          user?: { global_name?: string; username?: string };
        };
        const name =
          member.nick ?? member.user?.global_name ?? member.user?.username;
        if (name) names.set(userId, name.replace(/\s+/g, "_"));
      } catch {
        // Keep the generic mention replacement when Discord lookup times out.
      }
    }),
  );

  return message.replace(
    /<@!?(\d+)>/g,
    (_rawMention, userId: string) =>
      `@${names.get(userId) ?? "membre_mentionné"}`,
  );
}

async function getRecentInteractionConversation(
  channelId: string,
  username: string,
  message: string,
): Promise<string> {
  const headers = getDiscordBotHeaders();
  const entries: string[] = [];
  if (headers) {
    try {
      const response = (await globalThis.fetch(
        `https://discord.com/api/v10/channels/${encodeURIComponent(channelId)}/messages?limit=12`,
        { headers, signal: AbortSignal.timeout(700) },
      )) as unknown as FetchResponse;
      if (response.ok) {
        const messages = (await response.json()) as DiscordChannelMessage[];
        entries.push(
          ...messages
            .slice()
            .reverse()
            .map((entry) => {
              const author = entry.author?.bot
                ? "BOT"
                : entry.author?.username ?? "utilisateur";
              const content = (entry.content ?? "")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 350);
              return `${author}: ${content || "[message sans texte]"}`;
            }),
        );
      }
    } catch (error) {
      logger.warn({ error, channelId }, "Historique Discord indisponible");
    }
  }

  const current = `${username}: ${message.replace(/\s+/g, " ").trim()}`;
  return [...entries, current].join("\n").slice(-3_500);
}

async function generateInteractionReply(
  username: string,
  message: string,
  mode: BotMode,
  recentConversation: string,
): Promise<string> {
  try {
    return await generateReply(
      vercelGroqClients,
      username,
      message,
      mode,
      recentConversation,
    );
  } catch (error) {
    logger.warn({ error, mode }, "Réponse Groq indisponible pour interaction Discord");
    return fallbackForMode(mode, username, message, recentConversation);
  }
}

async function sendInteractionFollowup(
  interaction: DiscordInteraction,
  content: string,
): Promise<void> {
  const applicationId = process.env["DISCORD_APPLICATION_ID"];
  const botToken = process.env["DISCORD_BOT_TOKEN"];
  if (!applicationId || !botToken || !interaction.token) {
    logger.error("Impossible d'envoyer le follow-up Discord : configuration absente");
    return;
  }

  const response = (await globalThis.fetch(
    `https://discord.com/api/v10/webhooks/${encodeURIComponent(applicationId)}/${encodeURIComponent(interaction.token)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: content.slice(0, 2_000) }),
      signal: AbortSignal.timeout(8_000),
    },
  )) as unknown as FetchResponse;

  if (!response.ok) {
    throw new Error(
      `Discord follow-up failed (${response.status}): ${await response.text()}`,
    );
  }
}

async function completeBotInteraction(
  interaction: DiscordInteraction,
  username: string,
  message: string,
  mode: BotMode,
): Promise<void> {
  try {
    const resolvedMessage = await resolveInteractionMentions(
      message,
      interaction.guild_id,
    );
    const recentConversation = await getRecentInteractionConversation(
      interaction.channel_id!,
      username,
      resolvedMessage,
    );
    const reply = await generateInteractionReply(
      username,
      resolvedMessage,
      mode,
      recentConversation,
    );
    await sendInteractionFollowup(interaction, reply);
  } catch (error) {
    logger.error({ error, mode }, "Échec de la réponse différée Discord");
    try {
      await sendInteractionFollowup(
        interaction,
        fallbackForMode(mode, username, message),
      );
    } catch (fallbackError) {
      logger.error(
        { error: fallbackError, mode },
        "Échec du fallback différé Discord",
      );
    }
  }
}

function verifyDiscordRequest(
  rawBody: Buffer,
  signature: string | undefined,
  timestamp: string | undefined,
): boolean {
  const publicKeyHex = process.env["DISCORD_PUBLIC_KEY"];
  if (!publicKeyHex || !signature || !timestamp) return false;
  if (!/^[0-9a-f]{64}$/i.test(publicKeyHex)) return false;
  if (!/^[0-9a-f]{128}$/i.test(signature)) return false;

  try {
    const publicKey = createPublicKey({
      key: Buffer.concat([
        DISCORD_PUBLIC_KEY_PREFIX,
        Buffer.from(publicKeyHex, "hex"),
      ]),
      format: "der",
      type: "spki",
    });
    return verifySignature(
      null,
      Buffer.from(`${timestamp}${rawBody.toString("utf8")}`),
      publicKey,
      Buffer.from(signature, "hex"),
    );
  } catch (error) {
    logger.warn({ error }, "Signature Discord invalide");
    return false;
  }
}

function interactionReply(
  content: string,
  ephemeral = false,
): DiscordInteractionResponse {
  return {
    type: 4,
    data: {
      content: content.slice(0, 2_000),
      ...(ephemeral ? { flags: DISCORD_EPHEMERAL } : {}),
    },
  };
}

async function handleDiscordInteraction(
  interaction: DiscordInteraction,
): Promise<DiscordInteractionResponse> {
  if (interaction.type === DISCORD_PING) {
    return { type: 1 };
  }

  if (interaction.type !== DISCORD_APPLICATION_COMMAND) {
    return interactionReply("Type d'interaction Discord non pris en charge.", true);
  }

  const allowedChannelId = process.env["ALLOWED_CHANNEL_ID"];
  if (!allowedChannelId) {
    return interactionReply(
      "ALLOWED_CHANNEL_ID n'est pas configuré sur Vercel.",
      true,
    );
  }
  if (interaction.channel_id !== allowedChannelId) {
    return interactionReply(
      "Ce bot répond uniquement dans son salon Discord autorisé.",
      true,
    );
  }

  const storedMode = interaction.channel_id
    ? await readStoredBotMode(interaction.channel_id)
    : null;
  if (storedMode) activeBotMode = storedMode;

  const command = interaction.data?.name?.toLowerCase();

  if (command === "mode") {
    const permissions = BigInt(interaction.member?.permissions ?? "0");
    if ((permissions & DISCORD_ADMINISTRATOR) === 0n) {
      return interactionReply(
        "Seuls les administrateurs peuvent consulter ou changer le mode.",
        true,
      );
    }
    const requestedMode = parseInteractionMode(
      getInteractionOption(interaction, "mode"),
    );
    if (requestedMode) {
      const previousMode = activeBotMode;
      activeBotMode = requestedMode;
      const persisted = await persistBotMode(
        interaction.channel_id!,
        requestedMode,
      );
      return interactionReply(
        persisted
          ? `Mode changé : **${previousMode}** → **${activeBotMode}**. Le choix est enregistré pour ce salon et sera utilisé par les prochaines commandes.`
          : `Mode changé : **${previousMode}** → **${activeBotMode}** pour cette instance. Impossible de l'enregistrer dans le sujet du salon : vérifie que le bot a la permission **Gérer le salon**. Pour forcer le mode d'une réponse, utilise l'option \`mode\` de \`/bot\`.`,
      );
    }
    return interactionReply(
      `Mode actuel : **${activeBotMode}**. Modes disponibles : ${BOT_MODES.map((mode) => `\`${mode}\``).join(", ")}.`,
      true,
    );
  }

  if (command !== "bot") {
    return interactionReply("Commande inconnue.", true);
  }

  const message = getInteractionOption(interaction, "message");
  if (typeof message !== "string" || !message.trim()) {
    return interactionReply(
      "Utilise `/bot message:ta question`.",
      true,
    );
  }
  const requestedMode = parseInteractionMode(
    getInteractionOption(interaction, "mode"),
  );
  const username = getInteractionUsername(interaction);
  void completeBotInteraction(
    interaction,
    username,
    message.trim(),
    requestedMode ?? activeBotMode,
  );
  return { type: 5 };
}

const DISCORD_COMMANDS = [
  {
    name: "bot",
    description: "Pose une question au bot",
    options: [
      {
        name: "message",
        description: "Le message auquel le bot doit répondre",
        type: 3,
        required: true,
      },
      {
        name: "mode",
        description: "Personnalité utilisée pour cette réponse",
        type: 3,
        required: false,
        choices: BOT_MODES.map((mode) => ({ name: mode, value: mode })),
      },
    ],
  },
  {
    name: "mode",
    description: "Voir ou choisir le mode du bot",
    options: [
      {
        name: "mode",
        description: "Nouveau mode demandé",
        type: 3,
        required: false,
        choices: BOT_MODES.map((mode) => ({ name: mode, value: mode })),
      },
    ],
  },
];

async function registerDiscordCommands(): Promise<{
  scope: string;
  commands: unknown;
}> {
  const applicationId = process.env["DISCORD_APPLICATION_ID"];
  const botToken = process.env["DISCORD_BOT_TOKEN"];
  if (!applicationId || !botToken) {
    throw new Error(
      "DISCORD_APPLICATION_ID et DISCORD_BOT_TOKEN sont requis pour enregistrer les commandes",
    );
  }

  const guildId = process.env["DISCORD_GUILD_ID"];
  const scope = guildId ? `guilds/${guildId}` : "global";
  const endpoint = guildId
    ? `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`
    : `https://discord.com/api/v10/applications/${applicationId}/commands`;
  const response = (await globalThis.fetch(endpoint, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(DISCORD_COMMANDS),
  })) as unknown as FetchResponse;

  if (!response.ok) {
    throw new Error(
      `Discord command registration failed (${response.status}): ${await response.text()}`,
    );
  }

  return { scope, commands: await response.json() };
}

const app: Express = express();
const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
  ...(process.env.NODE_ENV === "production"
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});

app.get("/", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Bot Mode Selector</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #101116;
        color: #f5f5f5;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background: radial-gradient(circle at top, #28223b 0, #101116 48%);
      }
      main {
        width: min(100%, 560px);
        padding: 36px;
        border: 1px solid #393747;
        border-radius: 20px;
        background: rgba(24, 24, 33, 0.94);
        box-shadow: 0 20px 70px rgba(0, 0, 0, 0.32);
      }
      h1 { margin: 0 0 10px; font-size: clamp(1.7rem, 5vw, 2.35rem); }
      p { color: #b9b7c8; line-height: 1.6; }
      .step { margin-top: 26px; }
      .step h2 { margin: 0 0 8px; font-size: 1rem; color: #dedcff; }
      code {
        display: block;
        margin-top: 10px;
        padding: 14px 16px;
        overflow-x: auto;
        border-radius: 10px;
        background: #0d0d12;
        color: #d7c8ff;
        font: 0.95rem ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      .modes {
        display: grid;
        gap: 10px;
        margin-top: 12px;
      }
      .mode {
        padding: 13px 15px;
        border-radius: 10px;
        background: #2c293d;
      }
      .mode strong { color: #fff; }
      footer { margin-top: 28px; font-size: 0.86rem; color: #858394; }
    </style>
  </head>
  <body>
    <main>
      <h1>Bot Mode Selector</h1>
      <p>Change la personnalité du bot Discord avec une seule variable d’environnement.</p>

      <section class="step">
        <h2>1. Choisis ton mode</h2>
        <div class="modes">
          <div class="mode"><strong>insulte</strong> — mode agressif original</div>
          <div class="mode"><strong>suceur</strong> — mode ultra-gentil et toujours d’accord</div>
          <div class="mode"><strong>vantard</strong> — mode supérieur, arrogant et constamment en train de se vanter</div>
          <div class="mode"><strong>adulte</strong> — mode flirt suggestif, non graphique, avec sous-entendus légers</div>
        </div>
      </section>

      <section class="step">
        <h2>2. Dans Vercel</h2>
        <p>Va dans <strong>Settings → Environment Variables</strong>, puis ajoute ou modifie :</p>
        <code>BOT_MODE=adulte</code>
        <p>Remplace <code>adulte</code> par <code>insulte</code>, <code>suceur</code> ou <code>vantard</code> pour choisir une autre personnalité.</p>
        <p>Le mode adulte reste suggestif et non graphique : pas de contenu sexuel explicite et pas de sexualisation automatique des membres mentionnés.</p>
      </section>

      <section class="step">
        <h2>3. Commandes Discord</h2>
        <p>Avec la configuration Vercel, utilise les commandes slash dans le salon autorisé :</p>
        <code>/bot message: ta question<br />/mode<br />/mode mode: adulte</code>
        <p>Le bot ne lit pas automatiquement les messages normaux : Vercel fonctionne sans connexion Discord permanente. Les réponses passent par les interactions Discord.</p>
      </section>

      <section class="step">
        <h2>4. Configuration Discord</h2>
        <p>Dans le portail développeur Discord, définis l'URL d'interactions sur :</p>
        <code>/api/discord/interactions</code>
        <p>Ajoute <code>DISCORD_PUBLIC_KEY</code>, <code>DISCORD_APPLICATION_ID</code> et <code>DISCORD_REGISTER_SECRET</code> dans Vercel. Appelle ensuite <code>/api/discord/register</code> avec l'en-tête <code>X-Register-Secret</code> pour créer les commandes slash.</p>
      </section>

      <footer>Le bot répond uniquement dans le salon défini par ALLOWED_CHANNEL_ID.</footer>
    </main>
  </body>
</html>`);
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());

app.post(
  "/api/discord/interactions",
  express.raw({ type: "application/json", limit: "1mb" }),
  async (req, res) => {
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(typeof req.body === "string" ? req.body : "");
    const valid = verifyDiscordRequest(
      rawBody,
      req.header("X-Signature-Ed25519"),
      req.header("X-Signature-Timestamp"),
    );

    if (!valid) {
      res.status(401).send("invalid request signature");
      return;
    }

    try {
      const interaction = JSON.parse(rawBody.toString("utf8")) as DiscordInteraction;
      const response = await handleDiscordInteraction(interaction);
      res.json(response);
    } catch (error) {
      logger.error({ error }, "Erreur webhook Discord");
      res.status(500).json({ error: "Discord interaction failed" });
    }
  },
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/discord/register", async (req, res) => {
  const configuredSecret = process.env["DISCORD_REGISTER_SECRET"];
  const providedSecret = req.header("X-Register-Secret");
  if (!configuredSecret || providedSecret !== configuredSecret) {
    res.status(401).json({ error: "invalid registration secret" });
    return;
  }

  try {
    const result = await registerDiscordCommands();
    logger.info({ scope: result.scope }, "Commandes Discord enregistrées");
    res.json({ ok: true, scope: result.scope, commands: result.commands });
  } catch (error) {
    logger.error({ error }, "Échec enregistrement commandes Discord");
    res.status(502).json({ error: "Discord command registration failed" });
  }
});

export default app;
