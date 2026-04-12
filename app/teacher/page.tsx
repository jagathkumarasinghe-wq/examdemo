'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Papa from 'papaparse'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import type { Exam, QuestionBank } from '@/lib/types'

export default function TeacherPage() {
  const router = useRouter()
  const [exams, setExams] = useState<Exam[]>([])
  const [bankQuestions, setBankQuestions] = useState<QuestionBank[]>([])
  const [bankCategory, setBankCategory] = useState('all')
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [newExam, setNewExam] = useState({
    title: '',
    description: '',
    security_level: 1,
    time_limit_minutes: 60,
    randomize_questions: true,
  })

  useEffect(() => {
    fetchAll()
  }, [])

  useEffect(() => {
    fetchBank()
  }, [bankCategory])

  async function fetchAll() {
    setLoading(true)
    const [examsRes, bankRes] = await Promise.all([
      fetch('/api/exams'),
      fetch('/api/question-bank'),
    ])
    const examsData = await examsRes.json()
    const bankData = await bankRes.json()
    setExams(Array.isArray(examsData) ? examsData : [])
    if (Array.isArray(bankData)) {
      setBankQuestions(bankData)
      const cats = [...new Set(bankData.map((q: QuestionBank) => q.category).filter(Boolean))]
      setCategories(cats as string[])
    }
    setLoading(false)
  }

  async function fetchBank() {
    const res = await fetch(`/api/question-bank?category=${bankCategory}`)
    const data = await res.json()
    if (Array.isArray(data)) setBankQuestions(data)
  }

  async function createExam() {
    if (!newExam.title.trim()) { toast.error('Titel erforderlich'); return }
    setCreating(true)
    const res = await fetch('/api/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newExam),
    })
    const data = await res.json()
    setCreating(false)
    if (data.error) { toast.error(data.error); return }
    toast.success('Prüfung erstellt')
    router.push(`/teacher/exam/${data.id}`)
  }

  async function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportLoading(true)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as Record<string, string>[]
        const questions = rows.map((row) => {
          const options = ['a', 'b', 'c', 'd']
            .filter((l) => row[`option_${l}`])
            .map((l) => ({
              label: l.toUpperCase(),
              value: l,
              correct: row.correct_answer?.toLowerCase() === l,
            }))

          return {
            category: row.category || 'Allgemein',
            type: row.type || 'mcq',
            prompt: row.prompt,
            options: options.length > 0 ? options : null,
            correct_answer: row.correct_answer || null,
            points: parseInt(row.points) || 1,
            source_file: file.name,
            tags: row.tags ? row.tags.split(';').map((t: string) => t.trim()) : [],
          }
        })

        const res = await fetch('/api/question-bank', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(questions),
        })
        const data = await res.json()
        setImportLoading(false)
        if (data.error) { toast.error(data.error); return }
        toast.success(`${questions.length} Fragen importiert`)
        fetchAll()
        if (fileRef.current) fileRef.current.value = ''
      },
    })
  }

  const securityLabel = (level: number) => {
    if (level === 1) return { label: 'Offen', color: 'secondary' as const }
    if (level === 2) return { label: 'Überwacht', color: 'default' as const }
    return { label: 'Lockdown', color: 'destructive' as const }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">← Startseite</Link>
          <span className="text-gray-300">|</span>
          <h1 className="font-semibold text-lg">Lehrer-Dashboard</h1>
        </div>
        <Dialog>
          <DialogTrigger>
            <Button>+ Neue Prüfung</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neue Prüfung erstellen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label>Titel *</Label>
                <Input
                  value={newExam.title}
                  onChange={(e) => setNewExam({ ...newExam, title: e.target.value })}
                  placeholder="z.B. Mathematik Abschlussklausur"
                />
              </div>
              <div className="space-y-1">
                <Label>Beschreibung</Label>
                <Input
                  value={newExam.description}
                  onChange={(e) => setNewExam({ ...newExam, description: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Zeitlimit (Minuten)</Label>
                  <Input
                    type="number"
                    value={newExam.time_limit_minutes}
                    onChange={(e) => setNewExam({ ...newExam, time_limit_minutes: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Sicherheitsstufe</Label>
                  <Select
                    value={String(newExam.security_level)}
                    onValueChange={(v) => setNewExam({ ...newExam, security_level: parseInt(v ?? '1') })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 — Offen</SelectItem>
                      <SelectItem value="2">2 — Überwacht</SelectItem>
                      <SelectItem value="3">3 — Lockdown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="randomize"
                  checked={newExam.randomize_questions}
                  onChange={(e) => setNewExam({ ...newExam, randomize_questions: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="randomize">Fragen zufällig mischen</Label>
              </div>
              <Button onClick={createExam} disabled={creating} className="w-full">
                {creating ? 'Erstelle...' : 'Prüfung erstellen'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Exam List */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Prüfungen</h2>
          {loading ? (
            <p className="text-gray-500">Lädt...</p>
          ) : exams.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                Noch keine Prüfungen. Erstelle deine erste Prüfung.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {exams.map((exam) => {
                const sec = securityLabel(exam.security_level)
                return (
                  <Card key={exam.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="py-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">{exam.title}</p>
                          <p className="text-sm text-gray-500">
                            Key: <span className="font-mono font-bold text-blue-600">{exam.exam_key}</span>
                            {' · '}{exam.time_limit_minutes} Min
                          </p>
                        </div>
                        <Badge variant={sec.color}>{sec.label}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/teacher/exam/${exam.id}/monitor`}>
                          <Button size="sm" variant="outline">Monitoring</Button>
                        </Link>
                        <Link href={`/teacher/exam/${exam.id}/grade`}>
                          <Button size="sm" variant="outline">Bewertung</Button>
                        </Link>
                        <Link href={`/teacher/exam/${exam.id}`}>
                          <Button size="sm">Bearbeiten</Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </section>

        <Separator />

        {/* Question Bank */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Fragenpool</h2>
            <div className="flex items-center gap-3">
              <Select value={bankCategory} onValueChange={(v) => setBankCategory(v ?? 'all')}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Alle Kategorien" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Kategorien</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label className="cursor-pointer">
                <Button variant="outline" size="sm" disabled={importLoading} onClick={() => fileRef.current?.click()}>
                  {importLoading ? 'Importiert...' : 'CSV importieren'}
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleCSVImport}
                />
              </Label>
            </div>
          </div>

          {bankQuestions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                Noch keine Fragen im Pool. Importiere eine CSV-Datei.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Frage</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Kategorie</TableHead>
                    <TableHead>Punkte</TableHead>
                    <TableHead>Tags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bankQuestions.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="max-w-xs truncate">{q.prompt}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{q.type}</Badge>
                      </TableCell>
                      <TableCell>{q.category}</TableCell>
                      <TableCell>{q.points}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {q.tags?.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </section>
      </main>
    </div>
  )
}
