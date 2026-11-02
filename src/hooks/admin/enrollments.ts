import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface BulkImportPayload {
  type?: "student" | "staff";
  clients: Array<{
    id?: string;
    student_id?: string;
    staff_id?: string;
    name?: string;
    email: string;
    phoneNumber?: string;
    course_name?: string;
    year?: number;
    semester?: number;
    section_number?: number;
    section_id?: number;
  }>;
}

export interface Section {
  section_id: number;
  course_id: number;
  course_name: string;
  year: number;
  semester: number;
  section_number: number;
  section_code: string;
  enrolled_count: number;
}

// 1. Fetch course sections
export function useFetchSections(courseId?: number) {
  return useQuery<Section[]>({
    queryKey: ["admin", "sections", courseId || "all"],
    queryFn: async () => {
      const url = courseId ? `/api/admin/sections?course_id=${courseId}` : `/api/admin/sections`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch sections");
      }
      const json = await res.json();
      return json.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

// 2. Create section
export function useCreateSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { course_id: number; year: number; semester: number; section_number: number }) => {
      const res = await fetch("/api/admin/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create section");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "sections"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
    },
  });
}

// 3. Delete section
export function useDeleteSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (section_id: number) => {
      const res = await fetch("/api/admin/sections", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section_id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete section");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "sections"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
    },
  });
}

// 4. Bulk import roster
export function useBulkImportRoster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: BulkImportPayload) => {
      const res = await fetch("/api/admin/enrollments/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Bulk import failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "student-templates"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "course-templates"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "staff-templates"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "sections"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}
