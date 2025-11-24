import { getClientSupabaseClient } from '../supabase/client'

const AUTH_STORAGE_KEY = 'dripchecks_auth_session'
const AUTH_EXPIRY_KEY = 'dripchecks_auth_expiry'

/**
 * Client-side authentication persistence utility
 * Provides localStorage fallback for cross-tab session sharing
 */
export class AuthPersistence {
  private static instance: AuthPersistence
  private supabase = getClientSupabaseClient()

  static getInstance(): AuthPersistence {
    if (!AuthPersistence.instance) {
      AuthPersistence.instance = new AuthPersistence()
    }
    return AuthPersistence.instance
  }

  /**
   * Store session data in localStorage for cross-tab persistence
   */
  storeSession(session: any): void {
    if (typeof window === 'undefined') return

    try {
      const sessionData = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        user: session.user,
        expires_at: session.expires_at || Date.now() + (60 * 60 * 1000) // 1 hour default
      }

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionData))
      localStorage.setItem(AUTH_EXPIRY_KEY, sessionData.expires_at.toString())
    } catch (error) {
      console.warn('Failed to store session in localStorage:', error)
    }
  }

  /**
   * Retrieve session data from localStorage
   */
  getStoredSession(): any | null {
    if (typeof window === 'undefined') return null

    try {
      const sessionData = localStorage.getItem(AUTH_STORAGE_KEY)
      const expiryTime = localStorage.getItem(AUTH_EXPIRY_KEY)

      if (!sessionData || !expiryTime) return null

      // Check if session has expired
      if (Date.now() > parseInt(expiryTime)) {
        this.clearStoredSession()
        return null
      }

      return JSON.parse(sessionData)
    } catch (error) {
      console.warn('Failed to retrieve session from localStorage:', error)
      return null
    }
  }

  /**
   * Clear stored session data
   */
  clearStoredSession(): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      localStorage.removeItem(AUTH_EXPIRY_KEY)
    } catch (error) {
      console.warn('Failed to clear session from localStorage:', error)
    }
  }

  /**
   * Sync session between tabs using storage events
   */
  initCrossTabSync(): void {
    if (typeof window === 'undefined') return

    // Listen for storage changes from other tabs
    window.addEventListener('storage', (event) => {
      if (event.key === AUTH_STORAGE_KEY) {
        // Session changed in another tab
        if (event.newValue) {
          // New session available, try to restore it immediately
          this.restoreSessionFromStorage()
        } else {
          // Session cleared in another tab, redirect to login
          this.clearStoredSession()
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
        }
      }
    })

    // Listen for Supabase auth state changes
    this.supabase?.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        this.storeSession(session)
        // Broadcast session change to other tabs
        this.broadcastSessionChange('SIGNED_IN')
      } else if (event === 'SIGNED_OUT') {
        this.clearStoredSession()
        // Broadcast session change to other tabs
        this.broadcastSessionChange('SIGNED_OUT')
      } else if (event === 'TOKEN_REFRESHED' && session) {
        this.storeSession(session)
      }
    })

    // Check for existing session on page load
    this.restoreSessionIfNeeded()
  }

  /**
   * Broadcast session changes to other tabs
   */
  private broadcastSessionChange(event: 'SIGNED_IN' | 'SIGNED_OUT'): void {
    if (typeof window === 'undefined') return
    
    try {
      // Use a temporary storage event to notify other tabs
      const eventKey = 'dripchecks_auth_event'
      localStorage.setItem(eventKey, JSON.stringify({ event, timestamp: Date.now() }))
      // Remove immediately to trigger storage event
      localStorage.removeItem(eventKey)
    } catch (error) {
      console.warn('Failed to broadcast session change:', error)
    }
  }

  /**
   * Restore session directly from localStorage without async checks
   */
  private async restoreSessionFromStorage(): Promise<void> {
    const storedSession = this.getStoredSession()
    if (!storedSession) return

    try {
      await this.supabase!.auth.setSession({
        access_token: storedSession.access_token,
        refresh_token: storedSession.refresh_token
      })
    } catch (error) {
      console.warn('Failed to restore session from storage:', error)
      this.clearStoredSession()
    }
  }

  /**
   * Attempt to restore session from localStorage if cookies fail
   */
  async restoreSessionIfNeeded(): Promise<boolean> {
    if (typeof window === 'undefined') return false

    try {
      // Check if we already have a valid session
      const { data: { session } } = await this.supabase!.auth.getSession()
      if (session && session.user) {
        // Store the session to ensure cross-tab sync
        this.storeSession(session)
        return true
      }

      // Try to restore from localStorage
      const storedSession = this.getStoredSession()
      if (!storedSession) return false

      // Attempt to set the session
      const { data, error } = await this.supabase!.auth.setSession({
        access_token: storedSession.access_token,
        refresh_token: storedSession.refresh_token
      })

      if (error || !data.session) {
        console.warn('Failed to restore session:', error)
        this.clearStoredSession()
        return false
      }

      // Update stored session with fresh data
      this.storeSession(data.session)
      return true
    } catch (error) {
      console.warn('Error restoring session:', error)
      return false
    }
  }

  /**
   * Force session check and restoration - useful for new tabs
   */
  async forceSessionCheck(): Promise<boolean> {
    if (typeof window === 'undefined') return false

    // Always try localStorage first for new tabs
    const storedSession = this.getStoredSession()
    if (storedSession) {
      try {
        const { data, error } = await this.supabase!.auth.setSession({
          access_token: storedSession.access_token,
          refresh_token: storedSession.refresh_token
        })

        if (!error && data.session) {
          return true
        }
      } catch (error) {
        console.warn('Force session check failed:', error)
      }
    }

    // Fallback to regular session check
    return this.restoreSessionIfNeeded()
  }
}

// Export singleton instance
export const authPersistence = AuthPersistence.getInstance()

// Auto-initialize cross-tab sync when module loads
if (typeof window !== 'undefined') {
  authPersistence.initCrossTabSync()
}
