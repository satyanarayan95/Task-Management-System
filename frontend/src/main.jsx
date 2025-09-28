import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from './components/ui/sonner'
import AppRouter from './routes/AppRouter'
import './index.css'

import { useAuthStore } from './stores'

const authStore = useAuthStore.getState()
const token = authStore.accessToken

if (token) {
  authStore.setLoading(true)
  authStore.setLoading(false)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppRouter />
    <Toaster 
      position="top-right"
      expand={false}
      richColors
      closeButton
    />
  </React.StrictMode>,
)