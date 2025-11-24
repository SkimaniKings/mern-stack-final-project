import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { 
  Debt, 
  DebtConsolidation, 
  DebtRepaymentPlan, 
  DebtRepaymentStrategy,
  InterestSavingsResult,
  DebtToIncomeRatio
} from '@/types/debt'
import { User } from '@supabase/supabase-js'
import Cookies from 'js-cookie'

export class DebtService {
  private supabase = createClientComponentClient()
  private cachedUserId: string | null = null
  
  // Helper method to ensure database schema is properly set up
  private async ensureDatabaseSetup(): Promise<void> {
    try {
      // Call the database setup endpoint to ensure schema is ready
      const response = await fetch('/api/database/debt-setup')
      if (!response.ok) {
        const errorData = await response.json()
        console.warn('Database setup warning:', errorData)
      }
    } catch (error) {
      console.warn('Failed to run database setup:', error)
      // Continue anyway, as the main operation might still succeed
    }
  }
  
  // Get the current user ID with proper error handling and retry logic
  private async getUserId(): Promise<string | null> {
    try {
      // Return cached ID if available to avoid repeated lookups
      if (this.cachedUserId) {
        console.log(`getUserId: Using cached user ID: ${this.cachedUserId}`)
        return this.cachedUserId
      }
      
      // Check for client ID in cookies first
      const clientId = Cookies.get('client-id')
      if (clientId) {
        console.log(`getUserId: Using client ID from cookie: ${clientId}`)
        this.cachedUserId = clientId
        return clientId
      }
      
      // Handle cookie parsing errors by clearing problematic cookies
      if (typeof window !== 'undefined') {
        try {
          // Check if we have cookie parsing errors in the console
          const consoleErrors = (window as any).consoleErrors || [];
          
          const hasCookieParsingError = consoleErrors.some((error: any) => 
            error && error.message && error.message.includes('Failed to parse cookie string')
          );
          
          if (hasCookieParsingError || document.cookie.includes('base64-eyJ')) {
            console.log('Detected cookie parsing error, clearing problematic cookies');
            // Clear all supabase cookies to resolve parsing issues
            document.cookie.split(';').forEach(cookie => {
              const [name] = cookie.trim().split('=');
              if (name && (name.includes('supabase') || name.includes('sb-'))) {
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
              }
            });
            
            // Store a flag to prevent redirect loops
            localStorage.setItem('cookies_cleared', 'true');
            
            // If we're not already on the login page, redirect there
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
              return null;
            }
          }
        } catch (cookieError) {
          console.warn('Error checking for cookie parsing issues:', cookieError);
        }
      }

      // Safely check for session without risking AuthSessionMissingError
      try {
        // First check if we have a session
        const { data: sessionData } = await this.supabase.auth.getSession()
        const userId = sessionData?.session?.user?.id
        
        if (userId) {
          console.log(`getUserId: Found user ID from session: ${userId}`)
          this.cachedUserId = userId
          return userId
        }
      } catch (sessionError) {
        console.warn('Error getting session:', sessionError)
        // Continue to next method
      }
      
      // Try getting the user directly with error handling
      try {
        const { data: userData } = await this.supabase.auth.getUser()
        if (userData?.user?.id) {
          console.log(`getUserId: Found user ID from getUser: ${userData.user.id}`)
          this.cachedUserId = userData.user.id
          return userData.user.id
        }
      } catch (userError) {
        console.warn('Error getting user:', userError)
        // Continue to next method
      }
      
      // Try to refresh the session with error handling
      try {
        const refreshResult = await this.supabase.auth.refreshSession()
        if (refreshResult.data?.session?.user?.id) {
          console.log(`getUserId: Found user ID from refreshSession: ${refreshResult.data.session.user.id}`)
          this.cachedUserId = refreshResult.data.session.user.id
          return refreshResult.data.session.user.id
        }
      } catch (refreshError) {
        console.warn('Error refreshing session:', refreshError)
        // Continue to next method
      }
      
      // If all else fails, generate a default UUID
      console.log('getUserId: Using default UUID')
      const defaultUuid = '00000000-0000-0000-0000-000000000000'
      this.cachedUserId = defaultUuid
      
      // Store this ID in a cookie for future use
      Cookies.set('client-id', defaultUuid, { expires: 365 }) // 1 year expiration
      
      return defaultUuid
      
    } catch (error) {
      console.error('Error in getUserId:', error)
      return null
    }
  }

  async getDebts(): Promise<Debt[]> {
    try {
      // Ensure database schema is properly set up
      await this.ensureDatabaseSetup()
      
      const userId = await this.getUserId()
      if (!userId) {
        console.warn('No user ID available, returning empty debts array')
        return []
      }

      try {
        console.log(`getDebts: Fetching debts for user ${userId}`)
        
        // Query the database with the user ID
        const { data, error } = await this.supabase
          .from('debts')
          .select('*')
          .eq('user_id', userId)
          .order('interest_rate', { ascending: false })
        
        if (error) {
          console.error('Database error:', error)
          // For database errors, log and return empty array
          console.error('Database error:', error.message)
          return []
        }
        
        console.log(`getDebts: Found ${data?.length || 0} debts`)
        return data || []
      } catch (dbError) {
        console.error('Database error in getDebts:', dbError)
        return []
      }
    } catch (error) {
      console.error('Error in getDebts:', error)
      return []
    }
  }

  // Helper method to ensure we have a valid user ID
  private async ensureUserId(): Promise<string> {
    const userId = await this.getUserId()
    if (!userId) {
      throw new Error('User ID is required for this operation')
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
      // Ensure database schema is properly set up
      await this.ensureDatabaseSetup()
      
      // Ensure we have a valid user ID
      const userId = await this.ensureUserId()
      
      // First try to use the RPC function for better security
      try {
        console.log('Creating debt with RPC:', debt)
        const { data, error } = await this.supabase.rpc('create_debt', {
          _name: debt.name,
          _type: debt.type,
          _current_balance: debt.current_balance,
          _interest_rate: debt.interest_rate,
          _minimum_payment: debt.minimum_payment,
          _loan_term: debt.loan_term || null
        })
        
        if (error) {
          console.error('Error creating debt with RPC:', error)
          // If RPC fails, try direct insert
          return this.attemptDirectInsert(debt, userId)
        }
        
        console.log('Debt created successfully with RPC:', data)
        return data
      } catch (rpcError) {
        console.error('Error creating debt with RPC:', rpcError)
        // If RPC fails with exception, try direct insert
        return this.attemptDirectInsert(debt, userId)
      }
    } catch (error) {
      console.error('Error in createDebt:', error)
      throw new Error(`Failed to create debt: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  
  // Helper method to attempt direct insert if RPC fails
  private async attemptDirectInsert(debt: Omit<Debt, 'id' | 'user_id' | 'created_at' | 'updated_at'>, userId: string): Promise<Debt> {
    try {
      console.log('Attempting direct insert:', debt)
      const { data, error } = await this.supabase
        .from('debts')
        .insert({
          user_id: userId,
          name: debt.name,
          type: debt.type,
          current_balance: debt.current_balance,
          interest_rate: debt.interest_rate,
          minimum_payment: debt.minimum_payment,
          loan_term: debt.loan_term || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) {
        console.error('Error in direct insert:', error)
        throw new Error(`Failed to create debt: ${error.message}`)
      }
      
      console.log('Debt created successfully with direct insert:', data)
      return data
    } catch (error) {
      console.error('Error in direct insert:', error)
      throw new Error(`Failed to create debt: ${error instanceof Error ? error.message : String(error)}`)
    }
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

  async updateDebt(debtId: string, debt: Partial<Debt>): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('debts')
        .update({
          ...debt,
          updated_at: new Date().toISOString()
        })
        .eq('id', debtId)
      
      if (error) {
        console.error('Error updating debt:', error)
        // Don't throw error to prevent login loops
      }
    } catch (error) {
      console.error('Error in updateDebt:', error)
      // Don't throw error to prevent login loops
    }
  }

  async deleteDebt(debtId: string): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('delete_debt', {
        _debt_id: debtId
      })

      if (error) {
        console.error('Error deleting debt:', error)
        // Don't throw error to prevent login loops
      }
    } catch (error) {
      console.error('Error in deleteDebt:', error)
      // Don't throw error to prevent login loops
    }
  }

  async calculateRepaymentPlan(strategy: DebtRepaymentStrategy): Promise<DebtRepaymentPlan[]> {
    try {
      const userId = await this.getUserId()
      if (!userId) {
        // Return empty array instead of throwing an error
        return []
      }

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

      const { data, error } = await this.supabase.rpc(functionName, {
        _user_id: userId
      })

      if (error) {
        console.error('Error calculating repayment plan:', error)
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
      const userId = await this.getUserId()
      if (!userId) {
        // Return 0 instead of throwing an error
        return 0
      }

      const { data, error } = await this.supabase.rpc('calculate_interest_savings', {
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
      const userId = await this.getUserId()
      if (!userId) {
        // Don't throw error to prevent login loops
        return
      }

      const { error } = await this.supabase.rpc('create_refinancing_opportunity', {
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
      const { error } = await this.supabase.rpc('update_debt_after_refinancing', {
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
      const userId = await this.getUserId()
      if (!userId) {
        // Return 0 instead of throwing an error
        return 0
      }

      const { data, error } = await this.supabase.rpc('calculate_debt_to_income_ratio', {
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
}
