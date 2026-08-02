import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "../lib/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../data");
const AFFINITIES_FILE = path.join(DATA_DIR, "affinities.json");

export type AffinityLevel =
  | "best_friend" // >= 50
  | "friend"      // 20 à 49
  | "cool"        // 5 à 19
  | "neutral"     // -5 à 4
  | "meh"         // -20 à -6
  | "annoying"    // -50 à -21
  | "enemy";      // < -50

export interface UserAffinity {
  userId: string;
  username: string;
  score: number;
  interactions: number;
  lastSeen: string;
}

type AffinitiesStore = Record<string, UserAffinity>;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadAffinities(): AffinitiesStore {
  ensureDataDir();
  if (!fs.existsSync(AFFINITIES_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(AFFINITIES_FILE, "utf-8")) as AffinitiesStore;
  } catch {
    return {};
  }
}

function saveAffinities(store: AffinitiesStore): void {
  ensureDataDir();
  fs.writeFileSync(AFFINITIES_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export function getAffinity(userId: string, username: string): UserAffinity {
  const store = loadAffinities();
  if (!store[userId]) {
    store[userId] = {
      userId,
      username,
      score: 0,
      interactions: 0,
      lastSeen: new Date().toISOString(),
    };
    saveAffinities(store);
  }
  return store[userId]!;
}

export function updateAffinity(userId: string, username: string, delta: number): UserAffinity {
  const store = loadAffinities();
  const user = store[userId] ?? {
    userId,
    username,
    score: 0,
    interactions: 0,
    lastSeen: new Date().toISOString(),
  };

  user.score = Math.max(-100, Math.min(100, user.score + delta));
  user.interactions += 1;
  user.username = username;
  user.lastSeen = new Date().toISOString();

  store[userId] = user;
  saveAffinities(store);
  logger.info({ userId, username, score: user.score, delta }, "Affinité mise à jour");
  return user;
}

export function getAffinityLevel(score: number): AffinityLevel {
  if (score >= 50) return "best_friend";
  if (score >= 20) return "friend";
  if (score >= 5) return "cool";
  if (score >= -5) return "neutral";
  if (score >= -20) return "meh";
  if (score >= -50) return "annoying";
  return "enemy";
}

export function getAffinityContext(user: UserAffinity): string {
  const level = getAffinityLevel(user.score);
  const name = user.username;

  switch (level) {
    case "best_friend":
      return `Tu kiffes vraiment ${name}, c'est genre ton meilleur pote sur ce serveur. T'es hyper warm avec lui, tu lui fais des vannes affectueuses, t'utilises 🫩✌🏻 souvent avec lui. Score d'affinité : ${user.score}/100.`;
    case "friend":
      return `${name} est cool, tu l'apprécies bien. T'es détendu et sympa avec lui. Score d'affinité : ${user.score}/100.`;
    case "cool":
      return `${name} est sympa, rien à dire. Tu réponds normalement. Score d'affinité : ${user.score}/100.`;
    case "neutral":
      return `${name} est neutre pour toi, tu le connais pas encore vraiment. Ton comportement normal. Score d'affinité : ${user.score}/100.`;
    case "meh":
      return `${name} commence à te fatiguer un peu. Tes réponses sont un peu plus sèches, tu t'investis moins. Score d'affinité : ${user.score}/100.`;
    case "annoying":
      return `${name} te soûle vraiment. Tes réponses sont courtes, un peu froides, tu peux être légèrement condescendant. Score d'affinité : ${user.score}/100.`;
    case "enemy":
      return `${name} t'a vraiment mis hors de toi. T'as pas envie de lui parler. Réponses très courtes, sèches, parfois juste un "osef" ou un "lmao". Score d'affinité : ${user.score}/100.`;
  }
}
