import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authAPI } from '../lib/api'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      lastTokenRefresh: null,
      isRefreshing: false, // Prevent multiple simultaneous refresh attempts

      login: (user, accessToken, refreshToken) => {
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
          lastTokenRefresh: Date.now()
        })
      },

      logout: async () => {
        const { accessToken, refreshToken } = get()
        
        if (accessToken) {
          try {
            await authAPI.logout(refreshToken)
          } catch (error) {
            console.error('Logout API call failed:', error)
          }
        }

        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          lastTokenRefresh: null
        })
      },

      logoutAll: async () => {
        const { accessToken, refreshToken } = get()
        
        if (accessToken) {
          try {
            await authAPI.logoutAll(refreshToken)
          } catch (error) {
            console.error('Logout all API call failed:', error)
          }
        }

        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          lastTokenRefresh: null
        })
      },

      updateProfile: (userData) => {
        set((state) => ({
          user: { ...state.user, ...userData }
        }))
      },

      setLoading: (loading) => {
        set({ isLoading: loading })
      },

      refreshAccessToken: async () => {
        const { refreshToken, isRefreshing } = get()
        
        // When using httpOnly cookies, refreshToken may be null in client state

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            const checkRefresh = () => {
              const { isRefreshing, accessToken } = get()
              if (!isRefreshing) {
                if (accessToken) {
                  resolve(accessToken)
                } else {
                  reject(new Error('Token refresh failed'))
                }
              } else {
                setTimeout(checkRefresh, 100)
              }
            }
            checkRefresh()
          })
        }

        set({ isRefreshing: true })

        try {
          const response = await authAPI.refreshToken(refreshToken)
          
          if (response.success) {
            set({
              accessToken: response.data.accessToken,
              lastTokenRefresh: Date.now(),
              isRefreshing: false
            })
            return response.data.accessToken
          } else {
            throw new Error(response.error || 'Token refresh failed')
          }
        } catch (error) {
          console.error('Token refresh failed:', error)
          set({ isRefreshing: false })
          
          if (error.message?.includes('REFRESH_TOKEN_EXPIRED') || 
              error.message?.includes('INVALID_REFRESH_TOKEN')) {
            console.warn('Refresh token expired or invalid, user needs to re-login')
            get().logout()
          } else {
            console.warn('Token refresh failed but continuing with current token')
          }
          
          throw error
        }
      },

      needsTokenRefresh: () => {
        const { lastTokenRefresh } = get()
        if (!lastTokenRefresh) return false
        
        const tenMinutesAgo = Date.now() - (10 * 60 * 1000)
        return lastTokenRefresh < tenMinutesAgo
      },

      initializeAuth: async () => {
        const { accessToken, user, refreshAccessToken } = get()

        // If no user info at all, consider unauthenticated
        if (!user) {
          set({ isAuthenticated: false })
          return
        }

        set({ isLoading: true })

        try {
          if (!accessToken) {
            // Try to bootstrap an access token using httpOnly cookie
            try {
              await refreshAccessToken()
            } catch (e) {
              // If refresh fails, treat as logged out
              set({ isAuthenticated: false, isLoading: false })
              return
            }
          }

          const response = await authAPI.getProfile()
          if (response.success) {
            set({
              isAuthenticated: true,
              isLoading: false,
              user: response.data.user
            })
          } else {
            if (response.error?.code === 'TOKEN_EXPIRED' || response.error?.code === 'INVALID_TOKEN') {
              try {
                await refreshAccessToken()
                set({ isAuthenticated: true, isLoading: false })
              } catch (refreshError) {
                console.error('Token refresh during initialization failed:', refreshError)
                get().logout()
              }
            } else {
              get().logout()
            }
          }
        } catch (error) {
          console.error('Auth initialization failed:', error)
          if (error.message?.includes('Network Error') || error.message?.includes('timeout')) {
            console.warn('Network error during auth initialization, continuing with stored token')
            set({ isAuthenticated: true, isLoading: false })
          } else {
            get().logout()
          }
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        lastTokenRefresh: state.lastTokenRefresh
      })
    }
  )
)

export default useAuthStore