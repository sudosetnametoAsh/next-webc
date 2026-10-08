import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  //    DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDepartmentContext } from "@/context/deparment";
import { Funnel } from "lucide-react";

export default function FilterButton() {
  const { statusFilter, setStatusFilter, orderFilter, setOrderFilter } =
    useDepartmentContext();
  const preventDefault = (event: Event) => {
    return event.preventDefault();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={"outline"} className="p-2.5! dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">
          {/* Select Filter */}
          <Funnel className="h-4 w-4 text-slate-700 dark:text-slate-300" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="p-2.5! dark:border-slate-800 dark:bg-slate-900">
        {/* <DropdownMenuLabel> Status</DropdownMenuLabel> */}
        <DropdownMenuCheckboxItem
          checked={statusFilter === "All"}
          onCheckedChange={() => setStatusFilter("All")}
          onSelect={preventDefault}
          className="pl-8!"
        >
          All
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={statusFilter === "Signed"}
          onCheckedChange={() => setStatusFilter("Signed")}
          onSelect={preventDefault}
          className="pl-8!"
        >
          Signed
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={statusFilter === "Pending"}
          onCheckedChange={() => {
            setStatusFilter("Pending");
          }}
          onSelect={preventDefault}
          className="pl-8!"
        >
          Pending
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator className="m-1.5!" />
        {/* <DropdownMenuLabel> Order </DropdownMenuLabel> */}
        <DropdownMenuCheckboxItem
          checked={orderFilter === "A-Z"}
          onCheckedChange={() => setOrderFilter("A-Z")}
          onSelect={preventDefault}
          className="pl-8!"
        >
          A-Z
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={orderFilter === "Z-A"}
          onCheckedChange={() => setOrderFilter("Z-A")}
          onSelect={preventDefault}
          className="pl-8!"
        >
          Z-A
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
