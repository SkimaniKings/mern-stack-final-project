-- Fixes the tax_impact_predictions table to align with the application schema.
-- This script is idempotent and can be run multiple times safely.

DO $$
BEGIN
    -- Rename 'decision_type' to 'financial_decision' if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tax_impact_predictions' AND column_name='decision_type') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tax_impact_predictions' AND column_name='financial_decision') THEN
            ALTER TABLE tax_impact_predictions RENAME COLUMN decision_type TO financial_decision;
            RAISE NOTICE 'Renamed column decision_type to financial_decision in tax_impact_predictions.';
        END IF;
    -- Add 'financial_decision' if it doesn't exist at all
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tax_impact_predictions' AND column_name='financial_decision') THEN
        ALTER TABLE tax_impact_predictions ADD COLUMN financial_decision TEXT;
        RAISE NOTICE 'Added column financial_decision to tax_impact_predictions.';
    END IF;

    -- Add 'prediction_date' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tax_impact_predictions' AND column_name='prediction_date') THEN
        ALTER TABLE tax_impact_predictions ADD COLUMN prediction_date TIMESTAMPTZ NOT NULL DEFAULT now();
        RAISE NOTICE 'Added column prediction_date to tax_impact_predictions.';
    END IF;

    -- Add 'description' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tax_impact_predictions' AND column_name='description') THEN
        ALTER TABLE tax_impact_predictions ADD COLUMN description TEXT;
        RAISE NOTICE 'Added column description to tax_impact_predictions.';
    END IF;

    -- Add 'notes' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tax_impact_predictions' AND column_name='notes') THEN
        ALTER TABLE tax_impact_predictions ADD COLUMN notes TEXT;
        RAISE NOTICE 'Added column notes to tax_impact_predictions.';
    END IF;

    -- Add 'updated_at' if it doesn't exist for the PUT endpoint
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tax_impact_predictions' AND column_name='updated_at') THEN
        ALTER TABLE tax_impact_predictions ADD COLUMN updated_at TIMESTAMPTZ;
        RAISE NOTICE 'Added column updated_at to tax_impact_predictions.';
    END IF;
END;
$$;
