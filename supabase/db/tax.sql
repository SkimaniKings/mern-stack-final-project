-- ========================================
-- INTEGRATED TAX PLANNING & PREPARATION
-- ========================================

-- Tax Recommendations (for tax optimization suggestions)
CREATE TABLE IF NOT EXISTS tax_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    priority TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    potential_savings NUMERIC DEFAULT 0,
    action_items TEXT[] DEFAULT '{}',
    deadline TIMESTAMPTZ,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tax Deductions (for tracking tax deductible expenses)
CREATE TABLE IF NOT EXISTS tax_deductions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    max_amount NUMERIC CHECK (max_amount >= 0),
    category_id TEXT,
    tax_year TEXT NOT NULL,
    notes TEXT,
    date_added TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tax Timeline (for tracking tax-related events and deadlines)
CREATE TABLE IF NOT EXISTS tax_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    type TEXT DEFAULT 'one-time',
    status TEXT DEFAULT 'pending',
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add is_completed column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tax_timeline' AND column_name = 'is_completed') THEN
        ALTER TABLE tax_timeline ADD COLUMN is_completed BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Tax Optimization Recommendations
CREATE TABLE IF NOT EXISTS tax_optimization_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('year-round', 'transactional')),
    recommendation_text TEXT NOT NULL,
    is_implemented BOOLEAN DEFAULT FALSE,
    implemented_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tax-Advantaged Account Recommendations
CREATE TABLE IF NOT EXISTS tax_advantaged_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_type TEXT NOT NULL CHECK (account_type IN ('IRA', '401k', 'HSA', 'Other')),
    recommended_contribution NUMERIC NOT NULL CHECK (recommended_contribution >= 0),
    suggested_tax_impact NUMERIC NOT NULL CHECK (suggested_tax_impact >= 0),
    is_implemented BOOLEAN DEFAULT FALSE,
    implemented_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Deduction Finder
CREATE TABLE IF NOT EXISTS deduction_finder (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expense_category TEXT NOT NULL,
    potential_deduction NUMERIC NOT NULL CHECK (potential_deduction >= 0),
    is_claimed BOOLEAN DEFAULT FALSE,
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tax Document Organizer
CREATE TABLE IF NOT EXISTS tax_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    document_type TEXT NOT NULL,
    file_url TEXT,
    file_name TEXT,
    file_metadata_id UUID,
    due_date TIMESTAMPTZ,
    notes TEXT,
    status TEXT DEFAULT 'received',
    is_uploaded BOOLEAN DEFAULT TRUE,
    uploaded_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add or update columns in tax_documents if they don't exist or have wrong type
DO $$ 
BEGIN
    -- Check if due_date column exists and has the right type
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'tax_documents' AND column_name = 'due_date' 
               AND data_type != 'timestamp with time zone') THEN
        ALTER TABLE tax_documents ALTER COLUMN due_date TYPE TIMESTAMPTZ USING due_date::TIMESTAMPTZ;
    END IF;

    -- Make sure all required columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tax_documents' AND column_name = 'is_uploaded') THEN
        ALTER TABLE tax_documents ADD COLUMN is_uploaded BOOLEAN DEFAULT TRUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tax_documents' AND column_name = 'status') THEN
        ALTER TABLE tax_documents ADD COLUMN status TEXT DEFAULT 'received';
    END IF;
END $$;

-- Tax Impact Predictions
CREATE TABLE IF NOT EXISTS tax_impact_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    financial_decision TEXT NOT NULL,
    estimated_tax_impact NUMERIC NOT NULL CHECK (estimated_tax_impact >= 0),
    prediction_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tax Professional Integration
CREATE TABLE IF NOT EXISTS tax_professional_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    professional_name TEXT NOT NULL,
    contact_info JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tax Filing Tracker
CREATE TABLE IF NOT EXISTS tax_filing_tracker (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filing_year INT NOT NULL CHECK (filing_year > 1990),
    filing_status TEXT NOT NULL CHECK (filing_status IN ('in_progress', 'submitted', 'approved', 'rejected')),
    filed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tax Report Generation
CREATE TABLE IF NOT EXISTS tax_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_year INT NOT NULL CHECK (report_year > 1990),
    report_url TEXT NOT NULL,
    is_generated BOOLEAN DEFAULT FALSE,
    generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- TAX IMPACT ON DEBT AND INCOME
-- ========================================

-- Debt Tax Impact
CREATE TABLE IF NOT EXISTS debt_tax_impact (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    debt_type TEXT NOT NULL CHECK (debt_type IN ('mortgage', 'credit_card', 'student_loan', 'auto_loan', 'other')),
    interest_paid NUMERIC NOT NULL CHECK (interest_paid >= 0),
    potential_tax_deduction NUMERIC NOT NULL CHECK (potential_tax_deduction >= 0),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Income Tax Impact
CREATE TABLE IF NOT EXISTS income_tax_impact (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    income_type TEXT NOT NULL CHECK (income_type IN ('salary', 'freelance', 'investment', 'side_hustle', 'pension', 'other')),
    income_amount NUMERIC NOT NULL CHECK (income_amount >= 0),
    estimated_tax_impact NUMERIC NOT NULL CHECK (estimated_tax_impact >= 0),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- VIEWS FOR TAX CALCULATIONS
-- ========================================

CREATE OR REPLACE VIEW debt_tax_impact_summary AS
SELECT 
    user_id,
    SUM(interest_paid) AS total_interest_paid,
    SUM(potential_tax_deduction) AS total_tax_deduction
FROM debt_tax_impact
GROUP BY user_id;

CREATE OR REPLACE VIEW income_tax_impact_summary AS
SELECT 
    user_id,
    SUM(income_amount) AS total_income,
    SUM(estimated_tax_impact) AS total_tax_impact
FROM income_tax_impact
GROUP BY user_id;

CREATE OR REPLACE VIEW total_tax_optimization_summary AS
SELECT 
    t.user_id,
    COALESCE(SUM(d.potential_tax_deduction), 0) AS debt_tax_savings,
    COALESCE(SUM(i.estimated_tax_impact), 0) AS income_tax_savings,
    COALESCE(SUM(d.potential_tax_deduction), 0) + COALESCE(SUM(i.estimated_tax_impact), 0) AS total_tax_savings
FROM tax_optimization_recommendations t
LEFT JOIN debt_tax_impact d ON t.user_id = d.user_id
LEFT JOIN income_tax_impact i ON t.user_id = i.user_id
GROUP BY t.user_id;
