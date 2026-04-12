'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function StudentPage() {
  const router = useRouter()
  const [examKey, setExamKey] = useState('')
  const [studentName, setStudentName] = useState('')
  const [loading, setLoading] = useState(false)

  async function startExam() {
    if (!examKey.trim() || examKey.length !== 6) { toast.error('Bitte gib einen gültigen 6-stelligen Exam-Key ein'); return }
    if (!studentName.trim()) { toast.error('Bitte gib deinen Namen ein'); return }

    setLoading(true)
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exam_key: examKey.trim().toUpperCase(), student_name: studentName.trim() }),
    })
    const data = await res.json()
    setLoading(false)

    if (data.error) { toast.error(data.error); return }
    router.push(`/student/exam/${data.session.id}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-4 p-4">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">Prüfung ablegen</h1>
          <p className="text-gray-500 text-sm">Gib den Exam-Key und deinen Namen ein</p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-1">
              <Label>Exam-Key</Label>
              <Input
                value={examKey}
                onChange={(e) => setExamKey(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="z.B. ABCDEF"
                className="font-mono text-center text-xl tracking-widest uppercase"
                maxLength={6}
              />
            </div>
            <div className="space-y-1">
              <Label>Dein Name</Label>
              <Input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Vor- und Nachname"
                onKeyDown={(e) => e.key === 'Enter' && startExam()}
              />
            </div>
            <Button
              onClick={startExam}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? 'Starte...' : 'Prüfung starten'}
            </Button>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">← Zurück zur Startseite</Link>
        </div>
      </div>
    </div>
  )
}
