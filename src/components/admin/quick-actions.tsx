import Button from '@/components/admin/button'
import Input from '@/components/admin/input'
import { BuildingIcon, FilterIcon, PlusIcon, SearchIcon } from 'lucide-react'

type QuickActionsProps = {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onCreateTemplate?: () => void;
  onManageDepartments?: () => void;
  onFilter?: () => void;
}

const QuickActions = ({
  searchValue = "",
  onSearchChange,
  onCreateTemplate,
  onManageDepartments,
  onFilter,
}: QuickActionsProps) => {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-6 w-full">
      
      {/* Top Row: Title & Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Quick Actions</h2>
          <p className="text-sm text-gray-500">Manage templates, reports, and departments</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <Button 
            variant='primary' 
            onClick={onCreateTemplate}
            className="bg-slate-900 text-white hover:bg-slate-800 px-4 py-2.5 whitespace-nowrap flex items-center gap-2"
          >
            <PlusIcon className='h-4 w-4' />
            <span>Create Template</span>
          </Button>

          <Button 
            variant="outline" 
            onClick={onManageDepartments}
            className="border-gray-300 text-slate-700 hover:bg-gray-50 px-4 py-2.5 whitespace-nowrap flex items-center gap-2"
          >
            <BuildingIcon className="h-4 w-4" />
            <span>Departments</span>
          </Button>
        </div>
      </div>

      {/* Bottom Row: Search & Filter */}
      <div className="flex items-center gap-3 w-full">
        <div className="flex-1">
          <Input 
            type="text"
            placeholder="Search templates or students..."
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            // The Input component now handles this icon correctly
            leftIcon={<SearchIcon className="h-4 w-4" />} 
          />
        </div>

        <button 
            onClick={onFilter}
            className="p-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-600 transition-colors shrink-0"
            aria-label="Filter"
        >
          <FilterIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

export default QuickActions