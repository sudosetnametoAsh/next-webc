import Button from '@/components/admin/button'
import Input from '@/components/admin/input'
import { BuildingIcon, FilterIcon, PlusIcon, Search, SearchIcon } from 'lucide-react'

type QuickActionsProps = {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onCreateTemplate?: () => void;
  onManageDepartments?: () => void;
  onFilter?: () => void;
}

const QuickActionss = ({
  searchValue = "",
  onSearchChange,
  onCreateTemplate,
  onManageDepartments,
  onFilter,
}: QuickActionsProps) => {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          <p className="text-sm text-gray-500">Manage templates, reports, and departments</p>
        </div>

        <div className="flex gap-2">
          {/* Create Template button */}
          <Button variant='primary' leftIcon={<PlusIcon className='h-4 w-4' />} onClick={onCreateTemplate}>
            Create Template
          </Button>

          {/* Department button */}
          <Button variant="outline" leftIcon={<BuildingIcon className="h-4 w-4" />} onClick={onManageDepartments}>
            Departments
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mt-4 flex gap-2">
        <div className="flex-1">
          <Input 
            type="text"
            placeholder="Search"
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            leftIcon={<SearchIcon className="h-4 w-4" />}
          />
        </div>

        <Button variant="outline" className="shrink-0 px-3" onClick={onFilter}>
          <FilterIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default QuickActionss