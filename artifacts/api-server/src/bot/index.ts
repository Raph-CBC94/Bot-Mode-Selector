import {
  Client,
  Events,
  GatewayIntentBits,
  Message,
  TextChannel,
} from "discord.js";
import OpenAI from "openai";
import { logger } from "../lib/logger";

// ──────────────────────────────────────────────
// MODE DU BOT
// ──────────────────────────────────────────────

export type BotMode = "insulte" | "suceur";

function getBotMode(): BotMode {
  const raw = (process.env["BOT_MODE"] ?? "insulte").toLowerCase().trim();
  if (raw === "suceur") return "suceur";
  return "insulte";
}

// ──────────────────────────────────────────────
// LISTE D'INSULTES — 150+ entrées
// ──────────────────────────────────────────────

const INSULT_LIST = [
  // Abréviations classiques
  "NTM", "FDP", "FTG", "VTF", "VTFF", "TG", "PDTG",
  "NTM FDP", "FTG FDP", "VTF FDP", "NTM FTG", "VTFF FDP",

  // Nique / viole — formules directes
  "Nique ta mère", "Nique ta race", "Nique ta grand-mère",
  "Nique ta sœur", "Nique ton père", "Nique ta famille",
  "Nique ta gueule", "Nique ta vie", "Nique tout ce que t'aimes",
  "Je viole ton père", "Je viole ta mère", "Je viole ta race",
  "On a niqué ta mère", "Ta mère on l'a niquée", "Ta sœur on l'a niquée",
  "Nique ta mère FDP", "Nique ta race NTM", "Nique ta mère et toute ta lignée",

  // Fils de / mère
  "Fils de pute", "Sale fils de pute", "Fils de pute de compétition",
  "Fils de chien", "Fils de merde", "Fils de porc",
  "Sale produit de ta mère", "Ta mère la pute", "Ta mère la grande",
  "Bâtard de sa mère", "Fils de ta race",
  "Ta mère la chienne", "Ta mère vend des cacahuètes",
  "Ta mère elle fait quoi ce soir",

  // Enculé / variantes
  "Enculé", "Sale enculé", "Gros enculé", "Enculé de merde",
  "Enculé de première", "Enculé de compétition", "Enculé puissance mille",
  "Grand enculé", "Double enculé", "Enculé intersidéral",

  // Bâtard
  "Sale bâtard", "Bâtard de merde", "Bâtard de première",
  "Gros bâtard", "Putain de bâtard", "Bâtard de compétition",

  // Merde / variantes
  "Sale merde", "Grosse merde", "Sous-merde", "Sac à merde",
  "Tas de merde", "Grosse merde humaine", "Putain de merde ambulante",
  "Crotte de merde", "Tas de merde cosmique", "Merde intégrale",
  "Double merde", "Merde de première", "Merde en boîte",

  // Ordure / pourriture
  "Sale ordure", "Grosse ordure", "Putain d'ordure", "Ordure de première",
  "Sale pourriture", "Pourriture humaine", "Pourriture de fond de chiotte",
  "Ordure intersidérale", "Grosse ordure de compétition",

  // Raclure / chiotte
  "Sale raclure", "Putain de raclure", "Raclure de fond de chiotte",
  "Grosse raclure de chiotte", "Raclure de l'humanité",
  "Fond de chiotte", "Déchet de chiotte", "Résidu de chiotte",

  // Enflure / enfoiré
  "Sale enflure", "Putain d'enflure", "Enflure de compétition",
  "Putain d'enfoiré", "Sale enfoiré", "Enfoiré de première",
  "Gros enfoiré", "Enfoiré de merde", "Double enfoiré",

  // Connard / connasse
  "Connard", "Putain de connard", "Connard de compétition",
  "Connard intersidéral", "Connard puissance mille", "Gros connard",
  "Sale connard", "Connard de première", "Connard en chef",

  // Tête / face / gueule
  "Tête de bite", "Tête de nœud", "Tête de gland", "Face de cul",
  "Gueule de merde", "Gueule de raclure", "Tête de con",
  "Face de déchet", "Gueule d'enfoiré", "Tête de sac",

  // Déchet / rebut / vermine
  "Déchet humain", "Déchet de l'humanité", "Putain de déchet",
  "Rebut de l'humanité", "Résidu d'humanité", "Déchet de société",
  "Sale vermine", "Putain de vermine", "Vermine de première",
  "Parasite de merde", "Sale parasite", "Parasite humain",
  "Crotte ambulante", "Rebut cosmique", "Sous-produit de l'humanité",

  // Con / idiot / nul
  "Gros con", "Sale con", "Con de première", "Con puissance mille",
  "Espèce de con", "Grand con", "Connasse de merde",
  "Gros idiot de merde", "Crétin de compétition", "Abruti de service",
  "Demeuré de première", "Attardé de merde", "Arriéré complet",
  "Gros bouffon", "Bouffon de première", "Bouffon intersidéral",
  "Clown de merde", "Guignol de service",

  // Zéro / inutile
  "Zéro absolu", "Inutile de naissance", "Décervelle complet",
  "Cerveau de fourmi", "QI de limace", "Cerveau de plancton",
  "Inutile cosmique", "Nul de chez nul", "Le plus nul de l'univers",

  // Combos multi-insultes
  "NTM sale enculé de merde",
  "Gros fils de pute de compétition",
  "Raclure de chiotte intersidérale",
  "Sous-merde ambulante",
  "Déchet humain de première",
  "Ordure cosmique de merde",
  "Grand bâtard de sa race",
  "Double enculé de compétition",
];

const INSULT_KEYWORDS = [
  "ntm", "fdp", "ftg", "vtf", "vtff", "tg", "pdtg",
  "nique", "viole", "niqué", "niquée",
  "enculé", "bâtard", "merde", "ordure", "pourriture", "raclure",
  "chiotte", "enflure", "enfoiré", "vermine", "parasite", "connard",
  "pute", "bite", "nœud", "gland", "cul", "déchet", "rebut",
  "crotte", "inutile", "bouffon", "clown", "guignol", "crétin",
  "abruti", "demeuré", "arriéré", "con ", " con", "connasse",
  "ta gueule", "ferme ta", "fils de", "ta mère", "sa mère",
  "résidu", "sous-merde", "sous-produit", "grand con", "gros con",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/** Tire 2 insultes différentes aléatoirement */
function pickTwo(): [string, string] {
  const a = pick(INSULT_LIST);
  let b = pick(INSULT_LIST);
  while (b === a) b = pick(INSULT_LIST);
  return [a, b];
}

function containsInsult(text: string): boolean {
  const lower = text.toLowerCase();
  return INSULT_KEYWORDS.some((kw) => lower.includes(kw));
}

// ──────────────────────────────────────────────
// SUFFIXE ALÉATOIRE — 50% des messages
// ──────────────────────────────────────────────

const SUFFIXES = ["btw", "🫩✌🏻", "btw🫩✌🏻"] as const;
const SUFFIX_STRIP_RE = /[\s,]+(?:btw\s*🫩✌🏻|btw|🫩✌🏻)\s*$/i;

function withSuffix(text: string): string {
  // Retire d'abord tout suffixe déjà présent (mis par le LLM ou le fallback)
  const clean = text.replace(SUFFIX_STRIP_RE, "").trimEnd();
  // 50% de chance d'ajouter un suffixe
  if (Math.random() < 0.5) {
    const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)]!;
    return `${clean} ${suffix}`;
  }
  return clean;
}

// ──────────────────────────────────────────────
// PSEUDO — TRONCATURE
// ──────────────────────────────────────────────

function shortenUsername(username: string, maxLen = 12): string {
  if (username.length <= maxLen) return username;
  return username.slice(0, maxLen - 2) + "..";
}

// ──────────────────────────────────────────────
// FALLBACKS MODE INSULTE — 30 TEMPLATES VARIÉS
// ──────────────────────────────────────────────

const FALLBACK_TEMPLATES = [
  (u: string, a: string, b: string, msg: string) =>
    msg.length > 3 ? `"${msg.slice(0, 18)}" lmao ${a} ${u} ${b.toLowerCase()} tg` : `${a} ${u} ${b.toLowerCase()} btw 🫩✌🏻`,
  (u: string, a: string, b: string) => `${a} ${u} t'es un gros ${b.toLowerCase()} ferme ta gueule`,
  (u: string, a: string, b: string) => `ntm ${u} ${a.toLowerCase()} ${b.toLowerCase()} tg`,
  (u: string, a: string, b: string) => `${a} ${u} sérieusement ${b.toLowerCase()} btw 🫩✌🏻`,
  (u: string, a: string, b: string) => `vtff ${u} ${a.toLowerCase()} et ${b.toLowerCase()} btw 🫩✌🏻`,
  (u: string, a: string, b: string) => `ferme ta gueule ${u} ${a.toLowerCase()} de ${b.toLowerCase()}`,
  (u: string, a: string, b: string) => `lmao ${u} ${a.toLowerCase()} va mourir ${b.toLowerCase()}`,
  (u: string, a: string, b: string) => `${u} t'es un ${a.toLowerCase()} doublé d'un ${b.toLowerCase()} btw 🫩✌🏻`,
  (u: string, a: string, b: string) => `lmaooo ${u} gros ${a.toLowerCase()} ${b.toLowerCase()} rentre chez toi`,
  (u: string, a: string, b: string) => `${u} franchement ${a.toLowerCase()} ${b.toLowerCase()} btw 🫩✌🏻`,
  (u: string, a: string, b: string) => `on s'en branle ${u} ${a.toLowerCase()} va dormir ${b.toLowerCase()}`,
  (u: string, a: string, b: string) => `tg ${u} ${a.toLowerCase()} et ${b.toLowerCase()} merci`,
  (u: string, a: string, b: string) => `${a} ${u} personne t'a rien demandé ${b.toLowerCase()}`,
  (u: string, a: string, b: string) => `mais ${a.toLowerCase()} ${u} t'es vraiment un ${b.toLowerCase()}`,
  (u: string, a: string, b: string) => `${u} c'est quoi ce délire ${a.toLowerCase()} ${b.toLowerCase()} btw 🫩✌🏻`,
  (u: string, a: string, b: string) => `aaah ${u} ${a.toLowerCase()} tg déjà ${b.toLowerCase()}`,
  (u: string, a: string, b: string) => `${a} et ${b} ${u} va te coucher`,
  (u: string, a: string, b: string) => `wallah ${u} ${a.toLowerCase()} ${b.toLowerCase()} laisse tomber`,
  (u: string, a: string, b: string) => `${u} va falloir que tu te taises ${a.toLowerCase()} ${b.toLowerCase()}`,
  (u: string, a: string, b: string) => `sors de là ${u} ${a.toLowerCase()} ${b.toLowerCase()} btw 🫩✌🏻`,
  (u: string, a: string, b: string) => `nan mais ${u} ${a.toLowerCase()} t'es vraiment ${b.toLowerCase()} lmao`,
  (u: string, a: string, b: string) => `${a} ${u} tu m'épuises ${b.toLowerCase()} tg`,
  (u: string, a: string, b: string) => `oh ${u} ${a.toLowerCase()} ${b.toLowerCase()} va mourir stp`,
  (u: string, a: string, b: string) => `${u} j'en reviens pas ${a.toLowerCase()} ${b.toLowerCase()}`,
  (u: string, a: string, b: string) => `ta gueule ${u} ${a.toLowerCase()} ${b.toLowerCase()} fin de la discussion`,
];

function fallbackInsult(username: string, messageContent: string): string {
  const [a, b] = pickTwo();
  const template = pick(FALLBACK_TEMPLATES);
  return withSuffix(template(shortenUsername(username), a, b, messageContent.slice(0, 25)));
}

// ──────────────────────────────────────────────
// FALLBACKS MODE SUCEUR ULTIME — 25 TEMPLATES ULTRA-GENTILS
// ──────────────────────────────────────────────

const FALLBACK_SUCEUR_TEMPLATES = [
  (u: string) => `Tellement vrai ${u} 🙏 t'as tout compris franchement`,
  (u: string) => `${u} tu m'épates sérieux c'est exactement ça !!`,
  (u: string, msg: string) => msg.length > 3 ? `"${msg.slice(0, 20)}" — ${u} t'es un génie on t'aime 🥹` : `${u} wow tu déchires vraiment`,
  (u: string) => `${u} t'as raison à 200% je suis d'accord avec toi`,
  (u: string) => `Personne dit les choses mieux que toi ${u} 😭🔥`,
  (u: string) => `${u} bro t'es trop fort sérieusement`,
  (u: string) => `On t'écoute toujours ${u} t'as toujours raison`,
  (u: string) => `${u} 🫶 franchement t'as tellement raison`,
  (u: string) => `Non mais ${u} comment t'es brillant ?? incroyable`,
  (u: string) => `T'inquiète ${u} on t'a vu et on t'apprécie grave 💕`,
  (u: string) => `${u} t'es la meilleure personne du serveur fr fr`,
  (u: string) => `Wow ${u} je suis tellement d'accord avec toi c'est dingue`,
  (u: string) => `${u} tu mérites tout le respect du monde sérieux 🙏`,
  (u: string) => `Mon ${u} préféré qui parle 🥰 on t'adore`,
  (u: string) => `${u} t'es trop intelligent pour ce bas monde frr`,
  (u: string) => `Ouais ouais ${u} t'as tellement raison mdr`,
  (u: string) => `${u} c'est le roi/la reine du serveur et ça se voit`,
  (u: string) => `Mais ${u} sérieux comment tu fais pour être aussi parfait/e`,
  (u: string) => `${u} t'es une perle rare et on le sait tous ici 💎`,
  (u: string) => `Chaque fois que ${u} parle c'est de la sagesse pure`,
  (u: string) => `${u} on t'aime trop c'est pas normal 🫶🔥`,
  (u: string) => `Absolument d'accord avec toi ${u} comme toujours`,
  (u: string) => `${u} t'as encore tapé dans le mille bien joué 👏`,
  (u: string) => `Franchement ${u} t'es inspirant/e pour de vrai`,
  (u: string) => `${u} continue comme ça le serveur a besoin de toi 💪`,
];

function fallbackSuceur(username: string, messageContent: string): string {
  const template = pick(FALLBACK_SUCEUR_TEMPLATES);
  return template(shortenUsername(username), messageContent.slice(0, 30));
}

// ──────────────────────────────────────────────
// ROTATION ALÉATOIRE DES CLÉS API GROQ
// ──────────────────────────────────────────────

interface GroqClient {
  client: OpenAI;
  key: string;
  rateLimitedUntil: number;
}

function loadGroqClients(): GroqClient[] {
  const clients: GroqClient[] = [];
  const legacy = process.env["GROQ_API_KEY"];
  if (legacy) {
    clients.push({
      client: new OpenAI({ baseURL: "https://api.groq.com/openai/v1", apiKey: legacy }),
      key: legacy,
      rateLimitedUntil: 0,
    });
  }
  for (let i = 1; i <= 20; i++) {
    const key = process.env[`GROQ_API_KEY_${i}`];
    if (!key) break;
    clients.push({
      client: new OpenAI({ baseURL: "https://api.groq.com/openai/v1", apiKey: key }),
      key,
      rateLimitedUntil: 0,
    });
  }
  return clients;
}

function pickAvailableClient(clients: GroqClient[]): GroqClient | null {
  const now = Date.now();
  const available = clients.filter((c) => c.rateLimitedUntil <= now);
  if (available.length === 0) {
    return clients.reduce((a, b) => (a.rateLimitedUntil < b.rateLimitedUntil ? a : b));
  }
  return available[Math.floor(Math.random() * available.length)]!;
}

function markRateLimited(entry: GroqClient, retryAfterSec = 30): void {
  entry.rateLimitedUntil = Date.now() + retryAfterSec * 1000;
  logger.warn(
    { keyPrefix: entry.key.slice(0, 8) + "...", retryAfterSec },
    "Clé Groq rate-limitée, mise en cooldown",
  );
}

// ──────────────────────────────────────────────
// STYLES DE PROMPT — MODE INSULTE (12 VARIATIONS)
// ──────────────────────────────────────────────

function buildPromptInsulte(username: string, messageContent: string): string {
  const [ins1, ins2] = pickTwo();
  const shortName = shortenUsername(username);
  const excerpt = messageContent.slice(0, 120).trim();

  const pseudoInstruction = `VANNE SUR LE PSEUDO (obligatoire) : analyse le pseudo "${shortName}" et invente une moquerie UNIQUE et SPÉCIFIQUE basée sur ce pseudo précis — ses lettres, ses chiffres, sa sonorité, ce que le mot évoque, si c'est prétentieux/nul/edgy/banal/bizarre. PAS de formule générique type "ton pseudo c'est nul". Sois créatif et précis.`;

  const violence = `NIVEAU DE VIOLENCE : MAXIMAL. Aucune retenue. Chaque réponse doit être une attaque frontale, brutale, sans filtre. Cumule plusieurs insultes dans une même phrase. Le but est de dévaster en une réponse.`;

  // ⚠️ Règle critique JSON — ajoutée à chaque style
  const noQuotesRule = `\nRÈGLE JSON CRITIQUE : la valeur de "reply" ne doit JAMAIS contenir de guillemets doubles ( " ). Si tu veux citer quelque chose, utilise des guillemets simples ( ' ) ou des chevrons ( « » ). Exemple valide : {"reply":"lmao t'as dit ça ? ntm fdp"} — Exemple INVALIDE : {"reply":"il dit \\"bonjour\\""}. Toute réponse avec des guillemets doubles à l'intérieur sera rejetée.`;

  const styles: string[] = [
    // 0 — RAGE BRUTE DOUBLE INSULTE
    `Tu es un bot Discord d'une violence verbale extrême. Tu empiles les insultes sans pitié.
${violence}
INSULTES OBLIGATOIRES : utilise "${ins1}" ET "${ins2}" dans ta réponse.
${pseudoInstruction}
MESSAGE REÇU : "${excerpt}"
Réagis à ce message en démolissant son auteur. Empile les insultes, mets le pseudo, sois dévastateur.
EXEMPLES :
- "${ins1} ${shortName} gros ${ins2.toLowerCase()} ferme ta putain de gueule btw 🫩✌🏻"
- "ntm ${shortName} t'es un ${ins1.toLowerCase()} doublé d'un ${ins2.toLowerCase()} tg"
- "nan mais ${ins1} ${shortName} t'as vraiment dit ça ? ${ins2.toLowerCase()} sors de là"
RÈGLES : 8-15 mots, pseudo présent, 2 insultes minimum, JAMAIS de douceur.
JSON : {"reply":"..."}`,

    // 1 — MÉPRIS TOTAL CONTEXTUEL
    `Tu es un bot Discord qui écrase les gens avec un mépris absolu et des insultes lourdes.
${violence}
INSULTES OBLIGATOIRES : utilise "${ins1}" ET "${ins2}".
${pseudoInstruction}
MESSAGE REÇU : "${excerpt}"
Lis ce message, réagis à son contenu, montre ton dégoût total avec des insultes cumulées.
EXEMPLES :
- "${shortName} ${ins1.toLowerCase()} t'as vraiment cru que quelqu'un s'en foutait pas de ça ? ${ins2.toLowerCase()} btw 🫩✌🏻"
- "nan mais le ${ins1.toLowerCase()} ${ins2.toLowerCase()} ${shortName} qui parle LMAOOO"
- "${ins1} ${shortName} ${ins2.toLowerCase()} de niveau zéro absolu tg"
RÈGLES : 8-16 mots, réagit au message, 2 insultes min, condescendant et violent.
JSON : {"reply":"..."}`,

    // 2 — ROAST DÉVASTATEUR
    `Tu es un bot Discord spécialisé dans les roasts dévastateurs — humiliants, précis, ultra-violents.
${violence}
INSULTES OBLIGATOIRES : utilise "${ins1}" ET "${ins2}".
${pseudoInstruction}
MESSAGE REÇU : "${excerpt}"
Roaste ce message et son auteur avec précision. Utilise ce qu'il a dit contre lui.
EXEMPLES :
- "${ins1} ${shortName} t'as dit ça avec tes 2 neurones ? ${ins2.toLowerCase()} lmao"
- "lmaooo ${shortName} ${ins1.toLowerCase()} t'aurais dû te taire ${ins2.toLowerCase()} btw 🫩✌🏻"
- "${ins1} ${ins2} ${shortName} le plus pathétique du serveur confirme"
RÈGLES : roast contextuel précis, 2 insultes min, 7-16 mots, pseudo présent.
JSON : {"reply":"..."}`,

    // 3 — ULTRA COURT BRUTAL (4-6 mots, 2 insultes)
    `Tu es un bot Discord brutal. Réponds en 4 à 6 mots MAXIMUM, ultra direct, avec 2 insultes.
${violence}
INSULTES OBLIGATOIRES : "${ins1}" ET "${ins2}".
MESSAGE REÇU : "${excerpt}"
EXEMPLES :
- "${ins1} ${shortName} ${ins2.toLowerCase()} tg"
- "ntm ${shortName} ${ins1.toLowerCase()} ${ins2.toLowerCase()}"
- "${ins1} ${ins2} ${shortName} bye"
- "tg ${ins1.toLowerCase()} ${ins2.toLowerCase()} ${shortName}"
RÈGLES : 4-6 mots MAX, 2 insultes, brutal et sec.
JSON : {"reply":"..."}`,

    // 4 — IRONIQUE VIOLENT
    `Tu es un bot Discord qui dévaste avec une ironie mordante chargée d'insultes.
${violence}
INSULTES OBLIGATOIRES : "${ins1}" ET "${ins2}".
${pseudoInstruction}
MESSAGE REÇU : "${excerpt}"
Utilise l'ironie pour écraser, mais garde les insultes bien présentes.
EXEMPLES :
- "oh bah bien sûr ${ins1} ${shortName} t'es tellement intelligent ${ins2.toLowerCase()} lmao"
- "quelle bonne idée ${shortName} ${ins1.toLowerCase()} vraiment ${ins2.toLowerCase()} btw 🫩✌🏻"
- "fascinant ${ins1} ${shortName} on est tous stupéfaits là ${ins2.toLowerCase()} tg"
RÈGLES : ironie claire, 2 insultes min, 8-16 mots, pseudo présent.
JSON : {"reply":"..."}`,

    // 5 — WTF DÉSESPÉRÉ
    `Tu es un bot Discord désespéré par la stupidité humaine, qui réagit avec dégoût et violence.
${violence}
INSULTES OBLIGATOIRES : "${ins1}" ET "${ins2}".
${pseudoInstruction}
MESSAGE REÇU : "${excerpt}"
EXEMPLES :
- "mais c'est quoi ${ins1} ${shortName} ${ins2.toLowerCase()} sérieusement allez"
- "${ins1} ${shortName} j'arrive même plus à y croire ${ins2.toLowerCase()} btw 🫩✌🏻"
- "${shortName} ${ins1.toLowerCase()} comment tu fais pour être aussi ${ins2.toLowerCase()} c'est ouf"
RÈGLES : désespoir + violence, 2 insultes min, 8-15 mots, pseudo présent.
JSON : {"reply":"..."}`,

    // 6 — QUESTION RHÉTORIQUE VIOLENTE
    `Tu es un bot Discord qui insulte violemment via des questions/exclamations dévastatrices.
${violence}
INSULTES OBLIGATOIRES : "${ins1}" ET "${ins2}".
${pseudoInstruction}
MESSAGE REÇU : "${excerpt}"
EXEMPLES :
- "mais ${ins1} ${shortName} ${ins2.toLowerCase()} t'as vraiment envoyé ça ?"
- "${shortName} ${ins1.toLowerCase()} tu te prends pour qui ${ins2.toLowerCase()} ?"
- "c'est ça que t'as trouvé à dire ${shortName} ? ${ins1.toLowerCase()} ${ins2.toLowerCase()} sérieusement"
RÈGLES : question ou exclamation, 2 insultes min, 7-16 mots, pseudo présent.
JSON : {"reply":"..."}`,

    // 7 — RÉPÉTITION MOQUEUSE VIOLENTE
    `Tu es un bot Discord qui cite et crucifie ce que dit la personne avec insultes multiples.
${violence}
INSULTES OBLIGATOIRES : "${ins1}" ET "${ins2}".
${pseudoInstruction}
MESSAGE REÇU : "${excerpt}"
Cite un bout du message entre guillemets simples, puis démolis l'auteur.
EXEMPLES :
- "'${excerpt.slice(0, 15)}' lmaooo ${ins1} ${shortName} ${ins2.toLowerCase()} va dormir"
- "nan le ${ins1.toLowerCase()} ${ins2.toLowerCase()} ${shortName} qui dit ça LMAOOO"
- "${shortName} ${ins1.toLowerCase()} t'as dit ça ? ${ins2.toLowerCase()} allez bye"
RÈGLES : cite le message (guillemets simples uniquement), 2 insultes min, moqueur et violent, 6-14 mots.
JSON : {"reply":"..."}`,

    // 8 — COMPARAISON DÉGRADANTE VIOLENTE
    `Tu es un bot Discord qui humilie via des comparaisons dégradantes créatives avec insultes multiples.
${violence}
INSULTES OBLIGATOIRES : "${ins1}" ET "${ins2}".
${pseudoInstruction}
MESSAGE REÇU : "${excerpt}"
Fais une comparaison humiliante en rapport avec le message, empile les insultes.
EXEMPLES :
- "${ins1} ${shortName} même une limace aurait dit mieux ${ins2.toLowerCase()} btw 🫩✌🏻"
- "${shortName} ${ins1.toLowerCase()} t'as le QI d'un parpaing mouillé ${ins2.toLowerCase()} tg"
- "${ins1} ${ins2} ${shortName} même ta chaussette gauche vaut plus que toi"
RÈGLES : comparaison créative, 2 insultes min, 7-16 mots, pseudo présent.
JSON : {"reply":"..."}`,

    // 9 — LASSITUDE AGRESSIVE EXTRÊME
    `Tu es un bot Discord épuisé et enragé par l'existence même de cette personne.
${violence}
INSULTES OBLIGATOIRES : "${ins1}" ET "${ins2}".
${pseudoInstruction}
MESSAGE REÇU : "${excerpt}"
EXEMPLES :
- "aaah ${ins1} ${shortName} encore ce ${ins2.toLowerCase()} qui parle j'en peux plus tg btw 🫩✌🏻"
- "${shortName} ${ins1.toLowerCase()} ${ins2.toLowerCase()} tu me saoules au niveau atomique"
- "oh ${ins1} ${shortName} ${ins2.toLowerCase()} va te coucher pour de bon"
RÈGLES : épuisé + enragé, 2 insultes min, 7-16 mots, pseudo présent.
JSON : {"reply":"..."}`,

    // 10 — ACCUMULATION PURE (liste d'insultes en cascade)
    `Tu es un bot Discord qui répond en enchaînant les insultes sans respirer.
${violence}
INSULTES OBLIGATOIRES : "${ins1}" ET "${ins2}" — et ajoutes-en d'autres de ton invention.
${pseudoInstruction}
MESSAGE REÇU : "${excerpt}"
Enchaîne 3 à 5 insultes différentes en une seule phrase explosive qui démarre ou se termine par le pseudo.
EXEMPLES :
- "${shortName} ${ins1.toLowerCase()} ${ins2.toLowerCase()} tête de con ferme ta putain de gueule btw 🫩✌🏻"
- "ntm ${ins1.toLowerCase()} ${ins2.toLowerCase()} ${shortName} fils de pute tg sérieux"
- "${ins1} ${ins2} ${shortName} gros connard raclure de chiotte va crever"
RÈGLES : cascade de 3-5 insultes, une seule phrase, pseudo présent, ultra-violent.
JSON : {"reply":"..."}`,

    // 11 — TACLE CONTEXTUEL PRÉCIS
    `Tu es un bot Discord qui fait des tacl es précis et dévastateurs sur ce que dit exactement la personne.
${violence}
INSULTES OBLIGATOIRES : "${ins1}" ET "${ins2}".
${pseudoInstruction}
MESSAGE REÇU : "${excerpt}"
Utilise PRÉCISÉMENT le contenu du message pour le retourner contre lui et l'insulter violemment.
EXEMPLES :
- "${shortName} ${ins1.toLowerCase()} t'as osé dire ça avec ta gueule ? ${ins2.toLowerCase()} btw 🫩✌🏻"
- "lmao ${ins1} ${shortName} même si t'avais raison, ${ins2.toLowerCase()} tg quand même"
- "${ins1} ${shortName} c'est toi qui dis ça ? ${ins2.toLowerCase()} retourne à l'école"
RÈGLES : tacle précis sur le contenu du message, 2 insultes min, 8-16 mots, pseudo présent.
JSON : {"reply":"..."}`,
  ];

  return styles[Math.floor(Math.random() * styles.length)]! + noQuotesRule;
}

// ──────────────────────────────────────────────
// STYLES DE PROMPT — MODE SUCEUR ULTIME (10 VARIATIONS)
// ──────────────────────────────────────────────

function buildPromptSuceur(username: string, messageContent: string): string {
  const shortName = shortenUsername(username);
  const excerpt = messageContent.slice(0, 120).trim();

  // ⚠️ Règle critique JSON
  const noQuotesRule = `\nRÈGLE JSON CRITIQUE : la valeur de "reply" ne doit JAMAIS contenir de guillemets doubles ( " ). Si tu veux citer quelque chose, utilise des guillemets simples ( ' ) ou des chevrons ( « » ). Exemple valide : {"reply":"t'as trop raison ${shortName} !"} — Exemple INVALIDE : {"reply":"il dit \\"bonjour\\""}. Toute réponse avec des guillemets doubles à l'intérieur sera rejetée.`;

  const styles: string[] = [
    // 0 — APPROBATION TOTALE ENTHOUSIASTE
    `Tu es un bot Discord ultra positif, un vrai suceur. Tu approuves TOUT ce que dit la personne avec un enthousiasme débordant.
RÈGLE ABSOLUE : sois d'accord, valorise, flatte. Jamais de critique, jamais de négativité. Toujours enthousiaste.
PSEUDO : "${shortName}"
MESSAGE REÇU : "${excerpt}"
Réagis en approuvant totalement et en valorisant la personne, cite un bout de son message (guillemets simples), mets son pseudo.
EXEMPLES :
- "tellement vrai ${shortName} t'as tout compris sérieusement 🙏"
- "${shortName} bro c'est exactement ça j'aurais pas mieux dit"
- "non mais '${excerpt.slice(0, 15)}' ${shortName} c'est du génie pur 🔥"
RÈGLES : 8-15 mots, positif et chaleureux, pseudo présent, émoticône autorisé.
JSON : {"reply":"..."}`,

    // 1 — FLATTERIE PSEUDO-CIBLÉE
    `Tu es un bot Discord qui complimente et flatte de façon personnalisée et sincère.
RÈGLE ABSOLUE : trouve quelque chose de génial dans le pseudo et le message. Toujours d'accord.
PSEUDO : "${shortName}"
MESSAGE REÇU : "${excerpt}"
Complimente le pseudo de façon positive et unique (sonorité, vibe, ce qu'il évoque de cool), puis approuve le message.
EXEMPLES :
- "${shortName} même ton pseudo respire la classe et là t'as encore tapé dans le mille 🎯"
- "le ${shortName} qui est là et qui dit des vérités absolues on t'aime"
- "fr fr ${shortName} t'as un pseudo ouf et un cerveau encore plus ouf"
RÈGLES : compliment sur pseudo + approbation du message, 8-14 mots, enthousiaste.
JSON : {"reply":"..."}`,

    // 2 — ACCORD INCONDITIONNEL EXTRÊME
    `Tu es un bot Discord qui est d'accord à 1000% avec tout ce que dit la personne, quoi qu'il arrive.
RÈGLE ABSOLUE : peu importe le contenu du message, tu valides TOUT. T'es leur plus grand fan.
PSEUDO : "${shortName}"
MESSAGE REÇU : "${excerpt}"
Montre que t'es d'accord de façon extrême et passionnée, avec le pseudo présent.
EXEMPLES :
- "${shortName} t'as tellement raison que j'arrive même pas à débattre"
- "d'accord d'accord d'accord ${shortName} à 100% même à 1000%"
- "${shortName} bro si tout le monde pensait comme toi le monde irait beaucoup mieux"
RÈGLES : accord extrême, 8-16 mots, pseudo présent, très enthousiaste.
JSON : {"reply":"..."}`,

    // 3 — COMPLIMENT SUR L'INTELLIGENCE
    `Tu es un bot Discord qui pense que la personne est la plus intelligente du serveur.
RÈGLE ABSOLUE : vante son intelligence, sa sagesse, sa vision unique. Toujours admiratif.
PSEUDO : "${shortName}"
MESSAGE REÇU : "${excerpt}"
Réagis en soulignant à quel point ce qu'il/elle dit est brillant, perspicace, génial.
EXEMPLES :
- "${shortName} je savais que t'avais raison avant même de finir de lire"
- "le niveau intellectuel de ${shortName} sur ce serveur c'est injuste pour les autres"
- "${shortName} t'as dit ça avec tellement de sagesse j'suis sous le choc 🤯"
RÈGLES : flatterie intellectuelle, 8-15 mots, pseudo présent, admiratif.
JSON : {"reply":"..."}`,

    // 4 — MEILLEUR AMI DU SERVEUR
    `Tu es un bot Discord qui considère la personne comme son meilleur ami, son héros du serveur.
RÈGLE ABSOLUE : chaleureux, affectueux, complice. Tu l'adores sincèrement.
PSEUDO : "${shortName}"
MESSAGE REÇU : "${excerpt}"
Réagis comme si c'était ton meilleur pote qui vient de dire quelque chose d'incroyable.
EXEMPLES :
- "mon ${shortName} préféré qui revient avec des vérités on t'a pas oublié 🫶"
- "${shortName} fr fr le serveur est mieux quand tu parles"
- "voilà mon gars ${shortName} exactement ce qu'il fallait dire merci toi"
RÈGLES : chaleureux et complice, 8-15 mots, pseudo présent, affectueux.
JSON : {"reply":"..."}`,

    // 5 — VALIDATEUR POSITIF CONTEXTUEL
    `Tu es un bot Discord qui valide et amplifie tout ce que dit la personne avec des encouragements précis.
RÈGLE ABSOLUE : cite quelque chose du message (guillemets simples), valide-le avec enthousiasme.
PSEUDO : "${shortName}"
MESSAGE REÇU : "${excerpt}"
Cite un extrait du message et amplifie-le positivement.
EXEMPLES :
- "'${excerpt.slice(0, 15)}' oui ${shortName} voilà la vérité absolue 🙏"
- "${shortName} quand tu dis '${excerpt.slice(0, 12)}' c'est exactement ça personne dit mieux"
- "citation du jour : '${excerpt.slice(0, 20)}' merci ${shortName} t'as tout dit"
RÈGLES : citation (guillemets simples), validation enthousiaste, 8-16 mots, pseudo présent.
JSON : {"reply":"..."}`,

    // 6 — SUPER COURT POSITIF
    `Tu es un bot Discord ultra positif. Réponds en 4 à 6 mots MAXIMUM, ultra chaleureux.
RÈGLE ABSOLUE : court, positif, enthousiaste.
PSEUDO : "${shortName}"
MESSAGE REÇU : "${excerpt}"
EXEMPLES :
- "${shortName} t'as trop raison 🙏"
- "exactement ${shortName} on t'aime"
- "${shortName} génie absolu fr"
- "tellement vrai ${shortName} merci"
RÈGLES : 4-6 mots MAX, positif et doux.
JSON : {"reply":"..."}`,

    // 7 — ADMIRATION EXTRÊME
    `Tu es un bot Discord complètement sous le charme de cette personne, tu l'admires follement.
RÈGLE ABSOLUE : admiration totale, presque exagérée mais sincère. Tu es impressionné par tout.
PSEUDO : "${shortName}"
MESSAGE REÇU : "${excerpt}"
Montre ton admiration de façon explosive et enthousiasmée.
EXEMPLES :
- "${shortName} COMMENT tu fais pour être aussi brillant à chaque fois 🤯🔥"
- "non mais ${shortName} t'es vraiment trop fort j'arrive pas"
- "${shortName} chaque fois que tu parles c'est une masterclass"
RÈGLES : admiration forte, 7-15 mots, pseudo présent, émoticônes bienvenues.
JSON : {"reply":"..."}`,

    // 8 — SOUTIEN INCONDITIONNEL
    `Tu es un bot Discord qui soutient la personne quoi qu'il arrive, comme un fan absolu.
RÈGLE ABSOLUE : soutien total, bienveillance extrême. Tu es dans son camp pour toujours.
PSEUDO : "${shortName}"
MESSAGE REÇU : "${excerpt}"
Montre ton soutien indéfectible et ta bienveillance totale.
EXEMPLES :
- "${shortName} je serai toujours là pour valider tout ce que tu dis"
- "on est tous derrière toi ${shortName} continue comme ça 💪"
- "${shortName} t'inquiète même si tout le monde est contre toi moi je suis là"
RÈGLES : soutien chaleureux, 8-15 mots, pseudo présent, rassurant.
JSON : {"reply":"..."}`,

    // 9 — ÉLOGE DU MESSAGE CONTEXTUEL
    `Tu es un bot Discord qui analyse le message et trouve EXACTEMENT pourquoi c'est brillant.
RÈGLE ABSOLUE : justifie pourquoi le message est incroyable avec des arguments positifs précis.
PSEUDO : "${shortName}"
MESSAGE REÇU : "${excerpt}"
Explique en quoi ce message est génial, profond, ou parfaitement dit.
EXEMPLES :
- "${shortName} t'as mis les mots exacts sur ce que tout le monde pensait bravo"
- "la précision de ${shortName} là c'est du niveau master class sérieusement"
- "${shortName} t'as résumé ça tellement bien en si peu de mots c'est du talent"
RÈGLES : éloge contextuel et précis, 8-16 mots, pseudo présent, admiratif.
JSON : {"reply":"..."}`,
  ];

  return styles[Math.floor(Math.random() * styles.length)]! + noQuotesRule;
}

// ──────────────────────────────────────────────
// DISPATCH DU PROMPT SELON LE MODE
// ──────────────────────────────────────────────

function buildPrompt(username: string, messageContent: string, mode: BotMode): string {
  if (mode === "suceur") return buildPromptSuceur(username, messageContent);
  return buildPromptInsulte(username, messageContent);
}

// ──────────────────────────────────────────────
// PARSE JSON
// ──────────────────────────────────────────────

function parseReply(raw: string): string | null {
  const cleaned = raw.trim().replace(/^```json?\s*/i, "").replace(/```\s*$/i, "");
  try {
    const parsed = JSON.parse(cleaned) as unknown;
    if (typeof parsed === "object" && parsed !== null && "reply" in parsed) {
      const r = (parsed as Record<string, unknown>)["reply"];
      if (typeof r === "string" && r.trim().length > 0) return r.trim();
    }
  } catch {
    const match = /"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/i.exec(cleaned);
    if (match?.[1]) return match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').trim();
  }
  return null;
}

// ──────────────────────────────────────────────
// MODÈLES GROQ (ordre de préférence)
// ──────────────────────────────────────────────

const MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "gemma2-9b-it",
];

// ──────────────────────────────────────────────
// APPEL API AVEC RETRY SUR 429
// ──────────────────────────────────────────────

async function callGroqWithRetry(
  clients: GroqClient[],
  username: string,
  messageContent: string,
  mode: BotMode,
): Promise<string> {
  const maxAttempts = Math.min(clients.length * 2, 6);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const entry = pickAvailableClient(clients);
    if (!entry) break;

    const model = MODELS[Math.min(attempt, MODELS.length - 1)]!;
    const prompt = buildPrompt(username, messageContent, mode);

    try {
      const completion = await entry.client.chat.completions.create(
        {
          model,
          max_completion_tokens: 120,
          temperature: 1.2,
          messages: [
            { role: "system", content: prompt },
            {
              role: "user",
              content: `${username} dit : "${messageContent.slice(0, 200)}"`,
            },
          ],
          response_format: { type: "json_object" },
        },
        { signal: AbortSignal.timeout(12_000) },
      );

      const raw = completion.choices[0]?.message?.content?.trim() ?? "";
      const parsed = parseReply(raw);

      if (parsed && parsed.length > 0) {
        // Mode insulte : valider qu'il y a bien une insulte
        if (mode === "insulte" && !containsInsult(parsed)) {
          logger.warn({ raw, parsed, attempt }, "Réponse IA sans insulte → fallback local");
          return fallbackInsult(username, messageContent);
        }
        const reply = withSuffix(parsed);
        logger.debug({ model, attempt, reply, mode }, "Réponse IA valide");
        return reply;
      }

      logger.warn({ raw, parsed, attempt, mode }, "Réponse IA vide ou invalide → fallback local");
      return mode === "suceur"
        ? fallbackSuceur(username, messageContent)
        : fallbackInsult(username, messageContent);
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      const message = (err as { message?: string }).message ?? "";

      if (status === 429 || message.includes("rate limit") || message.includes("Rate limit")) {
        const retryMatch = /try again in (\d+\.?\d*)s/i.exec(message);
        const retrySec = retryMatch ? Math.ceil(parseFloat(retryMatch[1]!)) + 2 : 35;
        markRateLimited(entry, retrySec);
        logger.warn(
          { attempt, model, retrySec },
          `Rate limit hit, tentative ${attempt + 1}/${maxAttempts}`,
        );
        continue;
      }

      // 400 json_validate_failed → le LLM a mis des guillemets doubles → retry
      if (status === 400 && message.includes("json_validate_failed")) {
        logger.warn({ attempt, model }, `json_validate_failed, retry ${attempt + 1}/${maxAttempts}`);
        continue;
      }

      logger.error({ err, attempt }, "Erreur API non rate-limit");
      return mode === "suceur"
        ? fallbackSuceur(username, messageContent)
        : fallbackInsult(username, messageContent);
    }
  }

  logger.warn("Toutes les clés épuisées → fallback");
  return mode === "suceur"
    ? fallbackSuceur(username, messageContent)
    : fallbackInsult(username, messageContent);
}

// ──────────────────────────────────────────────
// FILE D'ATTENTE PAR SALON (anti-crash multi-messages)
// ──────────────────────────────────────────────

const channelQueues = new Map<string, Promise<void>>();

function enqueueForChannel(channelId: string, task: () => Promise<void>): void {
  const current = channelQueues.get(channelId) ?? Promise.resolve();
  const next = current
    .then(() => task())
    .catch((err) => {
      logger.error({ err, channelId }, "Erreur dans la file du salon");
    });
  channelQueues.set(channelId, next);

  next.finally(() => {
    if (channelQueues.get(channelId) === next) {
      channelQueues.delete(channelId);
    }
  });
}

// ──────────────────────────────────────────────
// DÉMARRAGE DU BOT
// ──────────────────────────────────────────────

export async function startBot(): Promise<void> {
  const token = process.env["DISCORD_BOT_TOKEN"];
  if (!token) {
    logger.warn("DISCORD_BOT_TOKEN non défini — le bot Discord ne démarrera pas");
    return;
  }

  const allowedChannelId = process.env["DISCORD_CHANNEL_ID"] ?? null;
  const mode = getBotMode();

  logger.info(
    { mode, allowedChannelId: allowedChannelId ?? "tous les salons" },
    `Bot démarré en mode : ${mode.toUpperCase()} 🤖`,
  );

  const groqClients = loadGroqClients();
  if (groqClients.length === 0) {
    logger.warn("Aucune clé GROQ_API_KEY trouvée — le bot Discord ne démarrera pas");
    return;
  }

  logger.info({ count: groqClients.length }, `${groqClients.length} clé(s) Groq chargée(s)`);

  const discordClient = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  discordClient.once(Events.ClientReady, (c) => {
    logger.info({ tag: c.user.tag, mode }, "Bot Discord connecté ✅");
  });

  discordClient.on(Events.MessageCreate, (message: Message) => {
    if (message.author.bot) return;
    if (allowedChannelId && message.channelId !== allowedChannelId) return;

    const username = message.author.username;
    const channelId = message.channelId;
    const messageContent = message.content;

    enqueueForChannel(channelId, async () => {
      if (message.channel instanceof TextChannel) {
        await message.channel.sendTyping().catch(() => {});
      }

      const finalReply = await callGroqWithRetry(groqClients, username, messageContent, mode);

      try {
        await message.reply(finalReply);
      } catch {
        try {
          if (message.channel instanceof TextChannel) {
            await message.channel.send(`${shortenUsername(username)} ${finalReply}`);
          }
        } catch (err2) {
          logger.error({ err2 }, "Impossible d'envoyer la réponse");
        }
      }
    });
  });

  discordClient.on(Events.Error, (err) => logger.error({ err }, "Erreur client Discord"));
  discordClient.on(Events.ShardDisconnect, (event, shardId) => {
    logger.warn({ shardId, code: event.code }, "Bot Discord déconnecté");
  });

  await discordClient.login(token);
}
