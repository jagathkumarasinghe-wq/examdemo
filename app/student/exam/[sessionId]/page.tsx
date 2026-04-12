'use client'

import { useEffect, useState, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import type { ExamSession, Question, Exam, MCQOption } from '@/lib/types'

export default function ExamRunnerPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params)
  const router = useRouter()

  const [session, setSession] = useState<ExamSession | null>(null)
  const [exam, setExam] = useState<Exam | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const savingRef = useRef<Record<string, NodeJS.Timeout>>({})

  useEffect(() => {
    loadSession()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [sessionId])

  useEffect(() => {
    if (!exam || !session) return

    // Anti-cheat event listeners
    const sendEvent = async (event_type: string) => {
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, event_type }),
      })
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') sendEvent('tab_switch')
    }
    const handleBlur = () => sendEvent('blur')
    const handleCopy = () => {
      if (exam.security_level >= 2) sendEvent('copy')
    }
    const handlePaste = () => {
      if (exam.security_level >= 2) sendEvent('paste')
    }
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && exam.security_level >= 3) sendEvent('fullscreen_exit')
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('blur', handleBlur)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('paste', handlePaste)
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    // Request fullscreen for level 3
    if (exam.security_level === 3 && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {})
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('paste', handlePaste)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [exam, session, sessionId])

  async function loadSession() {
    const sessionRes = await fetch(`/api/sessions/${sessionId}`)
    const sessionData = await sessionRes.json()

    if (sessionData.error || !sessionData.id) {
      toast.error('Session nicht gefunden')
      router.push('/student')
      return
    }

    if (sessionData.status === 'submitted' || sessionData.status === 'graded') {
      setSubmitted(true)
      setSession(sessionData)
      setLoading(false)
      return
    }

    setSession(sessionData)
    const examData = sessionData.exam as Exam
    setExam(examData)

    const questionsRes = await fetch(`/api/questions?exam_id=${examData.id}`)
    const questionsData = await questionsRes.json()
    let qs: Question[] = Array.isArray(questionsData) ? questionsData : []

    if (examData.randomize_questions) {
      qs = [...qs].sort(() => Math.random() - 0.5)
    }
    setQuestions(qs)

    // Load existing submissions
    const subsRes = await fetch(`/api/submissions?session_id=${sessionId}`)
    const subsData = await subsRes.json()
    if (Array.isArray(subsData)) {
      const saved: Record<string, string> = {}
      subsData.forEach((s: { question_id: string; answer: string }) => {
        saved[s.question_id] = s.answer
      })
      setAnswers(saved)
    }

    // Start timer
    const startedAt = new Date(sessionData.started_at).getTime()
    const timeLimitMs = examData.time_limit_minutes * 60 * 1000
    const elapsed = Date.now() - startedAt
    const remaining = Math.max(0, Math.floor((timeLimitMs - elapsed) / 1000))
    setTimeLeft(remaining)

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 0) {
          clearInterval(timerRef.current!)
          handleSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    setLoading(false)
  }

  function debounceSave(questionId: string, answer: string) {
    if (savingRef.current[questionId]) clearTimeout(savingRef.current[questionId])
    savingRef.current[questionId] = setTimeout(() => {
      fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, question_id: questionId, answer }),
      })
    }, 800)
  }

  function setAnswer(questionId: string, answer: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
    debounceSave(questionId, answer)
  }

  async function handleSubmit() {
    if (submitting || submitted) return
    setSubmitting(true)
    if (timerRef.current) clearInterval(timerRef.current)

    // Save all pending answers
    const current = questions[currentIndex]
    if (current && answers[current.id] !== undefined) {
      await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, question_id: current.id, answer: answers[current.id] || '' }),
      })
    }

    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'submitted', submitted_at: new Date().toISOString() }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (data.error) { toast.error(data.error); return }
    setSubmitted(true)
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Prüfung wird geladen...</p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center space-y-4 p-8">
          <div className="text-6xl">✓</div>
          <h1 className="text-2xl font-bold text-green-600">Prüfung abgegeben!</h1>
          <p className="text-gray-500">
            Deine Antworten wurden erfolgreich gespeichert.
          </p>
          <Button variant="outline" onClick={() => router.push('/')}>
            Zur Startseite
          </Button>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentIndex]
  const answeredCount = questions.filter((q) => answers[q.id]?.trim()).length
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0
  const isLowTime = timeLeft !== null && timeLeft < 300 // 5 minutes

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="font-semibold">{exam?.title}</h1>
          <p className="text-xs text-gray-500">{session?.student_name}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className={`font-mono text-lg font-bold ${isLowTime ? 'text-red-600 animate-pulse' : 'text-gray-700'}`}>
            {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
          </span>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            variant="destructive"
            size="sm"
          >
            {submitting ? 'Abgabe...' : 'Abgeben'}
          </Button>
        </div>
      </header>

      {/* Progress */}
      <div className="bg-white border-b px-6 py-2">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <span className="text-xs text-gray-500 whitespace-nowrap">{answeredCount}/{questions.length} beantwortet</span>
          <Progress value={progress} className="flex-1 h-2" />
        </div>
      </div>

      <div className="flex flex-1 max-w-5xl mx-auto w-full gap-0">
        {/* Question nav sidebar */}
        <div className="w-16 border-r bg-white flex flex-col gap-1 p-2 overflow-y-auto">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={`w-10 h-10 rounded text-xs font-medium mx-auto block transition-colors ${
                i === currentIndex
                  ? 'bg-blue-600 text-white'
                  : answers[q.id]?.trim()
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Question area */}
        <div className="flex-1 p-6">
          {currentQuestion ? (
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Frage {currentIndex + 1} von {questions.length}</span>
                <Badge variant="outline">{currentQuestion.type}</Badge>
                <span className="text-sm text-gray-400">{currentQuestion.points} Punkt{currentQuestion.points !== 1 ? 'e' : ''}</span>
              </div>

              <Card>
                <CardContent className="pt-4">
                  <p className="text-base font-medium leading-relaxed">{currentQuestion.prompt}</p>
                </CardContent>
              </Card>

              {/* MCQ */}
              {currentQuestion.type === 'mcq' && currentQuestion.options && (
                <div className="space-y-2">
                  {(currentQuestion.options as MCQOption[]).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setAnswer(currentQuestion.id, opt.value)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        answers[currentQuestion.id] === opt.value
                          ? 'border-blue-500 bg-blue-50 text-blue-800'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="font-medium mr-2">{opt.label}.</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Short answer */}
              {currentQuestion.type === 'short_answer' && (
                <input
                  type="text"
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => setAnswer(currentQuestion.id, e.target.value)}
                  placeholder="Antwort eingeben..."
                  className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}

              {/* Free text */}
              {currentQuestion.type === 'free_text' && (
                <Textarea
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => setAnswer(currentQuestion.id, e.target.value)}
                  placeholder="Ausführliche Antwort eingeben..."
                  rows={6}
                  className="resize-none"
                />
              )}

              <div className="flex justify-between pt-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                >
                  ← Zurück
                </Button>
                <Button
                  onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
                  disabled={currentIndex === questions.length - 1}
                >
                  Weiter →
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Keine Fragen vorhanden.</p>
          )}
        </div>
      </div>
    </div>
  )
}
