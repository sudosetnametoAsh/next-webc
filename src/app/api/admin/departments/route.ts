import { createClient } from "@/lib/supabase-config"
import { NextRequest, NextResponse } from "next/server"

const supabase = createClient()

// Get all departments
export async function GET() {
  const { data, error } = await supabase
    .from('departments')
    .select('dept_id, dept_name')
  
  if (error) {
    console.error('Error fetching departments:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 200})
}

// Create a new department
export async function POST(req: NextRequest) {
  try {
    const { dept_name } = await req.json()

    if (!dept_name || typeof dept_name !== 'string' || dept_name.trim() === '') {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 }) 
    }

    const { data, error } = await supabase
      .from('departments')
      .insert({ dept_name: dept_name.trim() })
      .select()
      .single()

    if (error) {
      console.error('Error creating department:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })

  } catch (error) {
    console.error('Create department error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update an existing department
export async function PATCH(req: NextRequest) {
  try {
    const { dept_id, dept_name } = await req.json()

    if (!dept_id || !dept_name || dept_name.trim() === '') {
      return NextResponse.json({ error: 'Department ID and name are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('departments')
      .update({ dept_name: dept_name.trim() })
      .eq('dept_id', dept_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating department:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 200 })

  } catch (error) {
    console.error('Update department error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete a department
export async function DELETE(req: NextRequest) {
  try {
    const { dept_id } = await req.json()

    if (!dept_id) {
      return NextResponse.json({ error: 'Department ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('dept_id', dept_id)
    
    if (error) {
      console.error('Error deleting department:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

  } catch (error) {
    console.error('Delete department error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}