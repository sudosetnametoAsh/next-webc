import { Students } from "@/types/student/student-data";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import {
  ChevronDown,
  Circle,
  CircleAlert,
  CircleCheck,
  CircleCheckBig,
  Minus,
  Upload,
} from "lucide-react";
import DropBox from "./dropbox";
import { Button } from "../ui/button";

export default function ClearanceItem({
  students,
  dummyDesc,
  id,
}: {
  students: Students;
  dummyDesc: string;
  id: string;
}) {
  const isCashierSigned = students
    .filter((e) => e.clearance_templates.departments.dept_name === "Cashier")
    .every((e) => e.status === "Signed");

  const isNonRegistrarSigned = students
    .filter((e) => e.clearance_templates.departments.dept_name !== "Registrar")
    .every((e) => e.status === "Signed");

  // Logic per department
  const isDisabled = (deptName: string) => {
    // Cashier: never disabled by this logic (can be disabled by other conditions if needed)
    if (deptName === "Cashier") return false;

    // Registrar: disabled if Cashier NOT signed OR if other depts (excluding Registrar) NOT all signed
    if (deptName === "Registrar") {
      return !isCashierSigned || !isNonRegistrarSigned;
    }

    // All other departments: disabled if Cashier NOT signed
    return !isCashierSigned;
  };

  // Define department order priority
  const getDeptPriority = (deptName: string): number => {
    const lowerName = deptName.toLowerCase();
    if (lowerName === "cashier") return 0; // Always first
    if (lowerName === "registrar") return 999; // Always last
    return 1; // Middle group (alphabetical)
  };

  // Sort students by department priority, then alphabetically for middle group
  const sortedStudents = [...students].sort((a, b) => {
    const deptA = a.clearance_templates.departments.dept_name;
    const deptB = b.clearance_templates.departments.dept_name;

    const priorityA = getDeptPriority(deptA);
    const priorityB = getDeptPriority(deptB);

    // Different priority groups - sort by priority
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Same priority group - alphabetical sort (case-insensitive)
    return deptA.toLowerCase().localeCompare(deptB.toLowerCase());
  });

  return (
    <Accordion
      type="multiple"
      id="clearance"
      className="flex flex-col items-center gap-2"
    >
      {sortedStudents.map((item) => {
        const deptName = item.clearance_templates.departments.dept_name;
        const staffName = item.clearance_templates.staffs.staff_name;
        const taskTotal = item.assigned_tasks.length;
        const isSigned = item.status === "Signed";

        const pendingTask = item.assigned_tasks.reduce(
          (acc, curr) => {
            if (curr.dropbox === "pending" || curr.dropbox === null) acc.Task++;

            return acc;
          },
          { Task: 0 },
        );

        return (
          <AccordionItem
            value={item.clearance_id.toString()}
            key={item.clearance_id}
            className={`${isSigned ? "border border-[#00BC7D]" : "border border-[#E7E5E2]"} group w-[60vw] rounded-md bg-[#FFFFFF]`}
            // disabled={isDisabled(deptName)}
          >
            <AccordionTrigger
              className={`${taskTotal === 0 ? "pointer-events-none" : ""} flex cursor-pointer flex-row items-center gap-3 p-4 transition-colors hover:bg-slate-50 hover:no-underline`}
            >
              {/* trigger icon container*/}
              <div className="flex w-6 items-center justify-center">
                {taskTotal !== 0 ? (
                  <ChevronDown
                    className="transition-transform duration-200 group-data-[state=open]:rotate-180"
                    color="#000000"
                    size={20}
                  />
                ) : null}
              </div>

              {/* department, staff container*/}
              <div className="flex flex-col justify-center">
                {/* department */}
                <span className="text-lg font-semibold">{deptName}</span>
                {/* staff */}
                <span className="text-sm text-slate-400">{staffName}</span>
              </div>

              {/* task count, clr status */}
              <section className="ml-auto flex items-center gap-2">
                {/* tak count */}
                {pendingTask.Task !== 0 && (
                  <span className="rounded-xl border border-[#E5EAF1] bg-[#FFFFFF] px-2 py-1 text-[12px] font-medium">
                    {pendingTask.Task} Tasks
                  </span>
                )}

                {/* status */}
                <span
                  className={`${item.status !== "Signed" ? "border-[#E5EAF1] bg-[#FFFFFF]" : "border-none bg-[#00BC7D] text-[#FFFFFF]"} rounded-xl border px-2 py-1 text-[12px] font-medium`}
                >
                  {item.status !== "Signed" ? "Pending" : "Signed"}
                </span>
              </section>
            </AccordionTrigger>

            <AccordionContent className="">
              <Accordion type="multiple" className="mx-5 flex flex-col gap-3">
                {item.assigned_tasks.map((task) => {
                  const isCompleted = task.status === "Completed";
                  return (
                    <AccordionItem
                      key={task.assigned_task_id}
                      value={task.assigned_task_id.toString()}
                      className="group/task"
                    >
                      {/* task list */}
                      <AccordionTrigger
                        className={`${task.dropbox === "NULL" ? "pointer-events-none" : ""} flex cursor-pointer flex-row items-center gap-3 rounded-md border p-4 transition-all duration-200 group-data-[state=open]/task:rounded-b-none hover:bg-slate-50 hover:no-underline`}
                      >
                        {task.dropbox === "NULL" ? (
                          task.status === "Completed" ? (
                            <CircleCheckBig color="#21D1EC" size={20} />
                          ) : (
                            <Minus color="#000000" size={20} />
                          )
                        ) : task.dropbox === "pending" ? (
                          <Circle color="#000000" size={20} />
                        ) : (
                          <CircleCheckBig color="#21D1EC" size={20} />
                        )}

                        <section className="flex flex-col">
                          <span
                            className={`${isSigned || isCompleted ? "line-through" : ""} text-[16px] font-medium text-slate-500`}
                          >
                            {task.description}
                          </span>
                          <span className="block text-sm text-slate-400 group-data-[state=open]/task:hidden">
                            {dummyDesc}
                          </span>
                        </section>

                        {/* trigger && status */}
                        <span className="ml-auto flex flex-row items-center gap-2">
                          {task.dropbox !== "NULL" &&
                            task.dropbox !== "pending" && (
                              <div
                                id="status-container"
                                className="flex items-center justify-center gap-2 rounded-sm bg-[#00BC7D] px-2 py-1 text-xs font-medium text-white"
                              >
                                <Upload size={12} />
                                <span>Submitted</span>
                              </div>
                            )}

                          {task.dropbox !== "NULL" && (
                            <ChevronDown className="transition-transform duration-200 group-data-[state=open]/task:rotate-180" />
                          )}
                        </span>
                      </AccordionTrigger>

                      <AccordionContent>
                        <section className="flex flex-col gap-5 border-x border-b p-4">
                          {/* date and status */}
                          {task.dropbox === "NULL" ||
                            (task.dropbox !== "pending" && (
                              <section className="flex items-center gap-2">
                                <span className="flex items-center gap-2 text-sm font-medium text-[#4ADE80]">
                                  <CircleCheck color="#4ADE80" size={20} />
                                  Completed
                                </span>

                                <span className="text-sm text-slate-400">
                                  {task.uploaded_at}
                                </span>
                              </section>
                            ))}

                          {/* description */}
                          <section className="flex flex-col gap-2">
                            <span
                              id="description-header"
                              className="font-semibold"
                            >
                              Description:
                            </span>
                            <span
                              id="description"
                              className="text-[15px] text-slate-400"
                            >
                              {dummyDesc}
                            </span>
                          </section>

                          {/* upload alert */}
                          <section className="flex flex-col gap-2 font-medium">
                            {task.dropbox === "NULL" ||
                            task.dropbox === "pending" ? (
                              <span className="flex items-center gap-2 text-sm font-medium text-[#93C5FD]">
                                <CircleAlert color="#5FA3F8" size={15} />
                                File upload required
                              </span>
                            ) : (
                              <span
                                id="upload-status"
                                className="flex items-center gap-2 text-sm font-medium text-[#4ADE80]"
                              >
                                <CircleCheckBig color="#46D37C" size={15} />
                                File Submitted
                              </span>
                            )}
                          </section>

                          {task.dropbox === "pending" ? (
                            <DropBox
                              task={task.description}
                              taskId={task.assigned_task_id}
                              deptName={deptName}
                              studentId={id}
                              dropbox={task.dropbox}
                            />
                          ) : (
                            <Button className="w-20">
                              <a href={`${task.dropbox}`}>View</a>
                            </Button>
                          )}

                          {/* <Button className="w-20">Close</Button> */}
                        </section>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
