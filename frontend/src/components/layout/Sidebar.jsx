import { Link, useLocation } from 'react-router-dom'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'
import { useTaskStore } from '../../stores'
import { cn } from '../../lib/utils'
import { 
  LayoutDashboard,
  CheckSquare2,
  Activity,
  FolderOpen
} from 'lucide-react'

const Sidebar = ({ onClose }) => {
  const location = useLocation()
  const { tasks } = useTaskStore()
  const isActivePath = (path) => location.pathname === path || location.pathname.startsWith(path)
  const allTasks = tasks.length

  const navItems = [
    { 
      path: '/dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard,
      count: null
    },
    { 
      path: '/tasks', 
      label: 'Tasks', 
      icon: CheckSquare2,
      count: allTasks
    },
    { 
      path: '/categories', 
      label: 'Categories', 
      icon: FolderOpen,
      count: null
    },
    { 
      path: '/activity', 
      label: 'Activity', 
      icon: Activity,
      count: null
    }
  ]

  return (
    <div className="flex h-full flex-col bg-white border-r border-gray-200">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* App Title */}
          <div className="flex items-center space-x-3 pb-4 border-b border-gray-200">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 shadow-sm">
              <CheckSquare2 className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="text-lg font-semibold text-gray-900">TaskFlow</span>
            </div>
          </div>
          
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = isActivePath(item.path)
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== null && item.count > 0 && (
                    <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-700">
                      {item.count}
                    </Badge>
                  )}
                </Link>
              )
            })}
          </div>

        </div>
      </ScrollArea>
    </div>
  )
}

export default Sidebar