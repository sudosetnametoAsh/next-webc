import { Button } from '@/components/ui/button';
import {
   DropdownMenu,
   DropdownMenuCheckboxItem,
   DropdownMenuContent,
   //    DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDepartmentContext } from '@/context/deparment';

export default function FilterButton() {
   const { statusFilter, setStatusFilter, orderFilter, setOrderFilter } =
      useDepartmentContext();
   const preventDefault = (event: Event) => {
      return event.preventDefault();
   };
   console.log(orderFilter);
   return (
      <DropdownMenu>
         <DropdownMenuTrigger asChild>
            <Button variant={'outline'} className="p-2.5!">
               Select Filter
            </Button>
         </DropdownMenuTrigger>

         <DropdownMenuContent className="p-2.5!">
            {/* <DropdownMenuLabel> Status</DropdownMenuLabel> */}
            <DropdownMenuCheckboxItem
               checked={statusFilter === 'All'}
               onCheckedChange={() => setStatusFilter('All')}
               onSelect={preventDefault}
               className="pl-8!"
            >
               All
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
               checked={statusFilter === 'Signed'}
               onCheckedChange={() => setStatusFilter('Signed')}
               onSelect={preventDefault}
               className="pl-8!"
            >
               Signed
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
               checked={statusFilter === 'Pending'}
               onCheckedChange={() => {
                  setStatusFilter('Pending');
               }}
               onSelect={preventDefault}
               className="pl-8!"
            >
               Pending
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator className="m-1.5!" />
            {/* <DropdownMenuLabel> Order </DropdownMenuLabel> */}
            <DropdownMenuCheckboxItem
               checked={orderFilter === 'A-Z'}
               onCheckedChange={() => setOrderFilter('A-Z')}
               onSelect={preventDefault}
               className="pl-8!"
            >
               A-Z
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
               checked={orderFilter === 'Z-A'}
               onCheckedChange={() => setOrderFilter('Z-A')}
               onSelect={preventDefault}
               className="pl-8!"
            >
               Z-A
            </DropdownMenuCheckboxItem>
         </DropdownMenuContent>
      </DropdownMenu>
   );
}
