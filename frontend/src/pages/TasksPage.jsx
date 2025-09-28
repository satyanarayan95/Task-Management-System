import React, { useState, useCallback, useRef } from 'react'
import { Plus, Search, X, Clock } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import TaskList from '../components/TaskList'
import TaskForm from '../components/TaskForm'
import { debounce } from '../lib/utils'

const TasksPage = () => {
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [localSearchValue, setLocalSearchValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [recentSearches, setRecentSearches] = useState([])
  const [searchResetKey, setSearchResetKey] = useState(0)
  
  const searchRef = useRef(null)
  
  const debouncedSearch = useCallback(
    debounce((value) => {
      setSearchTerm(value)
      setSearchResetKey(prev => prev + 1) // Reset pagination when search changes
      if (value.trim()) {
        setRecentSearches(prev => {
          const filtered = prev.filter(item => item !== value)
          return [value, ...filtered].slice(0, 5)
        })
      }
    }, 300),
    []
  )

  const handleSearchChange = (e) => {
    const value = e.target.value
    setLocalSearchValue(value)
    debouncedSearch(value)
  }

  const handleClear = () => {
    setLocalSearchValue('')
    setSearchTerm('')
    setSearchResetKey(prev => prev + 1) // Reset pagination when clearing search
    if (searchRef.current) {
      searchRef.current.focus()
    }
  }

  const handleRecentSearchClick = (searchValue) => {
    setLocalSearchValue(searchValue)
    setSearchTerm(searchValue)
    setSearchResetKey(prev => prev + 1) // Reset pagination when clicking recent search
    setIsFocused(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleClear()
      setIsFocused(false)
    }
    if (e.key === 'Enter' && localSearchValue.trim()) {
      setIsFocused(false)
    }
  }

  React.useEffect(() => {
    setShowDropdown(isFocused && (localSearchValue.length > 0 || recentSearches.length > 0))
  }, [isFocused, localSearchValue, recentSearches.length])

  const handleNewTask = () => {
    setIsTaskFormOpen(true)
  }

  const handleTaskFormClose = () => {
    setIsTaskFormOpen(false)
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
            <p className="text-gray-600 mt-2">
              Manage and organize your tasks for better productivity
            </p>
          </div>
          <Button 
            onClick={handleNewTask}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
        
        <div className="relative max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              type="text"
              placeholder="Search tasks..."
              value={localSearchValue}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 150)}
              className="pl-10 pr-10"
              autoComplete="off"
            />
            {localSearchValue && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
              {recentSearches.length > 0 && !localSearchValue && (
                <div className="p-2">
                  <div className="text-xs font-medium text-gray-500 mb-2 px-2">
                    Recent searches
                  </div>
                  {recentSearches.slice(0, 5).map((search, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleRecentSearchClick(search)}
                      className="w-full text-left px-2 py-2 rounded-sm hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="text-sm">{search}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!localSearchValue && recentSearches.length === 0 && (
                <div className="p-4 text-center text-sm text-gray-500">
                  <Search className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  <p>Start typing to search tasks</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <TaskList searchTerm={searchTerm} searchResetKey={searchResetKey} />

      <TaskForm
        isOpen={isTaskFormOpen}
        onClose={handleTaskFormClose}
        mode="create"
      />
    </div>
  )
}

export default TasksPage