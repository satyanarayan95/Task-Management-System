import UserAvatar from './UserAvatar'
import { cn } from '../lib/utils'

const UserAvatarGroup = ({ 
  users = [], 
  size = 'default', 
  max = 3,
  className,
  showTooltip = true,
  ...props 
}) => {
  const displayUsers = users.slice(0, max)
  const remainingCount = users.length - max

  if (users.length === 0) {
    return null
  }

  return (
    <div className={cn("flex -space-x-2", className)} {...props}>
      {displayUsers.map((user, index) => (
        <div
          key={user._id || user.id || index}
          className="relative ring-2 ring-background rounded-full"
          style={{ zIndex: displayUsers.length - index }}
        >
          <UserAvatar 
            user={user} 
            size={size} 
            showTooltip={showTooltip}
          />
        </div>
      ))}
      
      {remainingCount > 0 && (
        <div
          className="relative ring-2 ring-background rounded-full"
          style={{ zIndex: 0 }}
        >
          <div className={cn(
            "flex items-center justify-center rounded-full bg-muted text-muted-foreground font-medium border-2 border-background",
            size === 'sm' ? 'h-6 w-6 text-xs' :
            size === 'md' ? 'h-8 w-8 text-sm' :
            size === 'lg' ? 'h-12 w-12 text-base' :
            size === 'xl' ? 'h-16 w-16 text-lg' :
            'h-10 w-10 text-sm'
          )}>
            +{remainingCount}
          </div>
        </div>
      )}
    </div>
  )
}

export default UserAvatarGroup