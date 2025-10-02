import React, { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Check, ChevronsUpDown, X, User } from 'lucide-react';
import UserAvatar from './UserAvatar';
import { authAPI } from '../lib/api';
import { cn } from '../lib/utils';

const UserSelector = ({ 
  value = [], 
  onChange, 
  placeholder = "Select users...",
  multiple = true,
  className 
}) => {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await authAPI.getUsers();
        if (response.success) {
          setUsers(response.data);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const selectedUsers = Array.isArray(value) ? value : (value ? [value] : []);
  const selectedUserIds = selectedUsers.map(user => typeof user === 'string' ? user : user._id);

  const handleSelect = (userId) => {
    const user = users.find(u => u._id === userId);
    if (!user) return;

    if (multiple) {
      const isSelected = selectedUserIds.includes(userId);
      if (isSelected) {
        const newSelection = selectedUsers.filter(u => 
          (typeof u === 'string' ? u : u._id) !== userId
        );
        onChange?.(newSelection);
      } else {
        onChange?.([...selectedUsers, user]);
      }
    } else {
      onChange?.(user);
      setOpen(false);
    }
  };

  const handleRemove = (userId) => {
    if (multiple) {
      const newSelection = selectedUsers.filter(u => 
        (typeof u === 'string' ? u : u._id) !== userId
      );
      onChange?.(newSelection);
    } else {
      onChange?.(null);
    }
  };

  if (!multiple) {
    const selectedUser = selectedUsers[0];
    
    return (
      <Select
        value={selectedUser ? (typeof selectedUser === 'string' ? selectedUser : selectedUser._id) : ''}
        onValueChange={(userId) => {
          if (userId) {
            const user = users.find(u => u._id === userId);
            onChange?.(user);
          } else {
            onChange?.(null);
          }
        }}
      >
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder}>
            {selectedUser && (
              <div className="flex items-center gap-2">
                <UserAvatar 
                  user={typeof selectedUser === 'string' 
                    ? users.find(u => u._id === selectedUser) 
                    : selectedUser
                  } 
                  size="sm" 
                />
                <span>
                  {typeof selectedUser === 'string' 
                    ? users.find(u => u._id === selectedUser)?.fullName 
                    : selectedUser.fullName
                  }
                </span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                <User className="h-3 w-3" />
              </div>
              No assignee
            </div>
          </SelectItem>
          {users.map((user) => (
            <SelectItem key={user._id} value={user._id}>
              <div className="flex items-center gap-2">
                <UserAvatar user={user} size="sm" />
                <div className="flex flex-col">
                  <span className="text-sm">{user.fullName}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((user) => {
            const userObj = typeof user === 'string' ? users.find(u => u._id === user) : user;
            if (!userObj) return null;
            
            return (
              <Badge key={userObj._id} variant="secondary" className="flex items-center gap-2 pr-1">
                <UserAvatar user={userObj} size="sm" />
                <span className="text-xs">{userObj.fullName}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(userObj._id)}
                  className="h-4 w-4 p-0 hover:bg-transparent"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            );
          })}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedUsers.length > 0 
              ? `${selectedUsers.length} user${selectedUsers.length === 1 ? '' : 's'} selected`
              : placeholder
            }
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search users..." />
            <CommandList>
              <CommandEmpty>
                {loading ? 'Loading users...' : 'No users found.'}
              </CommandEmpty>
              <CommandGroup>
                {users.map((user) => (
                  <CommandItem
                    key={user._id}
                    value={user.fullName}
                    onSelect={() => handleSelect(user._id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedUserIds.includes(user._id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex items-center gap-2">
                      <UserAvatar user={user} size="sm" />
                      <div className="flex flex-col">
                        <span className="text-sm">{user.fullName}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default UserSelector;