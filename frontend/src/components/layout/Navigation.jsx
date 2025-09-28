import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Button } from '../ui/button'
import { TooltipProvider } from '../ui/tooltip'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet'
import { Separator } from '../ui/separator'
import UserAvatar from '../UserAvatar'
import ProfileEditModal from '../ProfileEditModal'
import NotificationTray from './NotificationTray'
import { useAuthStore, useUIStore } from '../../stores'
import { 
  Menu, 
  LayoutDashboard,
  CheckSquare2, 
  User, 
  LogOut,
  Activity
} from 'lucide-react'

const Navigation = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { toggleTheme } = useUIStore()
  
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleProfileClick = () => {
    setIsProfileModalOpen(true)
  }

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/tasks', label: 'Tasks', icon: CheckSquare2 },
    { path: '/activity', label: 'Activity', icon: Activity }
  ]

  const isActivePath = (path) => location.pathname === path



  return (
    <TooltipProvider>
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white shadow-sm">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-6">

            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden hover:bg-gray-100"
                >
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 px-6">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Navigation</h4>
                    <nav className="space-y-1">
                      {navItems.map((item) => {
                        const Icon = item.icon
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                              isActivePath(item.path)
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        )
                      })}
                    </nav>
                  </div>

                </div>
              </SheetContent>
            </Sheet>

          </div>

          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">

            <NotificationTray />

            <Separator orientation="vertical" className="h-6 hidden sm:block" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:bg-gray-100 transition-all duration-200 cursor-pointer flex-shrink-0">
                  <UserAvatar user={user} size="md" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 max-w-[calc(100vw-2rem)] p-2" align="end" forceMount>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg mb-2">
                  <UserAvatar user={user} size="lg" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.fullName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  onClick={handleProfileClick}
                  className="cursor-pointer"
                >
                  <User className="h-4 w-4 mr-3" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleLogout} 
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      
      <ProfileEditModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </TooltipProvider>
  )
}

export default Navigation