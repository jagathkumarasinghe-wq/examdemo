import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const examId = searchParams.get('exam_id')

  if (!examId) return NextResponse.json({ error: 'exam_id required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('questions')
    .select('*')
    .eq('exam_id', examId)
    .order('order_index')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Get next order_index
  const { data: existing } = await supabaseAdmin
    .from('questions')
    .select('order_index')
    .eq('exam_id', body.exam_id)
    .order('order_index', { ascending: false })
    .limit(1)

  const order_index = existing && existing.length > 0 ? existing[0].order_index + 1 : 0

  const { data, error } = await supabaseAdmin
    .from('questions')
    .insert({ ...body, order_index })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
