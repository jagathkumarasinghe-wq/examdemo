-- ExamDemo Schema
-- Alle Tabellen ohne RLS (Demo-Modus)
-- In Supabase SQL Editor ausführen

-- Question Bank (Fragenpool)
create table if not exists question_bank (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'Allgemein',
  type text not null check (type in ('mcq', 'short_answer', 'free_text')),
  prompt text not null,
  options jsonb,
  correct_answer text,
  points int not null default 1,
  source_file text,
  tags text[] default '{}',
  created_at timestamptz default now()
);

-- Exams
create table if not exists exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  security_level int not null default 1,
  exam_key text unique not null,
  time_limit_minutes int not null default 60,
  randomize_questions boolean not null default true,
  created_at timestamptz default now()
);

-- Questions (Fragen in einem Exam)
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  question_bank_id uuid references question_bank(id),
  type text not null check (type in ('mcq', 'short_answer', 'free_text', 'matching')),
  prompt text not null,
  options jsonb,
  correct_answer text,
  points int not null default 1,
  order_index int not null default 0,
  created_at timestamptz default now()
);

-- Exam Sessions (eine pro Schüler)
create table if not exists exam_sessions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id),
  student_name text not null,
  started_at timestamptz default now(),
  submitted_at timestamptz,
  status text not null default 'active' check (status in ('active', 'submitted', 'graded')),
  event_count int not null default 0
);

-- Submissions (Antworten)
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references exam_sessions(id) on delete cascade,
  question_id uuid not null references questions(id),
  answer text,
  auto_score numeric,
  manual_score numeric,
  feedback text,
  created_at timestamptz default now(),
  unique(session_id, question_id)
);

-- Exam Events (Anti-Cheat Telemetrie)
create table if not exists exam_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references exam_sessions(id) on delete cascade,
  event_type text not null,
  created_at timestamptz default now()
);

-- RLS komplett deaktivieren (Demo)
alter table question_bank disable row level security;
alter table exams disable row level security;
alter table questions disable row level security;
alter table exam_sessions disable row level security;
alter table submissions disable row level security;
alter table exam_events disable row level security;

-- Realtime für Monitoring aktivieren
alter publication supabase_realtime add table exam_sessions;
alter publication supabase_realtime add table exam_events;

-- Beispiel-Daten: Question Bank
insert into question_bank (category, type, prompt, options, correct_answer, points, tags) values
('Mathematik', 'mcq', 'Was ist 15% von 200?', '[{"label":"A","value":"a","text":"25","correct":false},{"label":"B","value":"b","text":"30","correct":true},{"label":"C","value":"c","text":"35","correct":false},{"label":"D","value":"d","text":"40","correct":false}]', 'b', 2, '{"Prozentrechnung","Grundlagen"}'),
('Mathematik', 'mcq', 'Welche Zahl ist eine Primzahl?', '[{"label":"A","value":"a","text":"9","correct":false},{"label":"B","value":"b","text":"15","correct":false},{"label":"C","value":"c","text":"17","correct":true},{"label":"D","value":"d","text":"21","correct":false}]', 'c', 1, '{"Primzahlen"}'),
('Mathematik', 'short_answer', 'Wie lautet die Formel für den Flächeninhalt eines Kreises?', null, 'πr²', 2, '{"Geometrie","Formeln"}'),
('Deutsch', 'mcq', 'Welches Wort ist ein Adjektiv?', '[{"label":"A","value":"a","text":"laufen","correct":false},{"label":"B","value":"b","text":"Schule","correct":false},{"label":"C","value":"c","text":"schnell","correct":true},{"label":"D","value":"d","text":"weil","correct":false}]', 'c', 1, '{"Wortarten"}'),
('Deutsch', 'free_text', 'Beschreibe den Unterschied zwischen Metapher und Vergleich und gib je ein Beispiel.', null, null, 4, '{"Stilmittel","Aufsatz"}'),
('Biologie', 'mcq', 'Welches Organell ist für die Energieproduktion in der Zelle zuständig?', '[{"label":"A","value":"a","text":"Zellkern","correct":false},{"label":"B","value":"b","text":"Ribosom","correct":false},{"label":"C","value":"c","text":"Mitochondrium","correct":true},{"label":"D","value":"d","text":"Vakuole","correct":false}]', 'c', 1, '{"Zellbiologie"}'),
('Biologie', 'short_answer', 'Was versteht man unter Photosynthese?', null, 'Umwandlung von Lichtenergie in chemische Energie durch Pflanzen', 3, '{"Stoffwechsel"}'),
('Geschichte', 'mcq', 'In welchem Jahr begann der Erste Weltkrieg?', '[{"label":"A","value":"a","text":"1912","correct":false},{"label":"B","value":"b","text":"1914","correct":true},{"label":"C","value":"c","text":"1916","correct":false},{"label":"D","value":"d","text":"1918","correct":false}]', 'b', 1, '{"Weltkriege","Daten"}'),
('Geschichte', 'free_text', 'Erläutere die wichtigsten Ursachen des Ersten Weltkriegs.', null, null, 5, '{"Weltkriege","Ursachen"}');
