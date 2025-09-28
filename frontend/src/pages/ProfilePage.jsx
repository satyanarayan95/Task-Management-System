import React, { useState, useEffect } from 'react'
import { Eye, EyeOff, Loader2, User, Mail, Save, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Progress } from '../components/ui/progress'
import UserAvatar from '../components/UserAvatar'
import { Separator } from '../components/ui/separator'
import { useAuthStore } from '../stores'
import { authAPI } from '../lib/api'
import { userValidation } from '../lib/validation'
import { toast } from '../lib/toast'

const ProfilePage = () => {
  const { user, updateProfile, isLoading, setLoading } = useAuthStore()
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    currentPassword: '',
    newPassword: ''
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [generalError, setGeneralError] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullName: user.fullName || '',
        email: user.email || ''
      }))
    }
  }, [user])

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
      fullName: formData.fullName,
      email: formData.email
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



  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your account information and security settings.
        </p>
      </div>

      {generalError && (
        <Alert variant="destructive">
          <AlertDescription>{generalError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Update your personal information and email address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 mb-6">
            <UserAvatar user={user} size="2xl" />
            <div>
              <h3 className="text-lg font-semibold">{user.fullName}</h3>
              <p className="text-muted-foreground">{user.email}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Member since {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className={fieldErrors.fullName ? 'border-red-500' : ''}
                  disabled={isUpdating}
                />
                {fieldErrors.fullName && (
                  <p className="text-sm text-red-500">{fieldErrors.fullName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={fieldErrors.email ? 'border-red-500' : ''}
                  disabled={isUpdating}
                />
                {fieldErrors.email && (
                  <p className="text-sm text-red-500">{fieldErrors.email}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Update Profile
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your password to keep your account secure.
          </CardDescription>
        </CardHeader>
        <CardContent>
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


            <div className="flex justify-end">
              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Changing Password...
                  </>
                ) : (
                  'Change Password'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default ProfilePage