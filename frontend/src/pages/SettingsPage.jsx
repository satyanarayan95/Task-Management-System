import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Label } from '../components/ui/label'
import { Switch } from '../components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Separator } from '../components/ui/separator'
import { Badge } from '../components/ui/badge'
import { useUIStore } from '../stores'
import { toast } from '../lib/toast'
import {
  Settings,
  Bell,
  Palette,
  Globe,
  Shield,
  Database,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Moon,
  Sun,
  Monitor
} from 'lucide-react'

const SettingsPage = () => {
  const { theme, toggleTheme } = useUIStore()
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: true,
      reminders: true,
      overdue: true,
      assignments: true
    },
    appearance: {
      theme: theme,
      compactMode: false,
      showAvatars: true,
      showTaskCounts: true
    },
    behavior: {
      autoSave: true,
      confirmDeletes: true,
      showCompletedTasks: true,
      defaultView: 'grid'
    },
    privacy: {
      shareData: false,
      analytics: false,
      crashReports: true
    }
  })

  const handleSettingChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }))
  }

  const handleSaveSettings = () => {
    toast.success('Settings saved successfully!')
  }

  const handleExportData = () => {
    toast.info('Data export feature coming soon!')
  }

  const handleImportData = () => {
    toast.info('Data import feature coming soon!')
  }

  const handleClearData = () => {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      toast.info('Data clearing feature coming soon!')
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-600 mt-1">
          Customize your TaskFlow experience
        </p>
      </div>
      
      <Card className="border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-gray-600" />
            Notifications
          </CardTitle>
          <CardDescription className="text-gray-500">
            Configure how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-sm text-gray-500">Receive notifications via email</p>
            </div>
            <Switch
              id="email-notifications"
              checked={settings.notifications.email}
              onCheckedChange={(checked) => handleSettingChange('notifications', 'email', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="push-notifications">Push Notifications</Label>
              <p className="text-sm text-gray-500">Receive browser push notifications</p>
            </div>
            <Switch
              id="push-notifications"
              checked={settings.notifications.push}
              onCheckedChange={(checked) => handleSettingChange('notifications', 'push', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="reminder-notifications">Task Reminders</Label>
              <p className="text-sm text-gray-500">Get reminded about upcoming tasks</p>
            </div>
            <Switch
              id="reminder-notifications"
              checked={settings.notifications.reminders}
              onCheckedChange={(checked) => handleSettingChange('notifications', 'reminders', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="overdue-notifications">Overdue Alerts</Label>
              <p className="text-sm text-gray-500">Get notified when tasks become overdue</p>
            </div>
            <Switch
              id="overdue-notifications"
              checked={settings.notifications.overdue}
              onCheckedChange={(checked) => handleSettingChange('notifications', 'overdue', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5 text-gray-600" />
            Appearance
          </CardTitle>
          <CardDescription className="text-gray-500">
            Customize the look and feel of your interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="theme-select">Theme</Label>
              <p className="text-sm text-gray-500">Choose your preferred theme</p>
            </div>
            <Select
              value={settings.appearance.theme}
              onValueChange={(value) => {
                handleSettingChange('appearance', 'theme', value)
                toggleTheme()
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    Light
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    Dark
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    System
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="compact-mode">Compact Mode</Label>
              <p className="text-sm text-gray-500">Use a more compact interface</p>
            </div>
            <Switch
              id="compact-mode"
              checked={settings.appearance.compactMode}
              onCheckedChange={(checked) => handleSettingChange('appearance', 'compactMode', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show-avatars">Show User Avatars</Label>
              <p className="text-sm text-gray-500">Display user avatars in task lists</p>
            </div>
            <Switch
              id="show-avatars"
              checked={settings.appearance.showAvatars}
              onCheckedChange={(checked) => handleSettingChange('appearance', 'showAvatars', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show-task-counts">Show Task Counts</Label>
              <p className="text-sm text-gray-500">Display task counts in sidebar</p>
            </div>
            <Switch
              id="show-task-counts"
              checked={settings.appearance.showTaskCounts}
              onCheckedChange={(checked) => handleSettingChange('appearance', 'showTaskCounts', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5 text-gray-600" />
            Behavior
          </CardTitle>
          <CardDescription className="text-gray-500">
            Configure how the application behaves
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-save">Auto Save</Label>
              <p className="text-sm text-gray-500">Automatically save changes</p>
            </div>
            <Switch
              id="auto-save"
              checked={settings.behavior.autoSave}
              onCheckedChange={(checked) => handleSettingChange('behavior', 'autoSave', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="confirm-deletes">Confirm Deletions</Label>
              <p className="text-sm text-gray-500">Ask for confirmation before deleting</p>
            </div>
            <Switch
              id="confirm-deletes"
              checked={settings.behavior.confirmDeletes}
              onCheckedChange={(checked) => handleSettingChange('behavior', 'confirmDeletes', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show-completed">Show Completed Tasks</Label>
              <p className="text-sm text-gray-500">Display completed tasks in lists</p>
            </div>
            <Switch
              id="show-completed"
              checked={settings.behavior.showCompletedTasks}
              onCheckedChange={(checked) => handleSettingChange('behavior', 'showCompletedTasks', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="default-view">Default View</Label>
              <p className="text-sm text-gray-500">Choose the default task view</p>
            </div>
            <Select
              value={settings.behavior.defaultView}
              onValueChange={(value) => handleSettingChange('behavior', 'defaultView', value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">Grid</SelectItem>
                <SelectItem value="list">List</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="h-5 w-5 text-gray-600" />
            Data Management
          </CardTitle>
          <CardDescription className="text-gray-500">
            Manage your data and account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Export Data</Label>
              <p className="text-sm text-gray-500">Download your tasks and data</p>
            </div>
            <Button variant="outline" onClick={handleExportData}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Import Data</Label>
              <p className="text-sm text-gray-500">Import tasks from another source</p>
            </div>
            <Button variant="outline" onClick={handleImportData}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-red-600">Clear All Data</Label>
              <p className="text-sm text-gray-500">Permanently delete all your data</p>
            </div>
            <Button variant="destructive" onClick={handleClearData}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Data
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} className="bg-blue-600 hover:bg-blue-700">
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  )
}

export default SettingsPage