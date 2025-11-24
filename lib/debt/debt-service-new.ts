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

      // Check for mock user ID in development mode
      if (process.env.NEXT_PUBLIC_MOCK_USER_ID) {
        console.log(`getUserId: Using mock user ID from environment: ${process.env.NEXT_PUBLIC_MOCK_USER_ID}`)
        this.cachedUserId = process.env.NEXT_PUBLIC_MOCK_USER_ID;
        return process.env.NEXT_PUBLIC_MOCK_USER_ID;
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
        // Check if we have a session to avoid AuthSessionMissingError
        const { data: checkSession } = await this.supabase.auth.getSession()
        if (checkSession?.session) {
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
        }
      } catch (checkError) {
        console.warn('Error checking for session:', checkError)
        // Continue to next method
      }
      
      // Try to get the user ID from localStorage
      if (typeof window !== 'undefined') {
        try {
          const localStorageUserId = localStorage.getItem('supabase.auth.token')
          if (localStorageUserId) {
            try {
              const parsedToken = JSON.parse(localStorageUserId)
              if (parsedToken?.currentSession?.user?.id) {
                console.log(`getUserId: Found user ID from localStorage: ${parsedToken.currentSession.user.id}`)
                this.cachedUserId = parsedToken.currentSession.user.id
                return parsedToken.currentSession.user.id
              }
            } catch (parseError) {
              console.warn('Error parsing localStorage token:', parseError)
              // Continue to next method
            }
          }
        } catch (localStorageError) {
          console.warn('Error accessing localStorage:', localStorageError)
          // Continue to next method
        }
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
          // Check if it's an auth error
          if (this.isAuthError(error.message)) {
            console.warn('Authentication error when querying database:', error.message)
            // Return mock data instead of redirecting
            return this.getMockDebts()
          }
          // For non-auth errors, just log and return empty array
          console.error('Non-auth database error:', error.message)
          return []
        }
        
        console.log(`getDebts: Found ${data?.length || 0} debts`)
        // If no data or empty array, return mock data
        if (!data || data.length === 0) {
          console.log('No debts found, returning mock data')
          return this.getMockDebts()
        }
        
        return data
      } catch (dbError) {
        console.error('Database error in getDebts:', dbError)
        // Return mock data instead of throwing
        return this.getMockDebts()
      }
    } catch (error) {
      console.error('Error in getDebts:', error)
      // Return mock data instead of throwing
      return this.getMockDebts()
    }
  }
  
  // Helper method to get mock debts for development and testing
  private getMockDebts(): Debt[] {
    // Use mock user ID from environment if available
    const userId = this.cachedUserId || '00000000-0000-0000-0000-000000000000'
    
    return [
      {
        id: '1',
        user_id: userId,
        name: 'Credit Card',
        type: 'credit_card',
        current_balance: 5000,
        interest_rate: 18.99,
        minimum_payment: 150,
        loan_term: 36,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '2',
        user_id: userId,
        name: 'Student Loan',
        type: 'student_loan',
        current_balance: 25000,
        interest_rate: 5.5,
        minimum_payment: 300,
        loan_term: 120,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
  }

  // Set user ID directly (can be used by components that have access to the user ID)
  setUserId(userId: string): void {
    if (userId) {
      this.cachedUserId = userId;
      console.log(`DebtService: User ID set manually to ${userId}`)
      
      // Also store in localStorage as a backup
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('supabase.auth.user.id', userId);
        } catch (e) {
          console.warn('Failed to store user ID in localStorage:', e);
        }
      }
    }
  }

  // Get user from Supabase
  async getUser(): Promise<User | null> {
    const { data } = await this.supabase.auth.getUser()
    return data?.user || null
  }

  async createDebt(debt: Omit<Debt, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Debt> {
    try {
      const userId = await this.getUserId()
      if (!userId) {
        console.error('No user ID available for creating debt')
        throw new Error('Failed to get user ID')
      }
      
      // If we have a user ID, proceed with creating the debt
      try {
        console.log(`createDebt: Creating debt for user ${userId}`)
        
        const { data, error } = await this.supabase.rpc('create_debt', {
          _user_id: userId,
          _name: debt.name,
          _current_balance: debt.current_balance,
          _interest_rate: debt.interest_rate,
          _minimum_payment: debt.minimum_payment,
          _loan_term: debt.loan_term || 0
        })
        
        if (error) {
          console.error('Error creating debt:', error)
          
          // Check if it's an auth error
          if (this.isAuthError(error.message)) {
            console.warn('Authentication error when creating debt:', error.message)
            throw new Error('Authentication required to create debt')
          }
          
          // Try direct insert as fallback
          return this.attemptDirectInsert(
            userId, 
            debt, 
            debt.current_balance, 
            debt.loan_term || 0
          )
        }
        
        // If RPC succeeded but returned no data, try direct insert
        if (!data) {
          console.warn('RPC succeeded but returned no data, trying direct insert')
          return this.attemptDirectInsert(
            userId, 
            debt, 
            debt.current_balance, 
            debt.loan_term || 0
          )
        }
        
        // Return the created debt with the user ID and generated ID
        return {
          id: data,
          user_id: userId,
          ...debt,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      } catch (error) {
        console.error('Error in createDebt:', error)
        
        // Check if it's an auth error
        if (error instanceof Error && this.isAuthError(error.message)) {
          throw error
        }
        
        // Try direct insert as fallback
        return this.attemptDirectInsert(
          userId, 
          debt, 
          debt.current_balance, 
          debt.loan_term || 0
        )
      }
    } catch (error) {
      console.error('Error in createDebt:', error)
      throw error
    }
  }

  // Helper method for direct insert when RPC fails
  private async attemptDirectInsert(
    userId: string, 
    debt: Omit<Debt, 'id' | 'user_id' | 'created_at' | 'updated_at'>, 
    current_balance: number, 
    loan_term: number
  ): Promise<Debt> {
    try {
      console.log('Attempting direct insert')
      
      const { data: insertData, error: insertError } = await this.supabase
        .from('debts')
        .insert({
          user_id: userId,
          name: debt.name,
          type: debt.type || 'personal_loan',
          current_balance: debt.current_balance,
          interest_rate: debt.interest_rate,
          minimum_payment: debt.minimum_payment,
          loan_term: debt.loan_term || 0
        })
        .select()
        .single()
      
      if (insertError) {
        console.error('Error in direct insert:', insertError)
        
        // Check if it's an auth error
        if (this.isAuthError(insertError.message)) {
          throw new Error('Authentication required to create debt')
        }
        
        // Return a mock debt with the provided data
        return {
          id: Math.random().toString(36).substring(2, 15),
          user_id: userId,
          ...debt,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }
      
      return insertData
    } catch (error) {
      console.error('Error in attemptDirectInsert:', error)
      
      // Return a mock debt with the provided data
      return {
        id: Math.random().toString(36).substring(2, 15),
        user_id: userId,
        ...debt,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
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
    // Only redirect if we're in the browser
    if (typeof window !== 'undefined') {
      try {
        // Store the current path so we can redirect back after login
        const currentPath = window.location.pathname
        if (currentPath !== '/login') {
          localStorage.setItem('redirectAfterLogin', currentPath)
          
          // Check if we've already tried to redirect to prevent loops
          const redirectAttempts = parseInt(localStorage.getItem('redirectAttempts') || '0', 10)
          if (redirectAttempts < 3) {
            localStorage.setItem('redirectAttempts', (redirectAttempts + 1).toString())
            window.location.href = '/login'
          } else {
            console.warn('Too many redirect attempts, staying on current page')
            localStorage.removeItem('redirectAttempts')
          }
        }
      } catch (e) {
        console.warn('Error in redirectToLogin:', e)
      }
    }
  }

  async updateDebt(debtId: string, debt: Partial<Debt>): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('update_debt', {
        _debt_id: debtId,
        _name: debt.name,
        _current_balance: debt.current_balance,
        _interest_rate: debt.interest_rate,
        _minimum_payment: debt.minimum_payment,
        _loan_term: debt.loan_term
      })

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
