import { createClient } from '@/lib/db/supabase-server'
import { NextResponse } from 'next/server'


export async function GET() {

  const supabase = await createClient()

  try {
    const totalStudentsResult = await supabase.from('students').select('student_id', { count: 'exact'})
    
    type ClearanceRecord = {
      user_id: string;
      status: string;
    };

    async function fetchAllClearanceRecords(): Promise<ClearanceRecord[]> {

      const PAGE_SIZE = 1000;
      let allData: ClearanceRecord[] = [];
      let from = 0;

      while (true) {
        const { data, error } = await supabase
          .from('clearance_records')
          .select('user_id, status')
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;

        allData = [...allData, ...(data ?? [])];

        if ((data ?? []).length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      return allData;
    }

    if (totalStudentsResult.error) {
      console.error('Error fetching total students:', totalStudentsResult.error)
      return NextResponse.json({ error: totalStudentsResult.error.message }, { status: 500 })
    }

    const totalStudents = totalStudentsResult.count ?? 0
    const clearances = await fetchAllClearanceRecords()

    // Group by student to determine overall status
    // A student is "Signed" only if ALL their clearances are signed
    // A student is "Incomplete" if they have at least one non-Pending, non-Signed status
    // A student is "Pending" if all clearances are Pending
    const studentStatusMap = new Map<string, string[]>()
    
    for (const clearance of clearances) {
      const existing = studentStatusMap.get(clearance.user_id) ?? []
      existing.push(clearance.status)
      studentStatusMap.set(clearance.user_id, existing)
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
