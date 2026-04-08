<<<<<<< HEAD
# ExamDemo — Setup in 20 Minuten

## Was du bekommst
Vollständige Demo einer digitalen Prüfungsplattform:
- **Lehrer**: Exam erstellen, Fragen aus CSV-Pool ziehen, Live-Monitoring, Grading, CSV-Export
- **Schüler**: Per Exam Key eintreten, Prüfung ablegen, Anti-Cheat-Events werden geloggt
- **Online**: Vercel-Link zum Teilen mit Entscheidern

---

## Schritt 1 — Supabase Projekt anlegen (5 Min)

1. Gehe zu [supabase.com](https://supabase.com) → "New Project"
2. Name: `examdemo`, Region: **Frankfurt (eu-central-1)**, Passwort merken
3. Warte bis Projekt ready (~2 Min)
4. Gehe zu **SQL Editor** → "New Query"
5. Kopiere den Inhalt von `supabase-schema.sql` → Ausführen (Run)
6. Gehe zu **Project Settings → API**:
   - Kopiere `Project URL` → das ist deine `SUPABASE_URL`
   - Kopiere `anon public` Key → das ist dein `ANON_KEY`
   - Kopiere `service_role` Key → das ist dein `SERVICE_ROLE_KEY`

---

## Schritt 2 — Claude Code starten (2 Min)

```bash
# Neuen Ordner erstellen
mkdir examdemo && cd examdemo

# Diese Dateien hier reinkopieren:
# - CLAUDE.md
# - MASTER_PROMPT.md
# - example-questions.csv

# Claude Code starten
claude
```

Im Claude Code Interface: **Inhalt von MASTER_PROMPT.md komplett einfügen und Enter**.

Claude Code baut jetzt das gesamte Projekt (~10-15 Minuten).

---

## Schritt 3 — Env-Variablen setzen (1 Min)

Nach dem Build:
```bash
# .env.local editieren (Claude Code hat die Datei angelegt)
nano .env.local
```

Deine Werte von Supabase eintragen:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
```

---

## Schritt 4 — Lokal testen (2 Min)

```bash
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000)

**Demo-Flow testen:**
1. → /teacher → "Neue Prüfung erstellen"
2. → Fragenkatalog → `example-questions.csv` importieren
3. → Exam öffnen → Fragen aus Pool ziehen
4. → Exam Key notieren (z.B. `ABCDEF`)
5. → Neues Fenster → /student → Key eingeben → Prüfung ablegen
6. → /teacher/exam/[id]/monitor → Live-Status sehen
7. → /teacher/exam/[id]/grade → Korrigieren + CSV exportieren

---

## Schritt 5 — Auf Vercel deployen (3 Min)

```bash
# Vercel CLI installieren falls nötig
npm i -g vercel

# Deployen
vercel

# Env-Variablen in Vercel setzen:
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY

# Production Deploy
vercel --prod
```

Du bekommst einen Link wie `https://examdemo-xyz.vercel.app` — den mit Entscheidern teilen.

---

## Falls Claude Code etwas falsch baut

```bash
# Gezielter Fix-Prompt:
claude "Die Monitoring-Seite zeigt keinen Realtime-Update. 
Überprüfe die Supabase Realtime Subscription in 
app/teacher/exam/[id]/monitor/page.tsx"
```

Immer **spezifisch** sein: Dateiname + konkretes Problem.

---

## CSV-Format für eigene Fragen

Spalten: `category,type,prompt,option_a,option_b,option_c,option_d,correct_answer,points,tags`

- `type`: `mcq` | `short_answer` | `free_text`
- `correct_answer`: bei MCQ der Buchstabe (a/b/c/d), sonst der erwartete Text
- `tags`: Semikolon-getrennt, z.B. `Grundlagen;Klasse10`
- Bei `short_answer` / `free_text`: option_a–d leer lassen

Beispiel-Datei: `example-questions.csv` (20 Fragen aus 5 Fächern)

---

## Gesamtkosten für die Demo

| Service | Kosten |
|---------|--------|
| Supabase Free Tier | 0€ |
| Vercel Free Tier | 0€ |
| Claude Code | ~5–10€ (einmalig für Build) |
| **Gesamt** | **~5–10€** |
=======
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
>>>>>>> 4be6f85 (Initial commit from Create Next App)
