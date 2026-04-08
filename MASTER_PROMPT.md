# Claude Code Master-Prompt — ExamDemo

Kopiere diesen gesamten Text und führe ihn als ersten Prompt in Claude Code aus.
Claude Code liest CLAUDE.md automatisch und baut das gesamte Projekt.

---

Baue eine vollständige Next.js 14 Demo-App für eine digitale Prüfungsplattform (exam.net-Ersatz).
Die CLAUDE.md in diesem Verzeichnis enthält alle Architektur-Details — bitte zuerst lesen.

## Setup-Schritte die du ausführen sollst:

1. `npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"`
2. `npx shadcn@latest init -d`
3. `npm install @supabase/supabase-js papaparse @types/papaparse date-fns`
4. Shadcn-Komponenten installieren: `npx shadcn@latest add button card input label table badge dialog select textarea toast progress separator`

## Umgebungsvariablen (.env.local)

Erstelle .env.local mit Platzhaltern:
```
NEXT_PUBLIC_SUPABASE_URL=DEINE_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=DEIN_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=DEIN_SERVICE_ROLE_KEY
```

## Dateien die du erstellen sollst:

### lib/supabase.ts
Supabase-Client für Frontend (anon key) und Admin-Client (service role) für API-Routes.

### lib/utils.ts  
Hilfsfunktionen:
- `generateExamKey()` → 6 zufällige Großbuchstaben
- `calculateAutoScore(question, answer)` → Punkte für MCQ/short_answer
- `parseCSVToQuestions(csvText)` → Question-Bank-Objekte aus CSV

### app/page.tsx — Landing Page
Zwei große Buttons: "Prüfung erstellen (Lehrer)" → /teacher | "Prüfung ablegen (Schüler)" → /student
Einfaches, klares Design. Zeige kurze Feature-Liste.

### app/teacher/page.tsx — Lehrer-Dashboard
Tabs: "Meine Prüfungen" | "Fragenkatalog"

**Tab Meine Prüfungen:**
- Liste aller Exams mit Titel, Exam Key (groß, kopierbar), Anzahl Fragen, Anzahl Sessions
- Button "Neue Prüfung erstellen" → öffnet Dialog
- Dialog: Titel, Beschreibung, Zeitlimit, Sicherheitsstufe (1-3), Randomisierung
- Beim Erstellen: exam_key auto-generieren, in DB speichern
- Jeder Exam-Eintrag: Links zu "Bearbeiten", "Monitoring", "Korrigieren"

**Tab Fragenkatalog:**
- CSV-Upload Button: Datei auswählen → papaparse → Preview-Tabelle → "Importieren" Button
- Zeige importierte Fragen mit Filter nach Kategorie und Typ
- Tabelle: Kategorie, Typ-Badge, Frage (gekürzt), Punkte, Tags

### app/teacher/exam/[id]/page.tsx — Exam Editor
**Abschnitt 1: Aus Fragenpool ziehen**
- Kategorie auswählen (Dropdown mit allen verfügbaren Kategorien)
- Anzahl Fragen eingeben
- "Zufällig ziehen" Button → zeigt Preview der gezogenen Fragen
- "Manuell auswählen" → Tabelle mit Checkboxen
- "Zum Exam hinzufügen" Button

**Abschnitt 2: Frage manuell erstellen**
- Typ auswählen: MCQ / Kurzantwort / Freitext
- Bei MCQ: 4 Optionen + korrekte markieren
- Prompt, Punkte, dann Speichern

**Abschnitt 3: Aktuelle Fragen im Exam**
- Drag-sortierbare Liste (einfach mit Up/Down Buttons, kein DnD-Lib nötig)
- Fragen löschen
- Exam Key groß anzeigen mit Copy-Button

### app/teacher/exam/[id]/monitor/page.tsx — Live Monitoring
- Supabase Realtime Subscription auf exam_sessions WHERE exam_id = [id]
- Supabase Realtime Subscription auf exam_events
- Grid-Karten pro aktiver Session:
  - Schülername, Status-Badge (aktiv/eingereicht)
  - Beginn-Zeit, Zeit seit letztem Autosave
  - Event-Count mit Warnsymbol wenn > 3
  - Events aufklappbar (Tab-Wechsel, Blur, etc.)
- Auto-refresh alle 30s als Fallback
- "Prüfung beenden" Button (setzt alle aktiven Sessions auf 'submitted')

### app/teacher/exam/[id]/grade/page.tsx — Grading & Export
- Liste aller submitted Sessions
- Pro Session: Schülerinfo + Auto-Score Zusammenfassung
- "Korrigieren" öffnet Panel:
  - Pro Frage: Prompt, Antwort des Schülers, Auto-Score (wenn vorhanden)
  - Für free_text: Punkte-Eingabe (0 bis max) + Feedback-Textarea
  - Gesamtpunktzahl live berechnet, Prozentnormierung
- "Speichern & Nächster" Flow
- **CSV Export Button**: alle Sessions als CSV
  - Spalten: Name, Gesamt%, Gesamtpunkte, MaxPunkte, [pro Frage: Punkte]
  - Download-Trigger via Blob

### app/student/page.tsx — Exam Key Eingabe
- Großes Eingabefeld für 6-stelligen Key (auto-uppercase)
- Name eingeben
- "Prüfung starten" → API-Call → Session erstellen → Redirect zu /student/exam/[sessionId]
- Fehlermeldung wenn Key ungültig

### app/student/exam/[sessionId]/page.tsx — Exam Runner
**Features:**
- Lade Exam + Fragen (randomisiert wenn exam.randomize_questions=true)
- Fullscreen-Request beim Start (Fullscreen API, nicht erzwungen — nur empfohlen)
- Timer: Countdown von time_limit_minutes, bei 0 → auto-submit
- Fragen-Navigation: eine Frage auf einmal, Fortschrittsbalken
- Pro Fragetyp eigene UI:
  - MCQ: Radio-Buttons mit A/B/C/D Labels
  - short_answer: Textfeld einzeilig
  - free_text: Textarea mehrzeilig
- Autosave alle 30s → POST /api/submissions/autosave
- Anti-Cheat Events loggen (kein Alarm, nur Logging):
  - visibilitychange → 'tab_switch'
  - window blur → 'blur'  
  - copy event → 'copy'
  - paste event → 'paste'
  - fullscreenchange (wenn verlassen) → 'fullscreen_exit'
  - Alle Events: POST /api/events
- Offline-Banner wenn navigator.onLine = false
- "Abgeben" Button → Confirmation Dialog → POST /api/submit → Danke-Seite

### API Routes:

**POST /api/exams** — Exam erstellen
**GET /api/exams/[id]** — Exam + Fragen laden
**POST /api/exams/[id]/questions** — Frage hinzufügen
**DELETE /api/questions/[id]** — Frage löschen
**PATCH /api/questions/reorder** — Reihenfolge ändern

**POST /api/question-bank/import** — CSV-Fragen in question_bank importieren
**GET /api/question-bank** — Alle Fragen (mit ?category=X filter)

**POST /api/sessions/start** — Session starten (validiert exam_key, erstellt session)
**GET /api/sessions/[id]** — Session + Exam + Fragen laden

**POST /api/submissions/autosave** — Antworten speichern (upsert)
**POST /api/submit** — Exam abgeben, auto_score berechnen, status → 'submitted'
**POST /api/events** — Anti-Cheat Event loggen, event_count inkrementieren

**GET /api/grade/[examId]** — Alle Sessions + Submissions für Grading
**PATCH /api/grade/[sessionId]** — Manual scores + feedback speichern
**GET /api/export/[examId]** — CSV-String generieren und zurückgeben

## Wichtige Implementation-Details:

- Alle API-Routes: supabaseAdmin verwenden (service_role), kein Auth-Check
- Fehlerhandling: immer { error: string } zurückgeben bei Fehler
- Loading-States überall mit shadcn Skeleton oder Spinner
- Toast-Notifications für Erfolg/Fehler (shadcn toast)
- Exam Key in Student-Flow: uppercase erzwingen, Leerzeichen trimmen
- Auto-Score Logik: MCQ → correct_answer mit submitted answer vergleichen (lowercase trim), short_answer → gleiche Logik
- Randomisierung: Fisher-Yates Shuffle clientseitig auf geladene Fragen
- Realtime: useEffect mit supabase.channel() subscription, cleanup on unmount

## Was du NICHT bauen musst:
- Kein Login/Auth
- Keine RLS
- Kein SEB-Integration (Demo-Level reicht Stufe 1-2)
- Kein Video-Proctoring
- Kein Datei-Upload durch Schüler

Baue das Schritt für Schritt. Fange mit Setup + Supabase-Client + API-Routes an, dann Pages.
Bei Fragen zur Architektur: CLAUDE.md hat die Antwort.
