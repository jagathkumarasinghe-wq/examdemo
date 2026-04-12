'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import type { Exam, Question, QuestionBank, MCQOption } from '@/lib/types'

export default function ExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [exam, setExam] = useState<Exam | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [bankQuestions, setBankQuestions] = useState<QuestionBank[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // New question form
  const [newQ, setNewQ] = useState({
    type: 'mcq' as Question['type'],
    prompt: '',
    correct_answer: '',
    points: 1,
    options: [
      { label: 'A', value: 'a', correct: true },
      { label: 'B', value: 'b', correct: false },
      { label: 'C', value: 'c', correct: false },
      { label: 'D', value: 'd', correct: false },
    ] as MCQOption[],
  })

  // Draw from bank
  const [drawCategory, setDrawCategory] = useState('all')
  const [drawCount, setDrawCount] = useState(5)
  const [drawing, setDrawing] = useState(false)
  const [addingQ, setAddingQ] = useState(false)

  useEffect(() => {
    fetchAll()
  }, [id])

  async function fetchAll() {
    setLoading(true)
    const [examRes, questionsRes, bankRes] = await Promise.all([
      fetch(`/api/exams/${id}`),
      fetch(`/api/questions?exam_id=${id}`),
      fetch('/api/question-bank'),
    ])
    const examData = await examRes.json()
    const questionsData = await questionsRes.json()
    const bankData = await bankRes.json()

    setExam(examData.error ? null : examData)
    setQuestions(Array.isArray(questionsData) ? questionsData : [])
    if (Array.isArray(bankData)) {
      setBankQuestions(bankData)
      const cats = [...new Set(bankData.map((q: QuestionBank) => q.category).filter(Boolean))]
      setCategories(cats as string[])
    }
    setLoading(false)
  }

  async function addQuestion() {
    if (!newQ.prompt.trim()) { toast.error('Fragetext erforderlich'); return }
    setAddingQ(true)

    const payload: Partial<Question> = {
      exam_id: id,
      type: newQ.type,
      prompt: newQ.prompt,
      points: newQ.points,
      options: newQ.type === 'mcq' ? newQ.options : null,
      correct_answer: newQ.type !== 'free_text' ? newQ.correct_answer || null : null,
    }

    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    setAddingQ(false)
    if (data.error) { toast.error(data.error); return }
    toast.success('Frage hinzugefügt')
    setQuestions((prev) => [...prev, data])
    setNewQ({ type: 'mcq', prompt: '', correct_answer: '', points: 1, options: [
      { label: 'A', value: 'a', correct: true },
      { label: 'B', value: 'b', correct: false },
      { label: 'C', value: 'c', correct: false },
      { label: 'D', value: 'd', correct: false },
    ]})
  }

  async function deleteQuestion(qId: string) {
    const res = await fetch(`/api/questions/${qId}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.error) { toast.error(data.error); return }
    setQuestions((prev) => prev.filter((q) => q.id !== qId))
    toast.success('Frage gelöscht')
  }

  async function drawFromBank() {
    setDrawing(true)
    const res = await fetch('/api/question-bank/draw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exam_id: id, category: drawCategory, count: drawCount }),
    })
    const data = await res.json()
    setDrawing(false)
    if (data.error) { toast.error(data.error); return }
    toast.success(`${data.length} Fragen hinzugefügt`)
    fetchAll()
  }

  function setOptionCorrect(index: number) {
    setNewQ((prev) => ({
      ...prev,
      options: prev.options.map((o, i) => ({ ...o, correct: i === index })),
    }))
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen">Lädt...</div>
  if (!exam) return <div className="flex items-center justify-center min-h-screen text-red-500">Prüfung nicht gefunden</div>

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/teacher" className="text-sm text-gray-500 hover:text-gray-700">← Dashboard</Link>
          <span className="text-gray-300">|</span>
          <h1 className="font-semibold text-lg">{exam.title}</h1>
          <Badge variant="outline" className="font-mono">{exam.exam_key}</Badge>
        </div>
        <div className="flex gap-2">
          <Link href={`/teacher/exam/${id}/monitor`}>
            <Button variant="outline" size="sm">Monitoring</Button>
          </Link>
          <Link href={`/teacher/exam/${id}/grade`}>
            <Button variant="outline" size="sm">Bewertung</Button>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Exam info */}
        <Card>
          <CardContent className="py-4 flex gap-6 text-sm text-gray-600">
            <span>Zeitlimit: <strong>{exam.time_limit_minutes} Min</strong></span>
            <span>Sicherheit: <strong>Stufe {exam.security_level}</strong></span>
            <span>Fragen: <strong>{questions.length}</strong></span>
            <span>Gesamtpunkte: <strong>{totalPoints}</strong></span>
            <span>Zufällig: <strong>{exam.randomize_questions ? 'Ja' : 'Nein'}</strong></span>
          </CardContent>
        </Card>

        {/* Question list */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Fragen ({questions.length})</h2>
          {questions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                Noch keine Fragen. Füge Fragen manuell hinzu oder ziehe aus dem Pool.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Frage</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Punkte</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((q, i) => (
                    <TableRow key={q.id}>
                      <TableCell className="text-gray-400">{i + 1}</TableCell>
                      <TableCell className="max-w-sm">
                        <p className="truncate">{q.prompt}</p>
                      </TableCell>
                      <TableCell><Badge variant="outline">{q.type}</Badge></TableCell>
                      <TableCell>{q.points}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => deleteQuestion(q.id)}
                        >
                          Löschen
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </section>

        <Separator />

        {/* Add question manually */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Frage manuell hinzufügen</h2>
          <Card>
            <CardContent className="py-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Typ</Label>
                  <Select value={newQ.type} onValueChange={(v) => setNewQ({ ...newQ, type: (v ?? 'mcq') as Question['type'] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mcq">Multiple Choice</SelectItem>
                      <SelectItem value="short_answer">Kurzantwort</SelectItem>
                      <SelectItem value="free_text">Freitext</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Punkte</Label>
                  <Input
                    type="number"
                    min={1}
                    value={newQ.points}
                    onChange={(e) => setNewQ({ ...newQ, points: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Fragetext *</Label>
                <Textarea
                  value={newQ.prompt}
                  onChange={(e) => setNewQ({ ...newQ, prompt: e.target.value })}
                  placeholder="Fragentext eingeben..."
                  rows={2}
                />
              </div>

              {newQ.type === 'mcq' && (
                <div className="space-y-2">
                  <Label>Antwortoptionen (richtige markieren)</Label>
                  {newQ.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={opt.correct}
                        onChange={() => setOptionCorrect(i)}
                        name="correct_option"
                      />
                      <span className="font-medium w-6">{opt.label}</span>
                      <Input
                        value={opt.label}
                        onChange={(e) => {
                          const updated = [...newQ.options]
                          updated[i] = { ...updated[i], label: e.target.value }
                          setNewQ({ ...newQ, options: updated })
                        }}
                        placeholder={`Option ${opt.label}`}
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>
              )}

              {newQ.type === 'short_answer' && (
                <div className="space-y-1">
                  <Label>Richtige Antwort (für Auto-Grading)</Label>
                  <Input
                    value={newQ.correct_answer}
                    onChange={(e) => setNewQ({ ...newQ, correct_answer: e.target.value })}
                    placeholder="Exakte Antwort (Groß-/Kleinschreibung egal)"
                  />
                </div>
              )}

              <Button onClick={addQuestion} disabled={addingQ}>
                {addingQ ? 'Hinzufügen...' : 'Frage hinzufügen'}
              </Button>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Draw from bank */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Aus Fragenpool ziehen</h2>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-end gap-3">
                <div className="space-y-1 flex-1">
                  <Label>Kategorie</Label>
                  <Select value={drawCategory} onValueChange={(v) => setDrawCategory(v ?? 'all')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Kategorien</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 w-32">
                  <Label>Anzahl</Label>
                  <Input
                    type="number"
                    min={1}
                    max={bankQuestions.length}
                    value={drawCount}
                    onChange={(e) => setDrawCount(parseInt(e.target.value) || 1)}
                  />
                </div>
                <Button onClick={drawFromBank} disabled={drawing || bankQuestions.length === 0}>
                  {drawing ? 'Ziehe...' : 'Zufällig ziehen'}
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {bankQuestions.length} Fragen im Pool verfügbar
              </p>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}
