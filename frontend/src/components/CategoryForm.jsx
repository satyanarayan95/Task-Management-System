import { useState, useEffect } from 'react'
import { Palette } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover'
import { categoryValidation } from '../lib/validation'
import { categoryAPI } from '../lib/api'
import { useTaskStore } from '../stores'
import { toast } from '../lib/toast'

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#ec4899', // pink
  '#f43f5e', // rose
  '#6b7280', // gray
  '#374151', // gray-700
]

const CategoryForm = ({ isOpen, onClose, category, onSuccess }) => {
  const { addCategory, updateCategory } = useTaskStore()
  const [formData, setFormData] = useState({
    name: '',
    color: '#6b7280'
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)

  const isEditing = Boolean(category)

  useEffect(() => {
    if (isOpen) {
      if (category) {
        setFormData({
          name: category.name || '',
          color: category.color || '#6b7280'
        })
      } else {
        setFormData({
          name: '',
          color: '#6b7280'
        })
      }
      setErrors({})
    }
  }, [isOpen, category])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const handleColorSelect = (color) => {
    handleInputChange('color', color)
    setColorPickerOpen(false)
  }

  const validateForm = () => {
    const validation = isEditing 
      ? categoryValidation.validateUpdate(formData)
      : categoryValidation.validateCreate(formData)
    
    if (validation.isValid) {
      setErrors({})
      return true
    } else {
      setErrors(validation.fieldErrors)
      return false
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      let result
      if (isEditing) {
        result = await categoryAPI.updateCategory(category._id, formData)
        if (result.success) {
          updateCategory(category._id, result.data)
          toast.success('Category updated successfully')
        }
      } else {
        result = await categoryAPI.createCategory(formData)
        if (result.success) {
          addCategory(result.data)
          toast.success('Category created successfully')
        }
      }

      if (result.success) {
        onSuccess?.()
        onClose()
      } else {
        toast.error(result.error || 'Failed to save category')
      }
    } catch (error) {
      toast.error('Failed to save category')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Category' : 'Create New Category'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update your category details below.'
              : 'Add a new category to organize your tasks.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Category Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter category name"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex items-center gap-2">
              <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start gap-2"
                  >
                    <div 
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: formData.color }}
                    />
                    <Palette className="h-4 w-4" />
                    Choose Color
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3">
                  <div className="grid grid-cols-8 gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform ${
                          formData.color === color ? 'border-primary' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => handleColorSelect(color)}
                      />
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <Label htmlFor="custom-color" className="text-xs">Custom Color</Label>
                    <Input
                      id="custom-color"
                      type="color"
                      value={formData.color}
                      onChange={(e) => handleInputChange('color', e.target.value)}
                      className="h-8 mt-1"
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            {errors.color && (
              <p className="text-sm text-destructive">{errors.color}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CategoryForm