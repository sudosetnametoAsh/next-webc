import { db } from '@/lib/db'
import { clearanceDepartments } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from "next/server"

// Get all departments
export async function GET() {
  try {
    const data = await db
      .select({
        dept_id: clearanceDepartments.deptId,
        dept_name: clearanceDepartments.deptName,
        signing_order: clearanceDepartments.signingOrder,
      })
      .from(clearanceDepartments)
      .orderBy(clearanceDepartments.signingOrder, clearanceDepartments.deptName)

    return NextResponse.json({ data }, { status: 200 })
  } catch (error: any) {
    console.error('Error fetching departments:', error)
    return NextResponse.json({ error: error.message || 'Error fetching departments' }, { status: 500 })
  }
}

// Create a new department
export async function POST(req: NextRequest) {
  try {
    const { dept_name, signing_order } = await req.json()

    if (!dept_name || typeof dept_name !== 'string' || dept_name.trim() === '') {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 }) 
    }

    const [newDept] = await db
      .insert(clearanceDepartments)
      .values({ 
        deptName: dept_name.trim(),
        signingOrder: signing_order ?? 2
      })
      .returning({
        dept_id: clearanceDepartments.deptId,
        dept_name: clearanceDepartments.deptName,
        signing_order: clearanceDepartments.signingOrder,
      })

    return NextResponse.json({ data: newDept }, { status: 201 })
  } catch (error: any) {
    console.error('Create department error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// Update existing department(s) or batch signing order
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()

    // Batch update sequence orders: [{ dept_id: 1, signing_order: 1 }, ...]
    if (Array.isArray(body)) {
      const updates = body.map((item: { dept_id: number; signing_order: number }) => {
        return db
          .update(clearanceDepartments)
          .set({ signingOrder: item.signing_order })
          .where(eq(clearanceDepartments.deptId, item.dept_id))
      })

      await Promise.all(updates)
      return NextResponse.json({ message: "Hierarchy updated successfully" }, { status: 200 })
    }

    const { dept_id, dept_name, signing_order } = body

    if (!dept_id) {
      return NextResponse.json({ error: 'Department ID is required' }, { status: 400 })
    }

    const updatePayload: Record<string, any> = {}
    if (dept_name && dept_name.trim() !== '') updatePayload.deptName = dept_name.trim()
    if (signing_order !== undefined) updatePayload.signingOrder = signing_order

    const [updated] = await db
      .update(clearanceDepartments)
      .set(updatePayload)
      .where(eq(clearanceDepartments.deptId, dept_id))
      .returning({
        dept_id: clearanceDepartments.deptId,
        dept_name: clearanceDepartments.deptName,
        signing_order: clearanceDepartments.signingOrder,
      })

    return NextResponse.json({ data: updated }, { status: 200 })
  } catch (error: any) {
    console.error('Update department error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// Delete a department
export async function DELETE(req: NextRequest) {
  try {
    const { dept_id } = await req.json()

    if (!dept_id) {
      return NextResponse.json({ error: 'Department ID is required' }, { status: 400 })
    }

    await db
      .delete(clearanceDepartments)
      .where(eq(clearanceDepartments.deptId, dept_id))

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error('Delete department error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
