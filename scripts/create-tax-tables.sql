-- Drop and recreate tax_timeline table
DROP TABLE IF EXISTS tax_timeline;

CREATE TABLE IF NOT EXISTS tax_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Drop and recreate tax_documents table
DROP TABLE IF EXISTS tax_documents;

CREATE TABLE IF NOT EXISTS tax_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Drop and recreate tax_impact_predictions table
DROP TABLE IF EXISTS tax_impact_predictions;

CREATE TABLE IF NOT EXISTS tax_impact_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    decision_type TEXT NOT NULL,
    description TEXT,
    estimated_tax_impact NUMERIC NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
