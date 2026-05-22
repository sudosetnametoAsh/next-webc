import { z } from "zod";

const TasksSchema = z.object({
  title: z.string(),
  assigned_task_id: z.number(),
  status: z.string(), // Now handles "Resubmit"
  dropbox: z.string().nullable(),
  description: z.string(),
  uploaded_at: z.string().nullable(),
  comments: z.string().nullable().optional(), // Added to capture staff feedback
});

const ClearanceRecordSchema = z.object({
  clearance_id: z.number(),
  status: z.enum(["Signed", "Pending", "Incomplete"]),
  clearance_templates: z.object({
    departments: z.object({ dept_name: z.string() }),
    staffs: z.object({ staff_name: z.string() }),
  }),
  clearance_tasks: z.array(TasksSchema),
});


const UserDataSchema = z.object({
  name: z.string(),
  email: z.string(),
  id: z.string(),
});

export const FetchedDataSchema = z.object({
  user_data: UserDataSchema,
  data: z.array(ClearanceRecordSchema),
});

export type FetchedData = {
  userData: z.infer<typeof UserDataSchema>;
  students: z.infer<typeof ClearanceRecordSchema>[];
};

export type Students = z.infer<typeof ClearanceRecordSchema>[];
