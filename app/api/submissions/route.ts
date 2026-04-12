import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { MCQOption } from '@/lib/types'

function autoScore(question: { type: string; correct_answer: string | null; options: MCQOption[] | null }, answer: string): number | null {
  if (question.type === 'free_text') return null
  if (!question.correct_answer) return null

  if (question.type === 'mcq') {
    // Find the option with correct: true
    const correctOption = question.options?.find((o) => o.correct)
    if (!correctOption) return null
    return answer.toLowerCase() === correctOption.value.toLowerCase() ? 1 : 0
  }

  if (question.type === 'short_answer') {
    return answer.trim().toLowerCase() === question.correct_answer.trim().toLowerCase() ? 1 : 0
  }

  return null
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('session_id')

  if (!sessionId) return NextResponse.json({ error: 'session_id required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('submissions')
    .select('*, question:questions(*)')
    .eq('session_id', sessionId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  // body: { session_id, question_id, answer }

  // Fetch question for auto-scoring
  const { data: question } = await supabaseAdmin
    .from('questions')
    .select('*')
    .eq('id', body.question_id)
    .single()

  const auto_score = question ? autoScore(question, body.answer) : null

  // Upsert by session_id + question_id
  const { data, error } = await supabaseAdmin
    .from('submissions')
    .upsert(
      { session_id: body.session_id, question_id: body.question_id, answer: body.answer, auto_score },
      { onConflict: 'session_id,question_id' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
