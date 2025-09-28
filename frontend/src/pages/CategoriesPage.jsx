import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, FolderOpen, MoreHorizontal, Search, Filter } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
import { useTaskStore } from '../stores'
import { useUIStore } from '../stores'
import { categoryAPI } from '../lib/api'
import { toast } from '../lib/toast'
import CategoryForm from '../components/CategoryForm'
import DeleteCategoryDialog from '../components/DeleteCategoryDialog'

const CategoriesPage = () => {
  const { categories, setCategories, deleteCategory } = useTaskStore()
  const { modals, openModal, closeModal } = useUIStore()
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('name')

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setLoading(true)
      const result = await categoryAPI.getCategories()
      if (result.success) {
        setCategories(result.data)
      } else {
        toast.error('Failed to load categories')
      }
    } catch (error) {
      console.error('Error loading categories:', error)
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  const handleAddCategory = () => {
    setSelectedCategory(null)
    openModal('categoryForm')
  }

  const handleEditCategory = (category) => {
    setSelectedCategory(category)
    openModal('categoryForm')
  }

  const handleDeleteCategory = (category) => {
    setSelectedCategory(category)
    openModal('deleteConfirm')
  }

  const confirmDeleteCategory = async () => {
    if (!selectedCategory) return

    try {
      const result = await categoryAPI.deleteCategory(selectedCategory._id)
      if (result.success) {
        deleteCategory(selectedCategory._id)
        toast.success('Category deleted successfully')
        closeModal('deleteConfirm')
        setSelectedCategory(null)
      } else {
        toast.error(result.error || 'Failed to delete category')
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      toast.error('Failed to delete category')
    }
  }

  const filteredCategories = categories
    .filter(category => 
      category.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'tasks':
          return (b.taskCount || 0) - (a.taskCount || 0)
        case 'date':
          return new Date(b.createdAt) - new Date(a.createdAt)
        default:
          return 0
      }
    })

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
        </div>
        
        <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
                  <div className="h-5 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="w-6 h-6 bg-gray-200 rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
            <p className="text-gray-600 mt-2">
              Organize your tasks with custom categories for better productivity
            </p>
          </div>
          <Button 
            onClick={handleAddCategory}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Category
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-gray-200">
                <Filter className="h-4 w-4 mr-2" />
                Sort by {sortBy === 'name' ? 'Name' : sortBy === 'tasks' ? 'Tasks' : 'Date'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortBy('name')}>
                Sort by Name
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('tasks')}>
                Sort by Task Count
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('date')}>
                Sort by Date Created
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {filteredCategories.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FolderOpen className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchQuery ? 'No categories found' : 'No categories yet'}
          </h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            {searchQuery 
              ? `No categories match "${searchQuery}". Try adjusting your search.`
              : 'Create your first category to start organizing your tasks better.'
            }
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCategories.map((category) => (
            <Card key={category._id} className="group hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-gray-300 bg-white">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full shadow-sm"
                      style={{ backgroundColor: category.color || '#6b7280' }}
                    />
                    <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {category.name}
                    </CardTitle>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => handleEditCategory(category)} className="cursor-pointer">
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit Category
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDeleteCategory(category)}
                        className="text-red-600 cursor-pointer hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Category
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 font-medium">
                      {category.taskCount || 0} tasks
                    </Badge>
                    {category.createdAt && (
                      <span className="text-sm text-gray-500">
                        Created {new Date(category.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {category.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {category.description}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CategoryForm
        isOpen={modals.categoryForm}
        onClose={() => {
          closeModal('categoryForm')
          setSelectedCategory(null)
        }}
        category={selectedCategory}
        onSuccess={loadCategories}
      />

      <DeleteCategoryDialog
        isOpen={modals.deleteConfirm}
        onClose={() => {
          closeModal('deleteConfirm')
          setSelectedCategory(null)
        }}
        category={selectedCategory}
        onConfirm={confirmDeleteCategory}
      />
    </div>
  )
}

export default CategoriesPage