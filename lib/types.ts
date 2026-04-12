export type SecurityLevel = 1 | 2 | 3

export interface Exam {
  id: string
  title: string
  description: string | null
  security_level: SecurityLevel
  exam_key: string
  time_limit_minutes: number
  randomize_questions: boolean
  created_at: string
}

export interface Question {
  id: string
  exam_id: string
  question_bank_id: string | null
  type: 'mcq' | 'short_answer' | 'free_text' | 'matching'
  prompt: string
  options: MCQOption[] | null
  correct_answer: string | null
  points: number
  order_index: number
  created_at: string
}

export interface MCQOption {
  label: string
  value: string
  correct: boolean
}

export interface QuestionBank {
  id: string
  category: string
  type: 'mcq' | 'short_answer' | 'free_text'
  prompt: string
  options: MCQOption[] | null
  correct_answer: string | null
  points: number
  source_file: string | null
  tags: string[]
  created_at: string
}

export interface ExamSession {
  id: string
  exam_id: string
  student_name: string
  started_at: string
  submitted_at: string | null
  status: 'active' | 'submitted' | 'graded'
  event_count: number
  exam?: Exam
}

export interface Submission {
  id: string
  session_id: string
  question_id: string
  answer: string
  auto_score: number | null
  manual_score: number | null
  feedback: string | null
  created_at: string
  question?: Question
}

export interface ExamEvent {
  id: string
  session_id: string
  event_type: 'tab_switch' | 'blur' | 'copy' | 'paste' | 'fullscreen_exit'
  created_at: string
}
