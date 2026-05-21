import { createClient } from '@/lib/db/supabase-client'
import { NextResponse } from 'next/server'

const supabase = createClient()

export async function GET() {
  try {
    const [totalStudentsResult, totalClearancesResult] = await Promise.all([
      // Total students
      supabase.from('students').select('student_id', { count: 'exact'}),
      // Clearance statuses
      supabase.from('student_clearances').select('student_id, status'),
    ])

    if (totalStudentsResult.error) {
      console.error('Error fetching total students:', totalStudentsResult.error)
      return NextResponse.json({ error: totalStudentsResult.error.message }, { status: 500 })
    }

    if (totalClearancesResult.error) {
      console.error('Error fetching clearance statuses:', totalClearancesResult.error)
      return NextResponse.json({ error: totalClearancesResult.error.message }, { status: 500 })
    }

    const totalStudents = totalStudentsResult.count ?? 0
    const clearances = totalClearancesResult.data ?? []

    // Group by student to determine overall status
    // A student is "Signed" only if ALL their clearances are signed
    // A student is "Incomplete" if they have at least one non-Pending, non-Signed status
    // A student is "Pending" if all clearances are Pending
    const studentStatusMap = new Map<string, string[]>()
    
    for (const clearance of clearances) {
      const existing = studentStatusMap.get(clearance.student_id) ?? []
      existing.push(clearance.status)
      studentStatusMap.set(clearance.student_id, existing)
    }

    let signed = 0, incomplete = 0, pending = 0, totalNonCleared = 0, averageCompletion = 0

    for (const [, statuses] of studentStatusMap) {
      const allSigned = statuses.every(status => status === 'Signed')
      const allPending = statuses.every(status => status === 'Pending')
      
      if (allSigned) {
        signed++
      } 
      else if (allPending) {
        pending++
      } 
      else {
        incomplete++
      }
    }

    totalNonCleared = incomplete + pending
    averageCompletion = Math.round((signed / totalStudents) * 100)

    return NextResponse.json({
      data: {
        totalStudents,
        signed,
        incomplete,
        pending,
        totalNonCleared,
        averageCompletion
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}