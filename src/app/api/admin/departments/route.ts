import { createClient } from '@/lib/db/supabase-server'
import { NextRequest, NextResponse } from "next/server"
import { invalidateServerAdminCache } from "@/lib/services/admin-cache"
import { invalidateServerDepartmentCache } from "@/lib/services/department-cache"


// Get all departments
export async function GET() {

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('clearance_departments')
    .select('dept_id, dept_name, icon_name, floor, room')
    .order('dept_id')
  
  if (error) {
    console.error('Error fetching departments:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 200})
}

// Create a new department
export async function POST(req: NextRequest) {

  const supabase = await createClient()

  try {
    const { dept_name, icon_name, floor, room } = await req.json()

    if (!dept_name || typeof dept_name !== 'string' || dept_name.trim() === '') {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 }) 
    }

    const insertPayload: Record<string, any> = {
      dept_name: dept_name.trim(),
    }
    if (icon_name) insertPayload.icon_name = icon_name
    if (floor !== undefined) insertPayload.floor = floor?.trim() || null
    if (room !== undefined) insertPayload.room = room?.trim() || null

    const { data, error } = await supabase
      .from('clearance_departments')
      .insert(insertPayload)
      .select()
      .single()

    if (error) {
      console.error('Error creating department:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    invalidateServerAdminCache()
    invalidateServerDepartmentCache()

    return NextResponse.json({ data }, { status: 201 })

  } catch (error) {
    console.error('Create department error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update an existing department
export async function PATCH(req: NextRequest) {

  const supabase = await createClient()

  try {
    const { dept_id, dept_name, icon_name, floor, room } = await req.json()

    if (!dept_id) {
      return NextResponse.json({ error: 'Department ID is required' }, { status: 400 })
    }

    const updatePayload: Record<string, any> = {}
    if (dept_name && typeof dept_name === 'string' && dept_name.trim() !== '') {
      updatePayload.dept_name = dept_name.trim()
    }
    if (icon_name && typeof icon_name === 'string') {
      updatePayload.icon_name = icon_name
    }
    if (floor !== undefined) {
      updatePayload.floor = floor ? floor.trim() : null
    }
    if (room !== undefined) {
      updatePayload.room = room ? room.trim() : null
    }

    const { data, error } = await supabase
      .from('clearance_departments')
      .update(updatePayload)
      .eq('dept_id', dept_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating department:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    invalidateServerAdminCache()
    invalidateServerDepartmentCache()

    return NextResponse.json({ data }, { status: 200 })

  } catch (error) {
    console.error('Update department error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete a department
export async function DELETE(req: NextRequest) {

  const supabase = await createClient()

  try {
    const { dept_id } = await req.json()

    if (!dept_id) {
      return NextResponse.json({ error: 'Department ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('clearance_departments')
      .delete()
      .eq('dept_id', dept_id)
    
    if (error) {
      console.error('Error deleting department:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    invalidateServerAdminCache()
    invalidateServerDepartmentCache()

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Delete department error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
