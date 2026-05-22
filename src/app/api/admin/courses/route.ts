import { createClient } from '@/lib/db/supabase-server'
import { NextRequest, NextResponse } from 'next/server'


export async function GET() {

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('courses')
    .select('course_id, course_name')
    .order('course_name', { ascending: true})

  if (error) {
    console.error('Error fetching courses:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 200})
}

export async function POST(req: NextRequest) {

  const supabase = await createClient()

  const { course_name } = await req.json()

  try {
    if (!course_name || typeof course_name !== 'string' || course_name.trim() === '') {
      return NextResponse.json({ error: 'Course name is required' }, { status: 400 }) 
    }

    const { data, error } = await supabase
      .from('courses')
      .insert({ course_name: course_name.trim() })
      .select()
      .single()

    if (error) {
      console.error('Error creating course:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })

  } catch (err) {
    console.error('Create course error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {

  const supabase = await createClient()

  try {
    const { course_id, course_name } = await req.json()

    if (!course_id || !course_name || course_name.trim() === '') {
      return NextResponse.json({ error: 'Course ID and name are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('courses')
      .update({ course_name: course_name.trim() })
      .eq('course_id', course_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating course:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 200 })

  } catch (error) {
    console.error('Update course error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {

  const supabase = await createClient()

  try {
    const { course_id } = await req.json()

    if (!course_id) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('course_id', course_id)
    
    if (error) {
      console.error('Error deleting course:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true }, { status: 200 })

  } catch (error) {
    console.error('Delete course error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
