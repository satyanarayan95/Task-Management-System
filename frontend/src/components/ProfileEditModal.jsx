import { useState, useEffect } from 'react'
import { Eye, EyeOff, Loader2, User, Save } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Alert, AlertDescription } from './ui/alert'
import { Progress } from './ui/progress'
import UserAvatar from './UserAvatar'
import { useAuthStore } from '../stores'
import { authAPI } from '../lib/api'
import { userValidation } from '../lib/validation'
import { toast } from '../lib/toast'

const ProfileEditModal = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuthStore()
  
  const [formData, setFormData] = useState({
    fullName: '',
    currentPassword: '',
    newPassword: ''
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [generalError, setGeneralError] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [activeTab, setActiveTab] = useState('profile') // 'profile' or 'password'

  useEffect(() => {
    if (user && isOpen) {
      setFormData(prev => ({
        ...prev,
        fullName: user.fullName || ''
      }))
      setFieldErrors({})
      setGeneralError('')
      setActiveTab('profile')
    }
  }, [user, isOpen])

  const calculatePasswordStrength = (password) => {
    let strength = 0
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    }
    
    strength = Object.values(checks).filter(Boolean).length
    return { strength: (strength / 5) * 100, checks }
  }

  const passwordStrength = calculatePasswordStrength(formData.newPassword)

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }))
    }
    
    if (generalError) {
      setGeneralError('')
    }
  }

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    
    const profileData = {
      fullName: formData.fullName
    }

    const validation = userValidation.validateProfileUpdate(profileData)
    if (!validation.isValid) {
      setFieldErrors(validation.fieldErrors)
      return
    }

    setIsUpdating(true)
    setGeneralError('')

    try {
      const result = await authAPI.updateProfile(profileData)
      
      if (result.success) {
        updateProfile(result.data.user)
        toast.success('Profile updated successfully!')
        onClose()
      } else {
        setGeneralError(result.error.message)
        if (result.error.errors?.length > 0) {
          const errors = {}
          result.error.errors.forEach(err => {
            errors[err.field] = err.message
          })
          setFieldErrors(errors)
        }
      }
    } catch (error) {
      setGeneralError('An unexpected error occurred. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    
    const passwordData = {
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword
    }

    if (!passwordData.currentPassword) {
      setFieldErrors(prev => ({ ...prev, currentPassword: 'Current password is required' }))
      return
    }

    if (!passwordData.newPassword) {
      setFieldErrors(prev => ({ ...prev, newPassword: 'New password is required' }))
      return
    }

    setIsChangingPassword(true)
    setGeneralError('')

    try {
      const result = await authAPI.updateProfile(passwordData)
      
      if (result.success) {
        toast.success('Password changed successfully!')
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: ''
        }))
        onClose()
      } else {
        setGeneralError(result.error.message)
        if (result.error.errors?.length > 0) {
          const errors = {}
          result.error.errors.forEach(err => {
            errors[err.field] = err.message
          })
          setFieldErrors(errors)
        }
      }
    } catch (error) {
      setGeneralError('An unexpected error occurred. Please try again.')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleClose = () => {
    setFormData({
      fullName: '',
      currentPassword: '',
      newPassword: ''
    })
    setFieldErrors({})
    setGeneralError('')
    setActiveTab('profile')
    onClose()
  }

  if (!user) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Edit Profile
          </DialogTitle>
        </DialogHeader>

        {generalError && (
          <Alert variant="destructive">
            <AlertDescription>{generalError}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <UserAvatar user={user} size="lg" />
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold truncate">{user.fullName}</h3>
            <p className="text-sm text-gray-500 truncate">{user.email}</p>
          </div>
        </div>

        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'profile'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'password'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Password
          </button>
        </div>

        {activeTab === 'profile' && (
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={formData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                className={fieldErrors.fullName ? 'border-red-500' : ''}
                disabled={isUpdating}
                placeholder="Enter your full name"
              />
              {fieldErrors.fullName && (
                <p className="text-sm text-red-500">{fieldErrors.fullName}</p>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {activeTab === 'password' && (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="Enter your current password"
                  value={formData.currentPassword}
                  onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                  className={fieldErrors.currentPassword ? 'border-red-500 pr-10' : 'pr-10'}
                  disabled={isChangingPassword}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  disabled={isChangingPassword}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
              {fieldErrors.currentPassword && (
                <p className="text-sm text-red-500">{fieldErrors.currentPassword}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Enter your new password"
                  value={formData.newPassword}
                  onChange={(e) => handleInputChange('newPassword', e.target.value)}
                  className={fieldErrors.newPassword ? 'border-red-500 pr-10' : 'pr-10'}
                  disabled={isChangingPassword}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  disabled={isChangingPassword}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
              
              {formData.newPassword && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Password strength:</span>
                    <span className={`font-medium ${
                      passwordStrength.strength < 40 ? 'text-red-600' :
                      passwordStrength.strength < 70 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {passwordStrength.strength < 40 ? 'Weak' :
                       passwordStrength.strength < 70 ? 'Medium' : 'Strong'}
                    </span>
                  </div>
                  <Progress value={passwordStrength.strength} className="h-2" />
                </div>
              )}
              
              {fieldErrors.newPassword && (
                <p className="text-sm text-red-500">{fieldErrors.newPassword}</p>
              )}
            </div>


            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Changing...
                  </>
                ) : (
                  'Change Password'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ProfileEditModal
