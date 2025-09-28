import { Avatar, AvatarFallback } from './ui/avatar'
import { cn } from '../lib/utils'

const UserAvatar = ({ 
  user, 
  size = 'default', 
  className,
  showTooltip = false,
  ...props 
}) => {
  const getInitials = (name) => {
    if (!name) return 'U'
    
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getAvatarSize = () => {
    switch (size) {
      case 'sm':
        return 'h-6 w-6 text-xs'
      case 'md':
        return 'h-8 w-8 text-sm'
      case 'lg':
        return 'h-12 w-12 text-base'
      case 'xl':
        return 'h-16 w-16 text-lg'
      case '2xl':
        return 'h-20 w-20 text-xl'
      default:
        return 'h-10 w-10 text-sm'
    }
  }

  const getBackgroundColor = (name) => {
    if (!name) return 'bg-gray-500'
    
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-cyan-500'
    ]
    
    const hash = name.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc)
    }, 0)
    
    return colors[Math.abs(hash) % colors.length]
  }

  const initials = getInitials(user?.fullName || user?.name)
  const backgroundColor = getBackgroundColor(user?.fullName || user?.name)
  
  const avatarElement = (
    <Avatar 
      className={cn(getAvatarSize(), className)} 
      {...props}
    >
      <AvatarFallback 
        className={cn(
          backgroundColor,
          'text-white font-semibold border-2 border-white shadow-sm'
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  )

  if (showTooltip && user?.fullName) {
    return (
      <div className="relative group">
        {avatarElement}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
          {user.fullName}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    )
  }

  return avatarElement
}

export default UserAvatar