import { getSession } from "@/lib/auth/get-session";
import { createClient } from "@/lib/db/supabase-server";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

export interface DepartmentClientTask {
  assigned_task_id: number;
  clearance_id: number | string;
  task_id?: number | string | null;
  title: string;
  description: string;
  status: "Pending" | "Flagged" | "Cleared" | "Submitted" | "Rejected" | "Verified";
  dropbox?: string | null;
  comments?: string | null;
  assigned_at?: string | null;
  uploaded_at?: string | null;
  due_date?: string | null;
  ai_audit_report?: any;
}

export interface DepartmentClientItem {
  id: string;
  name: string;
  email?: string | null;
  type: "student" | "staff";
  clearanceId: string;
  status: "Signed" | "Pending";
  departmentStatus: "cleared" | "incomplete" | "pending";
  isLocked: boolean;
  totalDepartments: number;
  signedDepartments: number;
  courseId?: number;
  courseName?: string;
  courseYear?: number;
  sectionNumber?: number | string;
  semester?: number;
  sectionId?: number | string;
  sectionCode?: string;
  tasks: DepartmentClientTask[];
  taskCount: number;
  signedAt?: string | null;
}

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const session = await getSession();
    const { user_id, department } = session;

    if (!user_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Resolve department id if department name is available
    let deptId: number | null = null;
    if (department) {
      const { data: deptData } = await supabase
        .from("clearance_departments")
        .select("dept_id")
        .ilike("dept_name", department.trim())
        .maybeSingle();

      if (deptData) {
        deptId = deptData.dept_id;
      }
    }

    // 2. Fetch clearance templates for this staff officer or department
    let templateQuery = supabase
      .from("clearance_templates")
      .select(`
        template_id,
        course_id,
        dept_id,
        staff_id,
        tier,
        clearance_departments (
          dept_id,
          dept_name,
          icon_name,
          floor,
          room
        ),
        courses (
          course_id,
          course_name
        )
      `);

    templateQuery = templateQuery
      .eq("is_active", true)
      .eq("staff_id", user_id);

    if (deptId !== null) {
      templateQuery = templateQuery.eq("dept_id", deptId);
    }

    const { data: templates, error: tempError } = await templateQuery;

    if (tempError) {
      console.error("Error fetching staff templates:", tempError);
      return NextResponse.json({ error: tempError.message }, { status: 500 });
    }

    if (!templates || templates.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const templateIds = templates.map((t) => t.template_id);
    const templateMap = new Map<number, (typeof templates)[0]>();
    for (const t of templates) {
      templateMap.set(t.template_id, t);
    }

    // 3. Fetch clearance records for these template(s)
    const { data: records, error: recError } = await supabase
      .from("clearance_records")
      .select(`
        clearance_id,
        user_id,
        status,
        signed_at,
        created_at,
        template_id,
        clearance_tasks (
          assigned_task_id,
          task_id,
          clearance_id,
          title,
          description,
          status,
          dropbox,
          comments,
          assigned_at,
          uploaded_at,
          due_date,
          ai_audit_report
        )
      `)
      .in("template_id", templateIds);

    if (recError) {
      console.error("Error fetching clearance records:", recError);
      return NextResponse.json({ error: recError.message }, { status: 500 });
    }

    if (!records || records.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const userIds = Array.from(new Set(records.map((r) => r.user_id)));

    // 4. Fetch students & enrollments, and staffs in parallel
    const [studentsRes, enrollmentsRes, staffsRes, allClearancesRes] = await Promise.all([
      supabase
        .from("students")
        .select("student_id, student_name")
        .in("student_id", userIds),
      supabase
        .from("enrollments")
        .select(`
          student_id,
          course_sections (
            section_id,
            section_number,
            year,
            semester,
            courses (
              course_id,
              course_name
            )
          )
        `)
        .in("student_id", userIds),
      supabase
        .from("staffs")
        .select("staff_id, staff_name, users(email)")
        .in("staff_id", userIds),
      // Match the signing endpoint's visibility across prerequisite departments.
      // Limit this privileged read to clients from the officer's authorized records above.
      (async () => {
        // Supabase caps each response: an unpaginated read silently omits blockers.
        const pageSize = 500;
        const fetchPage = (offset: number) => getSupabaseAdmin()
        .from("clearance_records")
        .select(`
          clearance_id,
          user_id,
          status,
          clearance_templates (
            tier,
            course_id,
            is_active
          )
        `)
        .in("user_id", userIds)
        .order("clearance_id", { ascending: true })
        .range(offset, offset + pageSize - 1);
        const firstPage = await fetchPage(0);
        if (firstPage.error) return firstPage;

        const data = [...firstPage.data];
        let pageLength = firstPage.data.length;
        while (pageLength === pageSize) {
          const page = await fetchPage(data.length);
          if (page.error) return page;
          data.push(...page.data);
          pageLength = page.data.length;
        }
        return { ...firstPage, data };
      })(),
    ]);

    if (studentsRes.error) console.error("Error fetching students:", studentsRes.error);
    if (enrollmentsRes.error) console.error("Error fetching enrollments:", enrollmentsRes.error);
    if (staffsRes.error) console.error("Error fetching staffs:", staffsRes.error);
    if (allClearancesRes.error) {
      console.error("Error fetching all clearances:", allClearancesRes.error);
      return NextResponse.json(
        { error: "Unable to check clearance prerequisites. Please try again." },
        { status: 500 },
      );
    }

    const studentMap = new Map<string, { student_id: string; student_name: string }>();
    for (const s of studentsRes.data || []) {
      studentMap.set(s.student_id, s);
    }

    const enrollmentMap = new Map<string, any>();
    for (const e of enrollmentsRes.data || []) {
      enrollmentMap.set(e.student_id, e);
    }

    const staffMap = new Map<string, { staff_id: string; staff_name: string; users: { email: string | null } | { email: string | null }[] | null }>();
    for (const st of staffsRes.data || []) {
      staffMap.set(st.staff_id, st);
    }

    const userClearanceMap = new Map<string, any[]>();
    for (const c of allClearancesRes.data || []) {
      const list = userClearanceMap.get(c.user_id) || [];
      list.push(c);
      userClearanceMap.set(c.user_id, list);
    }

    // 5. Construct client items
    const clients: DepartmentClientItem[] = [];

    for (const record of records) {
      const template = templateMap.get(record.template_id);
      const isStaff = template?.course_id == null;
      const studentInfo = studentMap.get(record.user_id);
      const staffInfo = staffMap.get(record.user_id);

      const name = isStaff
        ? staffInfo?.staff_name || record.user_id
        : studentInfo?.student_name || record.user_id;

      const type: "student" | "staff" = isStaff ? "staff" : "student";

      // Course & section details for students
      let courseId: number | undefined = undefined;
      let courseName: string | undefined = undefined;
      let sectionId: number | string | undefined = undefined;
      let sectionNumber: number | string | undefined = undefined;
      let courseYear: number | undefined = undefined;
      let semester: number | undefined = undefined;
      let sectionCode: string | undefined = undefined;

      if (!isStaff) {
        const enrollment = enrollmentMap.get(record.user_id);
        const section = Array.isArray(enrollment?.course_sections)
          ? enrollment.course_sections[0]
          : enrollment?.course_sections;
        const course = Array.isArray(section?.courses) ? section.courses[0] : section?.courses;

        const templateCourse = Array.isArray(template?.courses)
          ? template.courses[0]
          : template?.courses;

        courseId = course?.course_id || templateCourse?.course_id;
        courseName = course?.course_name || templateCourse?.course_name;
        sectionId = section?.section_id;
        sectionNumber = section?.section_number;
        courseYear = section?.year;
        semester = section?.semester;

        if (courseYear !== undefined && semester !== undefined && sectionNumber !== undefined) {
          sectionCode = `${courseYear}/${semester}-${sectionNumber}`;
        }
      }

      // Tasks for this clearance record
      const rawTasks = Array.isArray(record.clearance_tasks)
        ? record.clearance_tasks
        : [];
      const tasks: DepartmentClientTask[] = rawTasks.map((t: any) => ({
        assigned_task_id: t.assigned_task_id,
        clearance_id: record.clearance_id,
        task_id: t.task_id,
        title: t.title || "Clearance Requirement",
        description: t.description || "",
        status: t.status || "Pending",
        dropbox: t.dropbox,
        comments: t.comments,
        assigned_at: t.assigned_at,
        uploaded_at: t.uploaded_at,
        due_date: t.due_date,
        ai_audit_report: t.ai_audit_report,
      }));

      // Prerequisite & Department Clearance Progress
      const userClearances = userClearanceMap.get(record.user_id) || [];
      const totalDepartments = userClearances.length;
      const signedDepartments = userClearances.filter((c) => c.status === "Signed").length;

      const currentTier = template?.tier ?? 1;

      // In staff clearance, no prerequisites exist
      let isLocked = false;
      if (!isStaff) {
        const blocking = userClearances.filter((c) => {
          const t = Array.isArray(c.clearance_templates)
            ? c.clearance_templates[0]
            : c.clearance_templates;
          const itemIsActive = t?.is_active !== false;
          const itemTier = t?.tier ?? 1;
          return itemIsActive && itemTier < currentTier && c.status !== "Signed";
        });
        isLocked = blocking.length > 0;
      }

      // Department Status: 'cleared' | 'incomplete' | 'pending'
      const status: "Signed" | "Pending" = record.status === "Signed" ? "Signed" : "Pending";
      let departmentStatus: "cleared" | "incomplete" | "pending";

      const unfulfilledTasks = tasks.filter(
        (t) => t.status !== "Cleared"
      );
      const hasUnfulfilledTasks = unfulfilledTasks.length > 0;

      if (status === "Signed") {
        departmentStatus = "cleared";
      } else if (tasks.length > 0 && hasUnfulfilledTasks) {
        departmentStatus = "incomplete";
      } else {
        departmentStatus = "pending";
      }

      // Synchronize database record: if marked Incomplete but all tasks are cleared/completed, revert to Pending
      if (record.status === "Incomplete" && !hasUnfulfilledTasks) {
        supabase
          .from("clearance_records")
          .update({ status: "Pending" })
          .eq("clearance_id", record.clearance_id)
          .then();
      }

      clients.push({
        id: record.user_id,
        name,
        email: isStaff ? (Array.isArray(staffInfo?.users) ? staffInfo.users[0] : staffInfo?.users)?.email ?? null : null,
        type,
        clearanceId: String(record.clearance_id),
        status,
        departmentStatus,
        isLocked,
        totalDepartments,
        signedDepartments,
        courseId,
        courseName,
        courseYear,
        sectionNumber,
        semester,
        sectionId,
        sectionCode,
        tasks,
        taskCount: unfulfilledTasks.length > 0 ? unfulfilledTasks.length : tasks.length,
        signedAt: record.signed_at,
      });
    }

    return NextResponse.json({ data: clients }, { status: 200 });
  } catch (err: any) {
    console.error("Unexpected error in /api/department/clients:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
