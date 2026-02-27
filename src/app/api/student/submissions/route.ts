import VerifyDocument from "@/lib/ocr/ocr";
import OpenRouterAI from "@/lib/open-ai/open-router";
import { createClient } from "@/lib/supabase-config";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const supabase = createClient();

const FormSchema = z.object({
  file: z.instanceof(File),
  task: z.string(),
  taskId: z.coerce.number(),
  studentId: z.string(),
  department: z.string(),
});

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const formObject = Object.fromEntries(form.entries());
  const formData = FormSchema.safeParse(formObject);

  if (!formData.success) throw new Error("Invalid data");
  console.log(formData.data);

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

  const { error: statusError } = await supabase
    .from("assigned_tasks")
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
