import { getDocumentMimeType, validateDocumentUpload } from "@/lib/document-upload";
import { createClient } from "@/lib/db/supabase-server";
import { verifyDocumentAuthenticity } from "@/lib/services/ai-vision-verification";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { invalidateServerClearanceCache } from "@/lib/services/clearance-cache";
import { invalidateServerDepartmentCache } from "@/lib/services/department-cache";

const FormSchema = z.object({
  file: z.instanceof(File),
  task: z.string(),
  taskId: z.coerce.number(),
  studentId: z.string(),
  department: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const form = await req.formData();
    const formObject = Object.fromEntries(form.entries());
    const parseResult = FormSchema.safeParse(formObject);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid submission data", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const { file, task, taskId, studentId, department } = parseResult.data;
    const validationError = validateDocumentUpload(file);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
    const mimeType = getDocumentMimeType(file.name)!;
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Fetch Task Details (title, description, clearanceId, staffId)
    const { data: taskData, error: taskFetchError } = await supabaseAdmin
      .from("clearance_tasks")
      .select("assigned_task_id, title, description, clearance_id, staff_id")
      .eq("assigned_task_id", taskId)
      .single();

    if (taskFetchError || !taskData) {
      console.warn("Could not fetch assigned task details:", taskFetchError);
    }

    // 2. Fetch Department AI Configuration
    const { data: deptData } = await supabaseAdmin
      .from("clearance_departments")
      .select("dept_id, dept_name, ai_verification_mode, ai_confidence_threshold")
      .ilike("dept_name", department.trim())
      .maybeSingle();

    const aiMode = deptData?.ai_verification_mode || "two_factor";
    const confidenceThreshold = deptData?.ai_confidence_threshold ?? 85;

    // 3. Upload File to Supabase Storage
    const timestamp = Date.now();
    const sanitizedDept = department.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
    const sanitizedTask = task.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
    const extension = file.name.split(".").pop()!.toLowerCase();
    const file_name = `${studentId}_${sanitizedDept}_${sanitizedTask}_${timestamp}.${extension}`;
    const file_path = `user_uploads/${file_name}`;

    const { error: upload_error } = await supabaseAdmin.storage
      .from("images")
      .upload(file_path, file, { upsert: true, contentType: mimeType });

    if (upload_error) {
      console.error("Storage Upload Error:", upload_error);
      return NextResponse.json(
        { error: "Failed to upload file to storage" },
        { status: 500 },
      );
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("images").getPublicUrl(file_path);

    // Resolve client's full name instead of raw studentId
    let clientName = studentId;
    const { data: studentRecord } = await supabaseAdmin
      .from("students")
      .select("student_name")
      .eq("student_id", studentId)
      .maybeSingle();

    if (studentRecord?.student_name) {
      clientName = studentRecord.student_name;
    } else {
      const { data: staffRecord } = await supabaseAdmin
        .from("staffs")
        .select("staff_name")
        .eq("staff_id", studentId)
        .maybeSingle();
      if (staffRecord?.staff_name) {
        clientName = staffRecord.staff_name;
      }
    }

    // 4. Execute Factor 1 AI Verification (if not set to strict manual)
    let newStatus = "Submitted";
    let commentText: string | null = null;
    let aiReport: any = null;

    if (aiMode === "manual") {
      newStatus = "Submitted";
      commentText = null;
    } else {
      // Buffer for OpenRouter vision model
      const fileBuffer = Buffer.from(await file.arrayBuffer());

      aiReport = await verifyDocumentAuthenticity({
        departmentName: department,
        taskTitle: taskData?.title || task,
        taskDescription: taskData?.description || "",
        expectedStudentId: studentId,
        expectedStudentName: clientName,
        fileBuffer,
        mimeType,
        fileName: file.name,
      });

      if (aiReport.processingFailed) {
        // AI analysis encountered an error or could not complete
        // Prompt staff intervention with manual verification without flagging the student
        newStatus = "Submitted";
        commentText = null;
      } else {
        const isHighConfidence =
          aiReport.isAuthentic &&
          aiReport.studentIdMatches &&
          aiReport.authenticityScore >= confidenceThreshold;

        if (isHighConfidence) {
          if (aiMode === "autonomous") {
            // Autonomous Mode: Directly clear task
            newStatus = "Cleared";
            commentText = null;
          } else {
            // Two-Factor Verification Mode (DEFAULT):
            // AI verified authenticity firsthand -> sets to 'Verified' awaiting Factor 2 staff authorization
            newStatus = "Verified";
            commentText = null;
          }
        } else {
          // Did not meet threshold or detected discrepancy
          newStatus = "Flagged";
          commentText = null;
        }
      }
    }

    // 5. Update clearance_tasks in Supabase
    const { error: statusError } = await supabaseAdmin
      .from("clearance_tasks")
      .update({
        status: newStatus,
        comments: commentText,
        ai_audit_report: aiReport,
        dropbox: publicUrl,
        uploaded_at: new Date().toISOString(),
      })
      .eq("assigned_task_id", taskId);

    if (statusError) {
      console.error("Status Update Error:", statusError);
      return NextResponse.json({ error: statusError.message }, { status: 500 });
    }

    // Invalidate server-side clearance cache & department cache
    invalidateServerClearanceCache(studentId);
    invalidateServerDepartmentCache();

    // 6. Notify Department Staff of New Document Submission
    if (deptData?.dept_id) {
      try {
        const notifTitle =
          newStatus === "Flagged"
            ? "Submission Flagged for Review"
            : newStatus === "Verified"
            ? "AI-Verified Document for Review"
            : "New Document Submission";

        const notifDesc = `${clientName} submitted "${taskData?.title || task}" for ${department}.`;
        const refUrl = `/department/clients?status=submissions&clientId=${encodeURIComponent(studentId)}&taskId=${encodeURIComponent(taskId)}`;

        await supabaseAdmin.from("notifications").insert({
          user_id: taskData?.staff_id || null,
          department_id: deptData.dept_id,
          target_role: "department",
          category: "submission",
          title: notifTitle,
          description: notifDesc,
          type: newStatus === "Flagged" ? "Warning" : "Info",
          ref_url: refUrl,
          is_read: false,
          metadata: {
            studentId,
            studentName: clientName,
            taskId,
            taskTitle: taskData?.title || task,
            departmentId: deptData.dept_id,
            departmentName: department,
            status: newStatus,
          },
        });
      } catch (deptNotifErr) {
        console.error("Failed to notify department staff:", deptNotifErr);
      }
    }

    return NextResponse.json({
      url: publicUrl,
      status: newStatus,
      aiReport,
      comment: commentText,
    });
  } catch (error: any) {
    console.error("Submission processing error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
