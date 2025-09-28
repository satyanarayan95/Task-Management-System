import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { X, ChevronDown, Search, Check } from 'lucide-react';
import UserAvatar from './UserAvatar';
import { taskAPI } from '../lib/api';
import { cn } from '../lib/utils';
import { useAuthStore } from '../stores';

const useDebounce = (value, delay) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
};

const MultiSelectAutocomplete = ({
  value = [],
  onChange,
  placeholder = 'Search and assign users...',
  className,
  autoSelectCurrentUser = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const { user: currentUser } = useAuthStore();

  const debouncedSearch = useDebounce(searchQuery, 400);

  const selectedUsers = Array.isArray(value) ? value : value ? [value] : [];
  const selectedUserIds = selectedUsers.map((u) => (typeof u === 'string' ? u : u._id));

  const fetchUsers = useCallback(
    async (search = '') => {
      try {
        setLoading(true);
        const res = await taskAPI.getUsers(search);
        if (res.success) {
          let fetched = res.data || [];
          if (currentUser && !fetched.find((u) => u._id === currentUser._id)) {
            fetched = [currentUser, ...fetched];
          }
          setUsers(fetched);
        } else {
          setUsers([]);
        }
      } catch (e) {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    },
    [currentUser]
  );

  useEffect(() => {
    if (!hasInitialLoad) {
      if (selectedUsers.length > 0) {
        fetchUsers();
      }
      setHasInitialLoad(true);
    }
  }, [selectedUsers.length, fetchUsers, hasInitialLoad]);

  useEffect(() => {
    if (hasInitialLoad && debouncedSearch.length >= 2) {
      fetchUsers(debouncedSearch);
    } else if (hasInitialLoad && debouncedSearch.length === 0 && selectedUsers.length === 0) {
      setUsers([]);
    }
  }, [debouncedSearch, fetchUsers, hasInitialLoad, selectedUsers.length]);

  useEffect(() => {
    if (autoSelectCurrentUser && currentUser && selectedUsers.length === 0 && !hasAutoSelected && hasInitialLoad) {
      onChange?.([currentUser]);
      setHasAutoSelected(true);
    }
  }, [autoSelectCurrentUser, currentUser, selectedUsers.length, hasAutoSelected, onChange, hasInitialLoad]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  const handleSelect = (user) => {
    const isSelected = selectedUserIds.includes(user._id);
    if (isSelected) {
      onChange?.(selectedUsers.filter((u) => (typeof u === 'string' ? u : u._id) !== user._id));
    } else {
      onChange?.([...selectedUsers, user]);
    }
    setSearchQuery('');
  };

  const handleRemove = (userId) => {
    onChange?.(selectedUsers.filter((u) => (typeof u === 'string' ? u : u._id) !== userId));
  };

  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  return (
    <div className={cn('relative w-full', className)} ref={containerRef}>
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selectedUsers.map((sel) => {
            const userObj = typeof sel === 'string' ? users.find((u) => u._id === sel) : sel;
            if (!userObj) {
              return (
                <Badge key={typeof sel === 'string' ? sel : sel._id} variant="secondary" className="flex items-center gap-1 pr-1 py-0.5 text-[11px]">
                  <div className="w-4 h-4 rounded-full bg-gray-200 animate-pulse" />
                  <span className="font-medium text-gray-500">
                    {typeof sel === 'string' ? 'Loading...' : sel.fullName || 'Unknown User'}
                  </span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => handleRemove(typeof sel === 'string' ? sel : sel._id)} className="h-4 w-4 p-0 hover:bg-transparent ml-0.5">
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              );
            }
            return (
              <Badge key={userObj._id} variant="secondary" className="flex items-center gap-1 pr-1 py-0.5 text-[11px]">
                <UserAvatar user={userObj} size="sm" />
                <span className="font-medium">
                  {currentUser && userObj._id === currentUser._id ? `${userObj.fullName} (me)` : userObj.fullName}
                </span>
                <Button type="button" variant="ghost" size="icon" onClick={() => handleRemove(userObj._id)} className="h-4 w-4 p-0 hover:bg-transparent ml-0.5">
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            );
          })}
        </div>
      )}

      <div className="relative">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setIsOpen((o) => !o);
            if (!isOpen) setSearchQuery('');
          }}
          className={cn(
            'w-full justify-between h-9 px-2 text-left font-normal',
            !selectedUsers.length && 'text-muted-foreground',
            'border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
          )}
        >
          <span className="truncate text-sm">
            {selectedUsers.length > 0 ? `${selectedUsers.length} user${selectedUsers.length === 1 ? '' : 's'} selected` : placeholder}
          </span>
          <ChevronDown className={cn('h-4 w-4 transition-transform ml-2', isOpen && 'rotate-180')} />
        </Button>

        {isOpen && (
          <div
            className="absolute top-full left-0 right-0 z-[100] mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-72 overflow-hidden"
            style={{ maxWidth: 'calc(100vw - 2rem)', minWidth: '280px' }}
          >
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  ref={inputRef}
                  placeholder="Type to search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-4 text-xs text-gray-500">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                  <span className="ml-2">Searching...</span>
                </div>
              ) : searchQuery.length < 2 && users.length === 0 ? (
                <div className="py-4 text-center text-xs text-gray-500">Type at least 2 characters</div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-4 text-center text-xs text-gray-500">No users found</div>
              ) : (
                <div className="py-1">
                  {filteredUsers.map((user) => {
                    const isCurrentUser = currentUser && user._id === currentUser._id;
                    const isSelected = selectedUserIds.includes(user._id);
                    return (
                      <button
                        type="button"
                        key={user._id}
                        onClick={() => handleSelect(user)}
                        className={cn('w-full flex items-center gap-2 px-2 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0', isSelected && 'bg-blue-50 hover:bg-blue-100')}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <UserAvatar user={user} size="sm" />
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-sm font-medium truncate">{isCurrentUser ? `${user.fullName} (me)` : user.fullName}</span>
                            <span className="text-xs text-gray-500 truncate">{user.email}</span>
                          </div>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-blue-600" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiSelectAutocomplete;