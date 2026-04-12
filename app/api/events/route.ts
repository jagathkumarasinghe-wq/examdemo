import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { session_id, event_type } = await req.json()

  const { error } = await supabaseAdmin
    .from('exam_events')
    .insert({ session_id, event_type })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Increment event_count on session
  await supabaseAdmin.rpc('increment_event_count', { session_id_param: session_id }).maybeSingle()
  // Fallback: manual increment if rpc not available
  const { data: session } = await supabaseAdmin
    .from('exam_sessions')
    .select('event_count')
    .eq('id', session_id)
    .single()

  if (session) {
    await supabaseAdmin
      .from('exam_sessions')
      .update({ event_count: (session.event_count || 0) + 1 })
      .eq('id', session_id)
  }

  return NextResponse.json({ success: true })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('session_id')

  if (!sessionId) return NextResponse.json({ error: 'session_id required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('exam_events')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
