import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const examId = searchParams.get('exam_id')

  let query = supabaseAdmin
    .from('exam_sessions')
    .select('*, exam:exams(title, exam_key)')
    .order('started_at', { ascending: false })

  if (examId) query = query.eq('exam_id', examId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { exam_key, student_name } = await req.json()

  // Look up exam by key
  const { data: exam, error: examError } = await supabaseAdmin
    .from('exams')
    .select('*')
    .eq('exam_key', exam_key.toUpperCase())
    .single()

  if (examError || !exam) {
    return NextResponse.json({ error: 'Ungültiger Exam-Key' }, { status: 404 })
  }

  const { data: session, error } = await supabaseAdmin
    .from('exam_sessions')
    .insert({ exam_id: exam.id, student_name })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ session, exam })
}
