'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import type { ExamSession, Submission } from '@/lib/types'

export default function GradePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [sessions, setSessions] = useState<ExamSession[]>([])
  const [selectedSession, setSelectedSession] = useState<string>('')
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [examTitle, setExamTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  // Per-submission editable state
  const [edits, setEdits] = useState<Record<string, { manual_score: string; feedback: string }>>({})

  useEffect(() => {
    loadData()
  }, [id])

  useEffect(() => {
    if (selectedSession) loadSubmissions(selectedSession)
    else setSubmissions([])
  }, [selectedSession])

  async function loadData() {
    const [sessionsRes, examRes] = await Promise.all([
      fetch(`/api/sessions?exam_id=${id}`),
      fetch(`/api/exams/${id}`),
    ])
    const sessionsData = await sessionsRes.json()
    const examData = await examRes.json()
    const allSessions = Array.isArray(sessionsData) ? sessionsData : []
    setSessions(allSessions)
    if (examData.title) setExamTitle(examData.title)
    // Auto-select first submitted session
    const first = allSessions.find((s: ExamSession) => s.status !== 'active')
    if (first) setSelectedSession(first.id)
    setLoading(false)
  }

  async function loadSubmissions(sessionId: string) {
    const res = await fetch(`/api/submissions?session_id=${sessionId}`)
    const data = await res.json()
    if (Array.isArray(data)) {
      setSubmissions(data)
      const initial: Record<string, { manual_score: string; feedback: string }> = {}
      data.forEach((sub: Submission) => {
        initial[sub.id] = {
          manual_score: sub.manual_score != null ? String(sub.manual_score) : '',
          feedback: sub.feedback || '',
        }
      })
      setEdits(initial)
    }
  }

  async function saveGrade(submissionId: string) {
    setSaving(submissionId)
    const edit = edits[submissionId]
    const res = await fetch('/api/grade', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submission_id: submissionId,
        manual_score: edit.manual_score !== '' ? parseFloat(edit.manual_score) : null,
        feedback: edit.feedback || null,
      }),
    })
    const data = await res.json()
    setSaving(null)
    if (data.error) { toast.error(data.error); return }
    toast.success('Gespeichert')
    setSubmissions((prev) => prev.map((s) => s.id === submissionId ? data : s))
  }

  async function exportCSV() {
    const res = await fetch(`/api/grade?exam_id=${id}`)
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) { toast.error('Keine Daten'); return }

    const headers = Object.keys(data[0])
    const csv = [
      headers.join(','),
      ...data.map((row: Record<string, unknown>) =>
        headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${examTitle}_ergebnisse.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exportiert')
  }

  function scoreColor(score: number | null, max: number) {
    if (score === null) return ''
    const pct = score / max
    if (pct >= 0.75) return 'text-green-600'
    if (pct >= 0.5) return 'text-yellow-600'
    return 'text-red-600'
  }

  const totalScore = submissions.reduce((sum, s) => {
    const score = s.manual_score ?? s.auto_score
    return sum + (score ?? 0)
  }, 0)
  const maxScore = submissions.reduce((sum, s) => sum + (s.question?.points ?? 0), 0)

  if (loading) return <div className="flex items-center justify-center min-h-screen">Lädt...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/teacher/exam/${id}`} className="text-sm text-gray-500 hover:text-gray-700">← Prüfung</Link>
          <span className="text-gray-300">|</span>
          <h1 className="font-semibold">Bewertung: {examTitle}</h1>
        </div>
        <Button onClick={exportCSV} variant="outline" size="sm">CSV exportieren</Button>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-1">
            <Label>Schüler auswählen</Label>
            <Select value={selectedSession} onValueChange={(v) => setSelectedSession(v ?? '')}>
              <SelectTrigger className="w-72">
                <SelectValue placeholder="Schüler wählen..." />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.student_name} — {s.status === 'active' ? 'noch aktiv' : s.status === 'submitted' ? 'abgegeben' : 'bewertet'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedSession && submissions.length > 0 && (
            <div className="text-right">
              <p className="text-2xl font-bold">{totalScore} / {maxScore}</p>
              <p className="text-sm text-gray-500">Gesamtpunkte</p>
            </div>
          )}
        </div>

        {selectedSession && submissions.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              Noch keine Antworten für diesen Schüler.
            </CardContent>
          </Card>
        )}

        {submissions.map((sub, i) => {
          const q = sub.question
          const edit = edits[sub.id] || { manual_score: '', feedback: '' }
          const displayScore = sub.manual_score ?? sub.auto_score

          return (
            <Card key={sub.id}>
              <CardContent className="py-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">
                      Frage {i + 1} · <Badge variant="outline">{q?.type}</Badge> · {q?.points} Punkt{q?.points !== 1 ? 'e' : ''}
                    </p>
                    <p className="font-medium">{q?.prompt}</p>
                  </div>
                  <div className={`text-lg font-bold ${scoreColor(displayScore, q?.points ?? 1)}`}>
                    {displayScore != null ? `${displayScore}/${q?.points}` : '—'}
                  </div>
                </div>

                <div className="bg-gray-50 rounded p-3">
                  <p className="text-sm text-gray-500 mb-1">Antwort des Schülers:</p>
                  <p className="text-sm whitespace-pre-wrap">{sub.answer || <span className="italic text-gray-400">Keine Antwort</span>}</p>
                </div>

                {sub.auto_score != null && (
                  <p className="text-xs text-gray-400">Auto-Score: {sub.auto_score}</p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Manuelle Punktzahl</Label>
                    <Input
                      type="number"
                      min={0}
                      max={q?.points}
                      step={0.5}
                      value={edit.manual_score}
                      onChange={(e) => setEdits({ ...edits, [sub.id]: { ...edit, manual_score: e.target.value } })}
                      placeholder={`0–${q?.points}`}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Feedback</Label>
                    <Input
                      value={edit.feedback}
                      onChange={(e) => setEdits({ ...edits, [sub.id]: { ...edit, feedback: e.target.value } })}
                      placeholder="Optionales Feedback..."
                      className="h-8"
                    />
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => saveGrade(sub.id)}
                  disabled={saving === sub.id}
                >
                  {saving === sub.id ? 'Speichert...' : 'Speichern'}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </main>
    </div>
  )
}
