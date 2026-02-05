import { createClient } from '@/lib/supabase-config'
import { NextResponse } from 'next/server'

const supabase = createClient()

export async function GET() {
  // FIXED: Removed all comments (//) from inside the select string
  const { data: courses, error } = await supabase
    .from('courses')
    .select(`
      course_id,
      course_name,
      course_sections (
        enrollments (student_id)
      ),
      clearance_templates (
        departments (dept_name),
        student_clearances (status)
      )
    `)
    .order('course_name', { ascending: true })

  if (error) {
    console.error('Error fetching courses:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  
  const processedData = courses.map((course: any) => {
    
    
    const uniqueStudents = new Set();
    
    if (Array.isArray(course.course_sections)) {
      course.course_sections.forEach((section: any) => {
         if (Array.isArray(section.enrollments)) {
           section.enrollments.forEach((enrollment: any) => {
              uniqueStudents.add(enrollment.student_id);
           });
         }
      });
    }
    const studentsEnrolled = uniqueStudents.size;

    
    let assignedDepartments: string[] = [];
    if (Array.isArray(course.clearance_templates)) {
      const rawDepts = course.clearance_templates.map((t: any) => t.departments?.dept_name);
      
      assignedDepartments = [...new Set(rawDepts)].filter((d): d is string => Boolean(d));
    }

    
    let totalClearances = 0;
    let signedClearances = 0;

    if (Array.isArray(course.clearance_templates)) {
      course.clearance_templates.forEach((t: any) => {
         const clearances = t.student_clearances || [];
         totalClearances += clearances.length;
         
         signedClearances += clearances.filter((c: any) => 
           ['signed', 'completed', 'cleared'].includes(c.status?.toLowerCase())
         ).length;
      });
    }

    const completionRate = totalClearances > 0 
      ? Math.round((signedClearances / totalClearances) * 100) 
      : 0;

    
    return {
       id: course.course_id,
       code: generateCourseCode(course.course_name),
       name: course.course_name,
       completionRate,
       studentsEnrolled,
       assignedDepartments,
       updatedAt: 'Synced just now'
    };
  });

  return NextResponse.json({ data: processedData }, { status: 200 })
}


function generateCourseCode(name: string) {
  if (!name) return "N/A";
  if (name.length < 6) return name;
  
  return name
    .split(' ')
    .filter(word => /^[A-Z]/.test(word)) 
    .map(word => word[0])
    .join('')
    .toUpperCase();
}