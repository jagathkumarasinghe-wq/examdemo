'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ExamSession, ExamEvent } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'

export default function MonitorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [sessions, setSessions] = useState<ExamSession[]>([])
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [events, setEvents] = useState<ExamEvent[]>([])
  const [examTitle, setExamTitle] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()

    // Subscribe to exam_sessions changes
    const sessionsChannel = supabase
      .channel(`monitor-sessions-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'exam_sessions', filter: `exam_id=eq.${id}` },
        () => loadData()
      )
      .subscribe()

    // Subscribe to exam_events changes
    const eventsChannel = supabase
      .channel(`monitor-events-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'exam_events' },
        (payload) => {
          const event = payload.new as ExamEvent
          // Update event count in sessions
          setSessions((prev) =>
            prev.map((s) =>
              s.id === event.session_id ? { ...s, event_count: s.event_count + 1 } : s
            )
          )
          // Add to events if this session is selected
          if (selectedSession === event.session_id) {
            setEvents((prev) => [event, ...prev])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(sessionsChannel)
      supabase.removeChannel(eventsChannel)
    }
  }, [id])

  useEffect(() => {
    if (selectedSession) loadEvents(selectedSession)
  }, [selectedSession])

  async function loadData() {
    const [sessionsRes, examRes] = await Promise.all([
      fetch(`/api/sessions?exam_id=${id}`),
      fetch(`/api/exams/${id}`),
    ])
    const sessionsData = await sessionsRes.json()
    const examData = await examRes.json()
    setSessions(Array.isArray(sessionsData) ? sessionsData : [])
    if (examData.title) setExamTitle(examData.title)
    setLoading(false)
  }

  async function loadEvents(sessionId: string) {
    const res = await fetch(`/api/events?session_id=${sessionId}`)
    const data = await res.json()
    setEvents(Array.isArray(data) ? data : [])
  }

  function statusBadge(status: string) {
    if (status === 'active') return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Aktiv</Badge>
    if (status === 'submitted') return <Badge variant="secondary">Abgegeben</Badge>
    return <Badge>Bewertet</Badge>
  }

  function eventTypeBadge(type: string) {
    const map: Record<string, string> = {
      tab_switch: 'Tab-Wechsel',
      blur: 'Fokusverlust',
      copy: 'Kopieren',
      paste: 'Einfügen',
      fullscreen_exit: 'Vollbild verlassen',
    }
    return <Badge variant="destructive" className="text-xs">{map[type] || type}</Badge>
  }

  const activeCount = sessions.filter((s) => s.status === 'active').length
  const submittedCount = sessions.filter((s) => s.status === 'submitted').length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <Link href={`/teacher/exam/${id}`} className="text-sm text-gray-500 hover:text-gray-700">← Prüfung</Link>
        <span className="text-gray-300">|</span>
        <h1 className="font-semibold">Live-Monitoring: {examTitle}</h1>
        <div className="ml-auto flex gap-3 text-sm">
          <span className="text-green-600 font-medium">{activeCount} aktiv</span>
          <span className="text-gray-500">{submittedCount} abgegeben</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 grid grid-cols-3 gap-6">
        {/* Session list */}
        <div className="col-span-2 space-y-3">
          <h2 className="font-semibold text-lg">Schüler ({sessions.length})</h2>
          {loading ? (
            <p className="text-gray-500">Lädt...</p>
          ) : sessions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                Noch keine Schüler gestartet.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Gestartet</TableHead>
                    <TableHead className="text-center">Events</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow
                      key={session.id}
                      className={`cursor-pointer ${selectedSession === session.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      onClick={() => setSelectedSession(session.id === selectedSession ? null : session.id)}
                    >
                      <TableCell className="font-medium">{session.student_name}</TableCell>
                      <TableCell>{statusBadge(session.status)}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(session.started_at), { addSuffix: true, locale: de })}
                      </TableCell>
                      <TableCell className="text-center">
                        {session.event_count > 0 ? (
                          <Badge variant="destructive">{session.event_count}</Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>

        {/* Event log */}
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">
            {selectedSession
              ? `Events: ${sessions.find((s) => s.id === selectedSession)?.student_name}`
              : 'Events (Schüler wählen)'}
          </h2>
          {selectedSession ? (
            events.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-center text-gray-500 text-sm">
                  Keine verdächtigen Events
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {events.map((ev) => (
                  <Card key={ev.id} className="border-red-100">
                    <CardContent className="py-3 flex items-center justify-between">
                      {eventTypeBadge(ev.event_type)}
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(ev.created_at), { addSuffix: true, locale: de })}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          ) : (
            <Card>
              <CardContent className="py-6 text-center text-gray-400 text-sm">
                Schüler anklicken um Events zu sehen
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
