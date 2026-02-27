import { z } from "zod";

const TasksSchema = z.object({
  assigned_task_id: z.number(),
  status: z.string(),
  dropbox: z.string().nullable(),
  description: z.string(),
  uploaded_at: z.string().nullable(),
});

const StudentSchema = z.object({
  clearance_id: z.number(),
  status: z.enum(["Signed", "Pending"]),
  clearance_templates: z.object({
    departments: z.object({ dept_name: z.string() }),
    staffs: z.object({ staff_name: z.string() }),
  }),
  assigned_tasks: z.array(TasksSchema),
});

const BalanceSchema = z.object({
  amount: z.number(),
});

const UserDataSchema = z.object({
  name: z.string(),
  email: z.string(),
  id: z.string(),
  balance: z.array(BalanceSchema),
});

export const FetchedDataSchema = z.object({
  user_data: UserDataSchema,
  data: z.array(StudentSchema),
});

export type FetchedData = {
  userData: z.infer<typeof UserDataSchema>;
  students: z.infer<typeof StudentSchema>[];
};

export type Students = z.infer<typeof StudentSchema>[];
