import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(req: NextRequest) {
  const { submission_id, manual_score, feedback } = await req.json()

  const { data, error } = await supabaseAdmin
    .from('submissions')
    .update({ manual_score, feedback })
    .eq('id', submission_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Export CSV data for an exam
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const examId = searchParams.get('exam_id')

  if (!examId) return NextResponse.json({ error: 'exam_id required' }, { status: 400 })

  const { data: sessions, error: sessionsError } = await supabaseAdmin
    .from('exam_sessions')
    .select('*')
    .eq('exam_id', examId)

  if (sessionsError) return NextResponse.json({ error: sessionsError.message }, { status: 500 })

  const results = []
  for (const session of sessions || []) {
    const { data: submissions } = await supabaseAdmin
      .from('submissions')
      .select('*, question:questions(prompt, points, type)')
      .eq('session_id', session.id)

    for (const sub of submissions || []) {
      const score = sub.manual_score ?? sub.auto_score
      results.push({
        student_name: session.student_name,
        started_at: session.started_at,
        submitted_at: session.submitted_at,
        status: session.status,
        question: sub.question?.prompt,
        question_type: sub.question?.type,
        answer: sub.answer,
        auto_score: sub.auto_score,
        manual_score: sub.manual_score,
        final_score: score,
        max_points: sub.question?.points,
        feedback: sub.feedback,
      })
    }
  }

  return NextResponse.json(results)
}
