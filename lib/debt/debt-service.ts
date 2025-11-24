import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { SupabaseClient, User } from '@supabase/supabase-js'
import { 
  Debt, 
  DebtConsolidation, 
  DebtRepaymentPlan, 
  DebtRepaymentStrategy,
  InterestSavingsResult,
  DebtToIncomeRatio
} from '@/types/debt'
import Cookies from 'js-cookie'
import { supabaseAdmin } from '@/lib/supabase'

export class DebtService {
  private supabase: SupabaseClient
  private cachedUserId: string | null = null
  private isAuthenticatedId: boolean = false
  // Authentication is required for debt management
  private bypassAuthCheck: boolean = false
  private clientConfig: {
    useClientStorage: boolean
    attemptDatabaseOperations: boolean
    useCreateDebtFunction: boolean
  } | null = null
  
  constructor() {
    this.supabase = createClientComponentClient()
  }
  
  // Get the Supabase client for authenticated users only
  private getSupabaseClient() {
    // We don't need to set any headers or cookies for authenticated users
    // as Supabase handles the auth token automatically
    return this.supabase
  }
  
  // This method has been removed as we no longer use client IDs in headers or cookies
  // We only use authenticated user IDs now
  
  // Get client configuration from cookies or use defaults
  private getClientConfig(): {
    useClientStorage: boolean
    attemptDatabaseOperations: boolean
    useCreateDebtFunction: boolean
  } {
    if (this.clientConfig) {
      return this.clientConfig
    }
    
    try {
      if (typeof window !== 'undefined') {
        // Try to get the client configuration from cookies
        const cookieValue = document.cookie
          .split('; ')
          .find(row => row.startsWith('debt-client-config='))
          ?.split('=')?.[1]
        
        if (cookieValue) {
          try {
            const config = JSON.parse(decodeURIComponent(cookieValue))
            this.clientConfig = config
            console.log('Using client configuration from cookie:', config)
            return config
          } catch (parseError) {
            console.warn('Error parsing client configuration from cookie:', parseError)
          }
        }
      }
    } catch (error) {
      console.warn('Error getting client configuration from cookie:', error)
    }
    
    // Default configuration - prioritize database operations, disable local storage
    this.clientConfig = {
      useClientStorage: false,
      attemptDatabaseOperations: true,
      useCreateDebtFunction: false
    }
    
    console.log('Using default client configuration:', this.clientConfig)
    return this.clientConfig
  }
  
  // Helper method to ensure database schema is properly set up
  private async ensureDatabaseSetup(): Promise<void> {
    try {
      // First, call the database setup endpoint to ensure schema is ready
      const setupResponse = await fetch('/api/database/debt-setup', {
        method: 'GET',
        credentials: 'include' // Include cookies for authentication
      })
      if (!setupResponse.ok) {
        const errorData = await setupResponse.json()
        console.warn('Database setup warning:', errorData)
      }
      
      // Then, update the RLS policies to be more permissive
      const rlsResponse = await fetch('/api/database/debts-rls', {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json'
        }
      })
      if (!rlsResponse.ok) {
        const errorData = await rlsResponse.json()
        console.warn('RLS update warning:', errorData)
      }
    } catch (error) {
      console.warn('Failed to run database setup:', error)
      // Continue anyway, as the main operation might still succeed
    }
  }
  
  // Get the current user ID - Using ONLY authenticated user IDs
  private async getUserId(): Promise<string | null> {
    try {
      // If we have a cached authenticated user ID, use it
      if (this.cachedUserId && this.isAuthenticatedId) {
        console.log(`getUserId: Using cached authenticated user ID: ${this.cachedUserId}`)
        return this.cachedUserId
      }
      
      // First check if user is signed in using Supabase client directly
      // This is the most reliable method for client-side authentication
      try {
        // Force refresh the session to ensure we have the latest auth state
        const { data: refreshData } = await this.supabase.auth.refreshSession()
        if (refreshData?.session?.user?.id) {
          console.log(`getUserId: Found user ID from refreshed session: ${refreshData.session.user.id}`)
          this.cachedUserId = refreshData.session.user.id
          this.isAuthenticatedId = true
          return refreshData.session.user.id
        }
      } catch (refreshError) {
        console.warn('Error refreshing session:', refreshError)
        // Continue to other methods even if refresh fails
      }
      
      // Try to get the authenticated user ID from the server
      try {
        const response = await fetch('/api/auth/user', {
          method: 'GET',
          credentials: 'include', // Include cookies for authentication
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.userId) {
            this.cachedUserId = data.userId
            this.isAuthenticatedId = true
            console.log(`getUserId: Found authenticated user ID from server: ${this.cachedUserId}`)
            return this.cachedUserId
          }
        } else {
          console.log(`getUserId: Server returned status ${response.status}`)
        }
      } catch (serverError) {
        console.warn('Error getting user ID from server:', serverError)
      }
      
      // Try to get the user ID from Supabase directly
      try {
        const { data: { user } } = await this.supabase.auth.getUser()
        if (user && user.id) {
          this.cachedUserId = user.id
          this.isAuthenticatedId = true
          console.log(`getUserId: Found authenticated user ID from Supabase: ${this.cachedUserId}`)
          return this.cachedUserId
        }
      } catch (userError) {
        console.warn('Error getting user from Supabase auth.getUser():', userError)
      }
      
      // Try to get authenticated user ID from session
      try {
        const { data: sessionData } = await this.supabase.auth.getSession()
        if (sessionData?.session?.user?.id) {
          console.log(`getUserId: Found user ID from session: ${sessionData.session.user.id}`)
          this.cachedUserId = sessionData.session.user.id
          this.isAuthenticatedId = true
          return sessionData.session.user.id
        }
      } catch (sessionError) {
        console.warn('Error getting session from Supabase:', sessionError)
      }
      
      // Check localStorage for Supabase auth data as a last resort
      try {
        if (typeof window !== 'undefined') {
          const supabaseSession = localStorage.getItem('supabase.auth.token')
          if (supabaseSession) {
            try {
              const sessionData = JSON.parse(supabaseSession)
              if (sessionData?.currentSession?.user?.id) {
                console.log(`getUserId: Found user ID from localStorage: ${sessionData.currentSession.user.id}`)
                this.cachedUserId = sessionData.currentSession.user.id
                this.isAuthenticatedId = true
                return sessionData.currentSession.user.id
              }
            } catch (parseError) {
              console.warn('Error parsing localStorage session:', parseError)
            }
          }
        }
      } catch (localStorageError) {
        console.warn('Error accessing localStorage:', localStorageError)
      }
      
      // If no authenticated user ID found, return null
      console.log('getUserId: No authenticated user found, returning null')
      return null
    } catch (error) {
      console.error('Error in getUserId:', error)
      // Return null instead of a default UUID
      return null
    }
  }

  async getDebts(): Promise<Debt[]> {
    try {
      // Get authenticated user ID
      const userId = await this.getUserId()
      
      // If no authenticated user ID, return empty array
      if (!userId) {
        console.warn('Authentication required to fetch debts')
        return []
      }
      
      // Use the server-side API endpoint to fetch debts
      console.log(`Using server-side API to fetch debts for user: ${userId}`)
      const response = await fetch('/api/debts/list', {
        method: 'GET',
        credentials: 'include' // Include cookies for authentication
      })
      
      if (!response.ok) {
        // If we get a 401 Unauthorized, it means we need to authenticate
        if (response.status === 401) {
          console.log('Authentication required, returning empty debts array')
          return []
        }
        
        const errorData = await response.json()
        console.error('Error from debt list API:', errorData)
        throw new Error(errorData.message || 'Failed to fetch debts')
      }
      
      const result = await response.json()
      console.log('Successfully fetched debts via API:', result)
      
      if (!result.success || !result.debts) {
        console.warn('Invalid response from server when fetching debts')
        return []
      }
      
      return result.debts
    } catch (error) {
      console.error('Error in getDebts:', error)
      return []
    }
  }
  
  // Helper method to get debts from localStorage
  private getLocalDebts(userId: string): Debt[] {
    try {
      if (typeof window === 'undefined') return []
      
      const localDebts = JSON.parse(localStorage.getItem('client-debts') || '[]') as Debt[]
      const userDebts = localDebts.filter(debt => debt.user_id === userId)
      
      // Mark all local debts with isLocal flag
      userDebts.forEach(debt => {
        debt.isLocal = true
      })
      
      // Try to sync local debts to the database if we have any
      if (userDebts.length > 0) {
        console.log(`Attempting to sync ${userDebts.length} local debts to database`)
        this.syncLocalDebtsToDatabase(userDebts, userId).catch((syncError: Error) => {
          console.warn('Failed to sync local debts to database:', syncError)
        })
      }
      
      return userDebts
    } catch (error) {
      console.error('Error getting local debts:', error)
      return []
    }
  }
  
  // Helper method to sync local debts to the database
  private async syncLocalDebtsToDatabase(localDebts: Debt[], userId: string): Promise<void> {
    if (localDebts.length === 0) return
    
    console.log(`Syncing ${localDebts.length} local debts to database`)
    
    // No longer setting client ID in cookies and localStorage
    // We only use authenticated user IDs now
    
    // Try to insert each local debt into the database
    for (const localDebt of localDebts) {
      try {
        // Check if this debt already exists in the database
        const { data: existingData, error: existingError } = await this.getSupabaseClient()
          .from('debts')
          .select('id')
          .eq('id', localDebt.id)
          .maybeSingle()
        
        // If the debt already exists in the database, skip it
        if (!existingError && existingData) {
          console.log(`Debt ${localDebt.id} already exists in database, skipping sync`)
          continue
        }
        
        // Insert the debt into the database
        const { error } = await this.getSupabaseClient()
          .from('debts')
          .insert({
            id: localDebt.id,
            user_id: userId,
            name: localDebt.name,
            type: localDebt.type || 'personal_loan',
            current_balance: localDebt.current_balance,
            interest_rate: localDebt.interest_rate,
            minimum_payment: localDebt.minimum_payment,
            loan_term: localDebt.loan_term,
            due_date: localDebt.due_date,
            created_at: localDebt.created_at,
            updated_at: new Date().toISOString()
          })
        
        if (error) {
          console.warn(`Failed to sync local debt ${localDebt.id} to database:`, error)
        } else {
          console.log(`Successfully synced local debt ${localDebt.id} to database`)
          
          // Remove this debt from localStorage after successful sync
          this.removeLocalDebt(localDebt.id)
        }
      } catch (error) {
        console.warn(`Error syncing local debt ${localDebt.id}:`, error)
      }
    }
  }
  
  // Helper method to remove a debt from localStorage
  private removeLocalDebt(debtId: string): void {
    try {
      if (typeof window === 'undefined') return
      
      const localDebts = JSON.parse(localStorage.getItem('client-debts') || '[]') as Debt[]
      const updatedDebts = localDebts.filter(debt => debt.id !== debtId)
      localStorage.setItem('client-debts', JSON.stringify(updatedDebts))
      
      console.log(`Removed debt ${debtId} from localStorage after database sync`)
    } catch (error) {
      console.warn('Error removing local debt:', error)
    }
  }
  
  // Helper method to update a debt in localStorage
  private updateLocalDebtInStorage(debtId: string, debt: Partial<Debt>): void {
    try {
      if (typeof window === 'undefined') return
      
      const localDebts = JSON.parse(localStorage.getItem('client-debts') || '[]') as Debt[]
      const debtIndex = localDebts.findIndex(d => d.id === debtId)
      
      if (debtIndex === -1) {
        console.warn(`Debt ${debtId} not found in local storage`)
        return
      }
      
      // Update the debt
      localDebts[debtIndex] = {
        ...localDebts[debtIndex],
        ...debt,
        updated_at: new Date().toISOString()
      }
      
      localStorage.setItem('client-debts', JSON.stringify(localDebts))
      console.log(`Successfully updated debt ${debtId} in local storage`)
    } catch (error) {
      console.error('Error updating local debt:', error)
    }
  }
  
  // Helper method to delete a debt from localStorage
  private deleteLocalDebt(debtId: string): void {
    try {
      if (typeof window === 'undefined') return
      
      const localDebts = JSON.parse(localStorage.getItem('client-debts') || '[]') as Debt[]
      const updatedDebts = localDebts.filter(debt => debt.id !== debtId)
      
      localStorage.setItem('client-debts', JSON.stringify(updatedDebts))
      console.log(`Successfully deleted debt ${debtId} from local storage`)
    } catch (error) {
      console.error('Error deleting local debt:', error)
    }
  }

  // Helper method to ensure we have a valid user ID
  private async ensureUserId(): Promise<string> {
    const userId = await this.getUserId()
    if (!userId) {
      console.log('User not authenticated, redirecting to login')
      this.redirectToLogin()
      throw new Error('Authentication required: Please sign in to access this feature')
    }
    return userId
  }

  // Set user ID directly (can be used by components that have access to the user ID)
  setUserId(userId: string): void {
    if (!userId) {
      console.warn('Attempted to set empty user ID')
      return
    }
    
    console.log(`setUserId: Setting user ID to ${userId}`)
    this.cachedUserId = userId
    
    // Also store in cookie for persistence across page loads
    Cookies.set('client-id', userId, { expires: 365 }) // 1 year expiration
  }

  // Get user from Supabase
  async getUser(): Promise<User | null> {
    const { data } = await this.supabase.auth.getUser()
    return data?.user || null
  }

  async createDebt(debt: Omit<Debt, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Debt> {
    try {
      const userId = await this.getUserId()
      
      // If no user ID is found, the user is not authenticated
      if (!userId) {
        console.log('User not authenticated, redirecting to login')
        this.redirectToLogin()
        throw new Error('Authentication required')
      }
      
      // Use the server-side API endpoint to add the debt
      console.log('Using server-side API to add debt')
      const response = await fetch('/api/debts/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // No client ID header - only using authenticated users
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify(debt)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error from debt add API:', errorData)
        
        // Handle authentication errors
        if (response.status === 401) {
          console.log('Authentication error, redirecting to login')
          this.redirectToLogin()
          throw new Error('Authentication required')
        }
        
        throw new Error(errorData.message || 'Failed to add debt')
      }
      
      const result = await response.json()
      console.log('Successfully created debt via API:', result)
      
      if (!result.success || !result.debt) {
        throw new Error('Failed to add debt: Invalid response from server')
      }
      
      return result.debt
    } catch (error) {
      console.error('Error in createDebt:', error)
      throw new Error(`Failed to create debt: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Create a client-side debt object
  private createClientSideDebt(debt: Omit<Debt, 'id' | 'user_id' | 'created_at' | 'updated_at'>, userId: string): Debt {
    const now = new Date().toISOString()
    return {
      id: `local-${crypto.randomUUID()}`,
      user_id: userId,
      name: debt.name,
      type: debt.type || 'personal_loan',
      current_balance: debt.current_balance,
      interest_rate: debt.interest_rate,
      minimum_payment: debt.minimum_payment,
      loan_term: debt.loan_term,
      due_date: debt.due_date,
      created_at: now,
      updated_at: now,
      isLocal: true
    }
  }

  // Store a debt in localStorage
  private storeDebtInLocalStorage(debt: Debt): void {
    try {
      if (typeof window === 'undefined') return
      
      const localDebts = JSON.parse(localStorage.getItem('client-debts') || '[]') as Debt[]
      localDebts.push(debt)
      localStorage.setItem('client-debts', JSON.stringify(localDebts))
    } catch (error) {
      console.error('Error storing debt in localStorage:', error)
    }
  }

  // Attempt to insert into database
  private async attemptDatabaseInsert(
    debt: Omit<Debt, 'id' | 'user_id' | 'created_at' | 'updated_at'>, 
    userId: string, 
    localId: string,
    useCreateDebtFunction: boolean = false
  ): Promise<Debt | null> {
    console.log('Attempting database insert with regular client')
    try {
      // Try to use the RPC function if enabled
      if (useCreateDebtFunction) {
        const { data: rpcData, error: rpcError } = await this.getSupabaseClient().rpc('create_debt', {
          _name: debt.name,
          _type: debt.type || 'personal_loan',
          _current_balance: debt.current_balance,
          _interest_rate: debt.interest_rate,
          _minimum_payment: debt.minimum_payment,
          _loan_term: debt.loan_term || null
        })
        
        if (!rpcError && rpcData) {
          console.log('Successfully created debt in database via RPC')
          
          // First, get the debt from the database
      const { data: debtData, error: getError } = await this.getSupabaseClient()
        .from('debts')
        .select('*')
        .eq('id', rpcData)
        .single()
          
          if (!getError && debtData) {
            return debtData
          }
        } else {
          console.warn('RPC error in database insert:', rpcError)
        }
      }
      
      // Try direct insert
      const dbId = crypto.randomUUID()
      // Try to insert directly into the database
      const { data, error } = await this.getSupabaseClient()
        .from('debts')
        .insert({
          id: dbId,
          name: debt.name,
          type: debt.type || 'personal_loan',
          current_balance: debt.current_balance,
          interest_rate: debt.interest_rate,
          minimum_payment: debt.minimum_payment,
          loan_term: debt.loan_term,
          due_date: debt.due_date,
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
      
      if (!error && data && data.length > 0) {
        console.log('Successfully created debt in database via direct insert')
        return data[0]
      } else {
        console.warn('Direct insert error in database insert:', error)
      }
      
      return null
    } catch (error) {
      console.warn('Error in database insert:', error)
      return null
    }
  }

  // This method is kept for backward compatibility but now just delegates to the client-side approach
  private async attemptDirectInsert(debt: Omit<Debt, 'id' | 'user_id' | 'created_at' | 'updated_at'>, userId: string): Promise<Debt> {
    const clientDebt = this.createClientSideDebt(debt, userId)
    this.storeDebtInLocalStorage(clientDebt)
    return clientDebt;
  }

  // Helper method to check if an error is authentication-related
  private isAuthError(errorMessage?: string): boolean {
    if (!errorMessage) return false
    return errorMessage.includes('JWT') || 
           errorMessage.includes('auth') || 
           errorMessage.includes('Authentication') ||
           errorMessage.includes('permission denied') ||
           errorMessage.includes('not authorized')
  }

  // Helper method to redirect to login page when authentication fails
  private redirectToLogin(): void {
    if (typeof window !== 'undefined') {
      // Check if we're already on the login page to prevent redirect loops
      if (window.location.pathname === '/login') {
        console.log('Already on login page, not redirecting')
        return
      }
      
      // Store the current path to redirect back after login
      const currentPath = window.location.pathname
      if (currentPath !== '/' && !currentPath.includes('/login')) {
        localStorage.setItem('redirectAfterLogin', currentPath)
      }
      
      console.log('Redirecting to login page')
      window.location.href = '/login'
    }
  }
  
  // This method is kept for backward compatibility but now just delegates to the client-side approach
  private async attemptDirectInsert(debt: Omit<Debt, 'id' | 'user_id' | 'created_at' | 'updated_at'>, userId: string): Promise<Debt> {
    const clientDebt = this.createClientSideDebt(debt, userId)
    this.storeDebtInLocalStorage(clientDebt)
    return clientDebt;
  }
  
  // Helper method to check if an error is authentication-related
  private isAuthError(errorMessage?: string): boolean {
    if (!errorMessage) return false
    return errorMessage.includes('JWT') || 
           errorMessage.includes('auth') || 
           errorMessage.includes('Authentication') ||
           errorMessage.includes('permission denied') ||
           errorMessage.includes('not authorized')
  }

  // Helper method to redirect to login page when authentication fails
  private redirectToLogin(): void {
    if (typeof window !== 'undefined') {
      // Check if we're already on the login page to prevent redirect loops
      if (window.location.pathname === '/login') {
        console.log('Already on login page, not redirecting')
        return
      }
      
      // Store the current path to redirect back after login
      const currentPath = window.location.pathname
      if (currentPath !== '/' && !currentPath.includes('/login')) {
        localStorage.setItem('redirectAfterLogin', currentPath)
      }
      
      console.log('Redirecting to login page')
      window.location.href = '/login'
    }
  }
  
  // Calculate repayment plan using the specified strategy
  async calculateRepaymentPlan(strategy: DebtRepaymentStrategy): Promise<DebtRepaymentPlan[]> {
    try {
      const userId = await this.ensureUserId()
      
      let functionName = ''
      switch (strategy) {
        case 'avalanche':
          functionName = 'calculate_avalanche_repayment'
          break
        case 'snowball':
          functionName = 'calculate_snowball_repayment'
          break
        case 'hybrid':
          functionName = 'calculate_hybrid_repayment'
          break
        default:
          return []
      }

      const { data, error } = await this.getSupabaseClient().rpc(functionName, {
        _user_id: userId
      })

      if (error) {
        console.error(`Error calculating ${strategy} repayment plan:`, error)
        return []
      }
      return data || []
    } catch (error) {
      console.error('Error in calculateRepaymentPlan:', error)
      return []
    }
  }

  async calculateInterestSavings(newInterestRate: number, loanTerm: number): Promise<number> {
    try {
      const userId = await this.ensureUserId()
      
      const { data, error } = await this.getSupabaseClient().rpc('calculate_interest_savings', {
        _user_id: userId,
        _new_interest_rate: newInterestRate,
        _loan_term: loanTerm
      })

      if (error) {
        console.error('Error calculating interest savings:', error)
        return 0
      }
      return data || 0
    } catch (error) {
      console.error('Error in calculateInterestSavings:', error)
      return 0
    }
  }

  async createRefinancingOpportunity(
    newInterestRate: number, 
    loanTerm: number, 
    debtId: string
  ): Promise<void> {
    try {
      const userId = await this.ensureUserId()
      
      const { error } = await this.getSupabaseClient().rpc('create_refinancing_opportunity', {
        _user_id: userId,
        _new_interest_rate: newInterestRate,
        _loan_term: loanTerm,
        _debt_id: debtId
      })

      if (error) {
        console.error('Error creating refinancing opportunity:', error)
      }
    } catch (error) {
      console.error('Error in createRefinancingOpportunity:', error)
    }
  }

  async updateDebtAfterRefinancing(
    debtId: string, 
    newInterestRate: number, 
    newLoanTerm: number
  ): Promise<void> {
    try {
      const { error } = await this.getSupabaseClient().rpc('update_debt_after_refinancing', {
        _debt_id: debtId,
        _new_interest_rate: newInterestRate,
        _new_loan_term: newLoanTerm
      })

      if (error) {
        console.error('Error updating debt after refinancing:', error)
      }
    } catch (error) {
      console.error('Error in updateDebtAfterRefinancing:', error)
    }
  }

  async calculateDebtToIncomeRatio(): Promise<number> {
    try {
      const userId = await this.ensureUserId()
      
      const { data, error } = await this.getSupabaseClient().rpc('calculate_debt_to_income_ratio', {
        _user_id: userId
      })

      if (error) {
        console.error('Error calculating debt to income ratio:', error)
        return 0
      }
      return data || 0
    } catch (error) {
      console.error('Error in calculateDebtToIncomeRatio:', error)
      return 0
    }
  }
  
  // Public method to force sync all local debts to the database
  async forceSync(): Promise<{ success: boolean; message: string }> {
    try {
      const userId = await this.ensureUserId()
      
      // No longer setting client ID in cookies
      // We only use authenticated user IDs now
      
      // Get client configuration
      const config = this.getClientConfig()
      
      // If database operations are disabled, return error
      if (!config.attemptDatabaseOperations) {
        return { success: false, message: 'Database operations are disabled' }
      }
      
      // Get local debts
      const localDebts = this.getLocalDebts(userId)
      if (localDebts.length === 0) {
        return { success: true, message: 'No local debts to sync' }
      }
      
      console.log(`Syncing ${localDebts.length} local debts to database`)
      
      // Helper method to sync local debts to the database
      await this.syncLocalDebtsToDatabase(localDebts, userId)
      
      console.log(`Force sync complete: ${localDebts.length} debts synced successfully`)
      return { 
        success: true, 
        message: `Successfully synced ${localDebts.length} debts to database` 
      }
    } catch (error) {
      console.error('Error in forceSync:', error)
      return { 
        success: false, 
        message: `Error syncing debts: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
    }
  }

  async updateDebt(debtId: string, debt: Partial<Debt>): Promise<void> {
    try {
      // Try to get the current user ID
      let userId: string | null = null;
      try {
        userId = await this.getUserId();
        if (!userId) {
          throw new Error('Authentication required: Please sign in to update your debts');
        }
      } catch (authError) {
        console.warn('Authentication error in updateDebt:', authError);
        throw new Error('Authentication required: Please sign in to update your debts');
      }
      
      // Use the server-side API endpoint to update the debt
      console.log('Using server-side API to update debt');
      console.log('Sending debt update request:', { debtId, debt });
      
      try {
        const response = await fetch('/api/debts/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
            // No client ID header - only using authenticated users
          },
          credentials: 'include', // Include cookies for authentication
          body: JSON.stringify({
            debtId,
            debt: debt
          })
        });
        
        // Always try to parse the response body, even if the response is not OK
        let responseData;
        try {
          responseData = await response.json();
          console.log('Response from debt update API:', responseData);
        } catch (parseError) {
          console.error('Failed to parse API response:', parseError);
          responseData = { success: false, message: 'Invalid response format from server' };
        }
        
        if (!response.ok) {
          // If we have a structured error response, use it
          if (responseData && responseData.error) {
            throw new Error(responseData.message || responseData.error || 'Failed to update debt');
          } else {
            // If we don't have a structured error, use the status text
            throw new Error(`Server error (${response.status}): ${response.statusText || 'Unknown error'}`);
          }
        }
        
        if (!responseData.success) {
          throw new Error(responseData.message || 'Failed to update debt: Invalid response from server');
        }
        
        console.log('Successfully updated debt via API:', responseData);
        return;
        
      } catch (fetchError) {
        console.error('Fetch error in updateDebt:', fetchError);
        throw fetchError;
      }
    } catch (error) {
      console.error('Error in updateDebt:', error);
      
      // If the error is authentication-related, redirect to login
      if (error instanceof Error && this.isAuthError(error.message)) {
        this.redirectToLogin();
        return;
      }
      
      throw new Error(`Failed to update debt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteDebt(debtId: string): Promise<void> {
    try {
      // Try to get the current user ID - strict authentication required
      let userId: string | null = null;
      try {
        userId = await this.getUserId();
        if (!userId) {
          throw new Error('Authentication required: Please sign in to delete your debts');
        }
      } catch (authError) {
        console.warn('Authentication error in deleteDebt:', authError);
        throw new Error('Authentication required: Please sign in to delete your debts');
      }
      
      // Use the server-side API endpoint to delete the debt
      console.log('Using server-side API to delete debt')
      const response = await fetch('/api/debts/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // No client ID header - only using authenticated users
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          debtId
        })
      })
      
      // Always try to parse the response body, even if the response is not OK
      let responseData;
      try {
        responseData = await response.json();
        console.log('Response from debt delete API:', responseData);
      } catch (parseError) {
        console.error('Failed to parse API response:', parseError);
        throw new Error('Invalid response format from server');
      }
      
      // Check if the response indicates success
      if (!response.ok) {
        const errorMessage = responseData?.message || responseData?.error || 'Failed to delete debt';
        console.error('Error deleting debt:', result);
        
        // Check if this is an authentication error
        if (this.isAuthError(errorMessage)) {
          console.error('Authentication error while deleting debt:', errorMessage);
          this.redirectToLogin();
          throw new Error(`Authentication error: ${errorMessage}`);
        }
        
        throw new Error(`Error deleting debt: ${errorMessage}`);
      }
      
      // Verify the response contains success flag
      if (!responseData.success) {
        const errorMessage = responseData.message || 'Unknown error occurred while deleting debt';
        console.error('API reported failure:', errorMessage);
        throw new Error(errorMessage);
      }
      
      // Remove the debt from local storage if client storage is enabled
      const config = this.getClientConfig();
      if (config.useClientStorage) {
        this.removeLocalDebt(debtId);
      }
      
      console.log('Successfully deleted debt:', responseData);
    } catch (error) {
      console.error('Error in deleteDebt:', error);
      
      // If the error is authentication-related, redirect to login
      if (error instanceof Error && this.isAuthError(error.message)) {
        this.redirectToLogin();
        return;
      }
      
      throw new Error(`Failed to delete debt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async calculateRepaymentPlan(strategy: DebtRepaymentStrategy): Promise<DebtRepaymentPlan[]> {
    try {
      const userId = await this.ensureUserId();
      
      let functionName = '';
      switch (strategy) {
        case 'avalanche':
          functionName = 'calculate_avalanche_repayment_plan';
          break;
        case 'snowball':
          functionName = 'calculate_snowball_repayment_plan';
          break;
        default:
          console.error('Invalid repayment strategy:', strategy);
          return [];
      }
      
      const { data, error } = await this.getSupabaseClient().rpc(functionName, {
        _user_id: userId
      });

      if (error) {
        console.error(`Error calculating ${strategy} repayment plan:`, error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error('Error in calculateRepaymentPlan:', error);
      return [];
    }
  }

  async calculateInterestSavings(newInterestRate: number, loanTerm: number): Promise<number> {
    try {
      const userId = await this.ensureUserId();
      
      const { data, error } = await this.getSupabaseClient().rpc('calculate_interest_savings', {
        _user_id: userId,
        _new_interest_rate: newInterestRate,
        _loan_term: loanTerm
      });

      if (error) {
        console.error('Error calculating interest savings:', error);
        return 0;
      }
      return data || 0;
    } catch (error) {
      console.error('Error in calculateInterestSavings:', error);
      return 0;
    }
  }

  async createRefinancingOpportunity(
    newInterestRate: number, 
    loanTerm: number, 
    debtId: string
  ): Promise<void> {
    try {
      const userId = await this.ensureUserId();
      
      const { error } = await this.getSupabaseClient().rpc('create_refinancing_opportunity', {
        _user_id: userId,
        _new_interest_rate: newInterestRate,
        _loan_term: loanTerm,
        _debt_id: debtId
      });

      if (error) {
        console.error('Error creating refinancing opportunity:', error);
      }
    } catch (error) {
      console.error('Error in createRefinancingOpportunity:', error);
    }
  }

  async updateDebtAfterRefinancing(
    debtId: string, 
    newInterestRate: number, 
    newLoanTerm: number
  ): Promise<void> {
    try {
      const { error } = await this.getSupabaseClient().rpc('update_debt_after_refinancing', {
        _debt_id: debtId,
        _new_interest_rate: newInterestRate,
        _new_loan_term: newLoanTerm
      });

      if (error) {
        console.error('Error updating debt after refinancing:', error);
      }
    } catch (error) {
      console.error('Error in updateDebtAfterRefinancing:', error);
    }
  }

  async calculateDebtToIncomeRatio(): Promise<number> {
    try {
      const userId = await this.ensureUserId();
      
      const { data, error } = await this.getSupabaseClient().rpc('calculate_debt_to_income_ratio', {
        _user_id: userId
      });

      if (error) {
        console.error('Error calculating debt to income ratio:', error);
        return 0;
      }
      return data || 0;
    } catch (error) {
      console.error('Error in calculateDebtToIncomeRatio:', error);
      return 0;
    }
  }
  
  /**
   * Update a debt with new information
   * Requires authentication and follows strict security practices
   */
  async updateDebt(debtId: string, debt: Partial<Debt>): Promise<void> {
    try {
      // Ensure we have a valid authenticated user ID
      const userId = await this.ensureUserId();
      
      console.log(`Updating debt ${debtId} for user ${userId}`);
      console.log('Debt data being sent:', debt);
      
      // Make sure we're sending valid data
      if (!debt || Object.keys(debt).length === 0) {
        console.error('No valid debt data to update');
        throw new Error('No valid debt data to update');
      }
      
      // Send the update request to the server-side API
      const response = await fetch('/api/debts/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          debtId,
          debt
        })
      });
      
      // Parse the response JSON regardless of status code
      const result = await response.json().catch(e => {
        console.error('Failed to parse response JSON:', e);
        return { success: false, message: 'Failed to parse server response' };
      });
      
      // Check if the response indicates success, even if the status code is not 200
      if (result.success === true) {
        console.log('Debt operation successful:', result);
        
        // If client storage is enabled, update the debt in local storage
        const config = this.getClientConfig();
        if (config.useClientStorage) {
          this.updateLocalDebtInStorage(debtId, debt);
        }
        
        return;
      }
      
      // If we get here, the response was not successful
      if (!response.ok) {
        const errorMessage = result.message || 'Unknown error updating debt';
        console.error('Error updating debt:', result);
        
        // Check if this is an authentication error
        if (this.isAuthError(errorMessage)) {
          console.error('Authentication error while updating debt:', errorMessage);
          this.redirectToLogin();
          throw new Error(`Authentication error: ${errorMessage}`);
        }
        
        throw new Error(`Error updating debt: ${errorMessage}`);
      }
      
      // Update was successful
      console.log('Debt updated successfully:', result);
      
      // If client storage is enabled, update the debt in local storage
      const config = this.getClientConfig();
      if (config.useClientStorage) {
        this.updateLocalDebtInStorage(debtId, debt);
      }
      
    } catch (error) {
      console.error('Error in updateDebt:', error);
      throw error;
    }
  }
  
  /**
   * Delete a debt
   * Requires authentication and follows strict security practices
   */
  async deleteDebt(debtId: string): Promise<void> {
    try {
      // Ensure we have a valid authenticated user ID
      const userId = await this.ensureUserId();
      
      console.log(`Deleting debt ${debtId} for user ${userId}`);
      
      // Send the delete request to the server-side API
      const response = await fetch('/api/debts/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          debtId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.message || 'Unknown error deleting debt';
        console.error('Error deleting debt:', errorData);
        
        // Check if this is an authentication error
        if (this.isAuthError(errorMessage)) {
          console.error('Authentication error while deleting debt:', errorMessage);
          this.redirectToLogin();
          throw new Error(`Authentication error: ${errorMessage}`);
        }
        
        throw new Error(`Error deleting debt: ${errorMessage}`);
      }
      
      // Delete was successful
      const result = await response.json();
      console.log('Debt deleted successfully:', result);
      
      // If client storage is enabled, remove the debt from local storage
      const config = this.getClientConfig();
      if (config.useClientStorage) {
        this.deleteLocalDebt(debtId);
      }
      
    } catch (error) {
      console.error('Error in deleteDebt:', error);
      throw error;
    }
  }
  
  // Public method to force sync all local debts to the database
  async forceSync(): Promise<{ success: boolean; message: string }> {
    try {
      const userId = await this.ensureUserId();
      
      // No longer setting client ID in cookies
      // We only use authenticated user IDs now
      
      // Get client configuration
      const config = this.getClientConfig();
      
      // If database operations are disabled, return error
      if (!config.attemptDatabaseOperations) {
        return { success: false, message: 'Database operations are disabled' };
      }
      
      // Get local debts
      const localDebts = this.getLocalDebts(userId);
      if (localDebts.length === 0) {
        return { success: true, message: 'No local debts to sync' };
      }
      
      console.log(`Syncing ${localDebts.length} local debts to database`);
      
      // Helper method to sync local debts to the database
      await this.syncLocalDebtsToDatabase(localDebts, userId);
      
      console.log(`Force sync complete: ${localDebts.length} debts synced successfully`);
      return { 
        success: true, 
        message: `Successfully synced ${localDebts.length} debts to database` 
      };
    } catch (error) {
      console.error('Error in forceSync:', error);
      return { 
        success: false, 
        message: `Error syncing debts: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}
