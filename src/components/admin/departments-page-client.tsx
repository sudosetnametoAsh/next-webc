"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  MoreVertical,
  MapPin,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  useFetchDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
} from "@/hooks/admin/departments";
import { useToast } from "@/hooks/use-toast";
import DepartmentFormModal from "@/components/admin/department-form-modal";
import ConfirmationModal from "@/components/admin/confirmation-modal";
import { getDepartmentIcon } from "@/lib/department-icons";
import { Departments } from "@/types/admin";
import TablePaginationFooter from "@/components/admin/table-pagination-footer";

const PAGE_SIZE = 10;

export default function AdminDepartmentsPage() {
  const [page, setPage] = useState(1);

  // Form modal state (for both create and edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Departments | null>(null);

  // Delete modal state
  const [deleteDept, setDeleteDept] = useState<Departments | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Hooks
  const { data: departments = [], isLoading } = useFetchDepartments();
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const deleteMutation = useDeleteDepartment();

  const { success, error } = useToast();

  const totalPages = Math.ceil(departments.length / PAGE_SIZE) || 1;
  const paginatedDepartments = departments.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // Handle Save (Create or Update)
  const handleSaveDepartment = async (data: {
    dept_id?: number;
    dept_name: string;
    icon_name: string;
    floor?: string | null;
    room?: string | null;
  }) => {
    try {
      if (data.dept_id) {
        await updateMutation.mutateAsync({
          dept_id: data.dept_id,
          dept_name: data.dept_name,
          icon_name: data.icon_name,
          floor: data.floor,
          room: data.room,
        });
        success(`Department "${data.dept_name}" updated successfully.`);
      } else {
        await createMutation.mutateAsync({
          dept_name: data.dept_name,
          icon_name: data.icon_name,
          floor: data.floor,
          room: data.room,
        });
        success(`Department "${data.dept_name}" created successfully.`);
      }
    } catch (err: any) {
      error(err.message || "Failed to save department");
      throw err;
    }
  };

  // Handle Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteDept) return;
    try {
      setIsDeleting(true);
      await deleteMutation.mutateAsync(deleteDept.dept_id);
      success(`Department "${deleteDept.dept_name}" deleted successfully.`);
      if (paginatedDepartments.length === 1 && page > 1) {
        setPage((p) => Math.max(1, p - 1));
      }
      setDeleteDept(null);
    } catch (err: any) {
      error(err.message || "Failed to delete department");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
        {/* ── 1. Top Header Row (Complimenting Clients Page) ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1">
              Clearance Departments
            </h1>
            <p className="text-sm text-slate-400">
              Manage participating campus offices, signing authorities, and representational icons
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedDept(null);
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 text-sm shadow-md shadow-amber-500/20 transition-ui cursor-pointer self-start sm:self-auto"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Add Department</span>
          </button>
        </div>

        {/* ── 2. Departments Table Card (Dark Theme, Matching Clients Table) ── */}
        <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-800 bg-[#0a101f] shadow-2xl overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden min-h-0 flex-1 overflow-auto md:block">
            <table className="w-full">
              <colgroup>
                <col className="w-full" />
                <col className="w-16" />
              </colgroup>
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-slate-800 bg-[#070c18]">
                  <th className="px-6 py-4 text-left text-[11px] font-bold tracking-wider uppercase text-slate-400">
                    DEPARTMENT
                  </th>
                  <th className="px-6 py-4 text-right w-16">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-16 text-center text-sm text-slate-400">
                      <div className="flex items-center justify-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
                        <span>Loading departments...</span>
                      </div>
                    </td>
                  </tr>
                ) : departments.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-16 text-center text-sm text-slate-400">
                      No departments registered yet. Click &quot;Add Department&quot; above to create one.
                    </td>
                  </tr>
                ) : (
                  paginatedDepartments.map((dept) => {
                    const DeptIcon = getDepartmentIcon(dept.icon_name, dept.dept_name);

                    return (
                      <tr
                        key={dept.dept_id}
                        className="group border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Department Name, Icon & Location */}
                        <td className="px-6 py-4 text-left">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 shadow-inner group-hover:border-amber-500/40 group-hover:bg-amber-500/20 transition-ui">
                              <DeptIcon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 text-left">
                              <div
                                className="font-semibold text-slate-100 text-sm truncate"
                                title={dept.dept_name}
                              >
                                {dept.dept_name}
                              </div>
                              {dept.floor || dept.room ? (
                                <div className="flex items-center gap-1.5 font-mono text-xs text-slate-400 truncate mt-0.5">
                                  <MapPin className="h-3 w-3 shrink-0 text-amber-400" />
                                  <span>
                                    {[dept.floor, dept.room].filter(Boolean).join(" · ")}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 font-mono text-xs text-slate-500 italic truncate mt-0.5">
                                  <MapPin className="h-3 w-3 shrink-0 text-slate-600" />
                                  <span>—</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Dropdown Actions */}
                        <td className="px-6 py-4 text-right whitespace-nowrap w-16">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors cursor-pointer ml-auto"
                                title="Department options"
                              >
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-44 border border-slate-800 bg-[#0a101f] text-slate-200 shadow-xl rounded-xl p-1"
                            >
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedDept(dept);
                                  setIsModalOpen(true);
                                }}
                                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg cursor-pointer"
                              >
                                <Pencil className="h-3.5 w-3.5 text-amber-400" />
                                <span>Edit Department</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-slate-800/80 my-1" />
                              <DropdownMenuItem
                                onClick={() => setDeleteDept(dept)}
                                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                                <span>Delete Department</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="min-h-0 flex-1 overflow-auto md:hidden divide-y divide-slate-800/60">
            {isLoading ? (
              <div className="px-6 py-16 text-center text-sm text-slate-400">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-amber-400 mb-2" />
                Loading departments...
              </div>
            ) : departments.length === 0 ? (
              <div className="px-6 py-16 text-center text-sm text-slate-400">
                No departments registered yet.
              </div>
            ) : (
              paginatedDepartments.map((dept) => {
                const DeptIcon = getDepartmentIcon(dept.icon_name, dept.dept_name);

                return (
                  <div
                    key={dept.dept_id}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 shadow-inner">
                        <DeptIcon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-100 truncate">
                          {dept.dept_name}
                        </p>
                        {dept.floor || dept.room ? (
                          <p className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mt-0.5 truncate">
                            <MapPin className="h-3 w-3 shrink-0 text-amber-400" />
                            <span>{[dept.floor, dept.room].filter(Boolean).join(" · ")}</span>
                          </p>
                        ) : (
                          <p className="flex items-center gap-1.5 text-xs text-slate-500 font-mono italic mt-0.5 truncate">
                            <MapPin className="h-3 w-3 shrink-0 text-slate-600" />
                            <span>—</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Ellipsis Dropdown for Mobile */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors cursor-pointer shrink-0"
                          title="Department options"
                        >
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-44 border border-slate-800 bg-[#0a101f] text-slate-200 shadow-xl rounded-xl p-1"
                      >
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedDept(dept);
                            setIsModalOpen(true);
                          }}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5 text-amber-400" />
                          <span>Edit Department</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-800/80 my-1" />
                        <DropdownMenuItem
                          onClick={() => setDeleteDept(dept)}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                          <span>Delete Department</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Pagination Footer ── */}
          <TablePaginationFooter
            currentPage={page}
            pageSize={PAGE_SIZE}
            totalItems={departments.length}
            itemLabel={departments.length === 1 ? "department" : "departments"}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* ── 4. Department Create / Edit Modal (With Full Lucide Icon Selector) ── */}
      <DepartmentFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedDept(null);
        }}
        initialData={selectedDept}
        onSave={handleSaveDepartment}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      {/* ── 5. Confirmation Modal for Deletions ── */}
      <ConfirmationModal
        isOpen={Boolean(deleteDept)}
        onClose={() => setDeleteDept(null)}
        onConfirm={handleConfirmDelete}
        variant="destructive"
        title="Delete Department"
        description={`Are you sure you want to delete "${deleteDept?.dept_name}"? This action cannot be undone and may affect active clearance templates.`}
        confirmLabel="Yes, Delete"
        isLoading={isDeleting}
      />
    </>
  );
}
