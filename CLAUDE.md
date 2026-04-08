# ExamDemo — Entscheidungs-Demo für exam.net Ersatz

## Zweck
Demo für interne Entscheider. KEIN echtes Auth, KEINE RLS, KEIN Prod-Sicherheitslevel.
Ziel: vollständiger User-Flow funktioniert und Daten landen in Supabase.

## Stack
- Next.js 14 App Router (TypeScript)
- Supabase (Postgres + Realtime) — alle Tabellen ohne RLS
- Tailwind CSS + shadcn/ui
- Vercel Deploy

## Wichtige Architektur-Entscheide
- Lehrer: kein Login, einfach /teacher Route direkt zugänglich
- Schüler: Exam Key (6 Zeichen) eingeben → Session startet → kein Konto
- Alle API-Routes nutzen supabaseAdmin (service_role key) — kein Auth-Check
- Kein Middleware-Auth für die Demo

## Datenmodell (Supabase Tabellen — alle public, RLS disabled)

### exams
- id uuid PK default gen_random_uuid()
- title text
- description text
- security_level int default 1  -- 1=open, 2=monitored, 3=lockdown
- exam_key text UNIQUE  -- 6-stellig, generiert beim Erstellen
- time_limit_minutes int default 60
- randomize_questions boolean default true
- created_at timestamptz default now()

### questions
- id uuid PK default gen_random_uuid()
- exam_id uuid FK → exams.id
- question_bank_id uuid FK → question_bank.id nullable  -- wenn aus Pool
- type text  -- 'mcq' | 'short_answer' | 'free_text' | 'matching'
- prompt text
- options jsonb nullable  -- für MCQ: [{label, value, correct}]
- correct_answer text nullable
- points int default 1
- order_index int
- created_at timestamptz default now()

### question_bank
- id uuid PK default gen_random_uuid()
- category text
- type text
- prompt text
- options jsonb nullable
- correct_answer text nullable
- points int default 1
- source_file text nullable  -- welche CSV importiert hat
- tags text[] default '{}'
- created_at timestamptz default now()

### exam_sessions
- id uuid PK default gen_random_uuid()
- exam_id uuid FK → exams.id
- student_name text
- started_at timestamptz default now()
- submitted_at timestamptz nullable
- status text default 'active'  -- 'active' | 'submitted' | 'graded'
- event_count int default 0  -- Anzahl verdächtiger Events

### submissions
- id uuid PK default gen_random_uuid()
- session_id uuid FK → exam_sessions.id
- question_id uuid FK → questions.id
- answer text
- auto_score numeric nullable
- manual_score numeric nullable
- feedback text nullable
- created_at timestamptz default now()

### exam_events
- id uuid PK default gen_random_uuid()
- session_id uuid FK → exam_sessions.id
- event_type text  -- 'tab_switch' | 'blur' | 'copy' | 'paste' | 'fullscreen_exit'
- created_at timestamptz default now()

## Routes
- / → Landing mit zwei Buttons: "Prüfung erstellen" | "Prüfung ablegen"
- /teacher → Exam Builder + Question Bank + Monitoring-Übersicht
- /teacher/exam/[id] → Exam Detail: Fragen verwalten, Monitoring, Grading
- /teacher/exam/[id]/monitor → Live Monitoring (Realtime)
- /teacher/exam/[id]/grade → Grading + Export
- /student → Exam Key eingeben
- /student/exam/[sessionId] → Exam Runner

## CSV-Import Format für Question Bank
Spalten: category, type, prompt, option_a, option_b, option_c, option_d, correct_answer, points, tags
- type: mcq | short_answer | free_text
- correct_answer: für MCQ der Buchstabe (a/b/c/d), für andere der Text
- tags: semikolon-getrennt

## Wichtige Features
1. CSV-Import → Question Bank mit Preview + Kategorie-Filter
2. Fragenpool: beim Erstellen eines Exams X Fragen aus Kategorien ziehen (random oder manuell)
3. Exam Key wird beim Erstellen auto-generiert (6 Großbuchstaben)
4. Realtime Monitoring: Supabase Realtime auf exam_sessions + exam_events
5. Anti-Cheat Events: visibilitychange, blur, copy, paste, fullscreenchange → in exam_events
6. Auto-Grading: MCQ + short_answer (exact match, case-insensitive)
7. Grading UI: manuelle Korrektur free_text, Punkte + Feedback pro Frage
8. Export: CSV Download mit allen Ergebnissen

## UI-Konventionen
- shadcn/ui Komponenten durchgehend
- Tailwind für Layout
- Deutsch als UI-Sprache
- Mobile-kompatibel aber Desktop-first
