import { createClient } from "@/lib/db/supabase-server";
import VerifyDocument from "@/lib/services/ocr";
import OpenRouterAI from "@/lib/services/open-router";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const FormSchema = z.object({
  file: z.instanceof(File),
  task: z.string(),
  taskId: z.coerce.number(),
  studentId: z.string(),
  department: z.string(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const form = await req.formData();
  const formObject = Object.fromEntries(form.entries());
  const formData = FormSchema.safeParse(formObject);

  if (!formData.success) {
    return NextResponse.json(
      { error: "Invalid submission data" },
      { status: 400 }
    );
  }

  const { file, task, taskId, studentId, department } = formData.data;

  const generate_rules = OpenRouterAI({ task });

  const file_name = `${studentId}.${department.trim()}.(${task})`;
  const file_path = `user_uploads/${file_name}`;

  const { error: upload_error } = await supabase.storage
    .from("images")
    .upload(file_path, file, { upsert: true });

  if (upload_error) {
    console.error("Upload Error:", upload_error);
    return NextResponse.json(
      { error: "Failed to upload to bucket" },
      { status: 500 },
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("images").getPublicUrl(file_path);
  console.log("public url", publicUrl);

  const rules = await generate_rules;
  const document_result = await VerifyDocument({ rules, file });

const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

  const { error: statusError } = await supabaseAdmin
    .from("clearance_tasks")
    .update({
      status: document_result,
      dropbox: publicUrl,
      uploaded_at: new Date().toISOString(),
    })
    .eq("assigned_task_id", taskId);

  if (statusError) {
    console.error("Status Update Error:", statusError);
    return NextResponse.json({ message: statusError.message, status: 500 });
  }

  return NextResponse.json({ url: publicUrl });
}
