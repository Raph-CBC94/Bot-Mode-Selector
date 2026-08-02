import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

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
        </div>
      </section>

      <section class="step">
        <h2>2. Dans Render</h2>
        <p>Va dans <strong>Environment</strong>, puis ajoute ou modifie :</p>
        <code>BOT_MODE=vantard</code>
        <p>Remplace <code>vantard</code> par <code>insulte</code> ou <code>suceur</code> pour choisir une autre personnalité.</p>
      </section>

      <section class="step">
        <h2>3. Redémarre le service</h2>
        <p>Après avoir sauvegardé la variable, redéploie ou redémarre le service Render pour appliquer le changement.</p>
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
