import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Draw N random questions from the bank and add them to an exam
export async function POST(req: NextRequest) {
  const { exam_id, category, count } = await req.json()

  let query = supabaseAdmin.from('question_bank').select('*')
  if (category && category !== 'all') {
    query = query.eq('category', category)
  }

  const { data: pool, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!pool || pool.length === 0) return NextResponse.json({ error: 'Keine Fragen gefunden' }, { status: 404 })

  // Shuffle and take count
  const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, count)

  // Get current max order_index
  const { data: existing } = await supabaseAdmin
    .from('questions')
    .select('order_index')
    .eq('exam_id', exam_id)
    .order('order_index', { ascending: false })
    .limit(1)

  let nextIndex = existing && existing.length > 0 ? existing[0].order_index + 1 : 0

  const toInsert = shuffled.map((q) => ({
    exam_id,
    question_bank_id: q.id,
    type: q.type,
    prompt: q.prompt,
    options: q.options,
    correct_answer: q.correct_answer,
    points: q.points,
    order_index: nextIndex++,
  }))

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('questions')
    .insert(toInsert)
    .select()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  return NextResponse.json(inserted)
}
