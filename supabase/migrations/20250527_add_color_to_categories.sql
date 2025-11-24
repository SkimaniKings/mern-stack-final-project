-- Add color column to expense_categories
ALTER TABLE expense_categories 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#8884d8';  -- Default color

-- Update existing rows to have different colors for better visualization
UPDATE expense_categories SET 
  color = CASE 
    WHEN name ILIKE '%housing%' OR name ILIKE '%rent%' OR name ILIKE '%mortgage%' THEN '#8884d8'
    WHEN name ILIKE '%utilit%' THEN '#82ca9d'
    WHEN name ILIKE '%food%' OR name ILIKE '%grocery%' OR name ILIKE '%restaurant%' THEN '#ffc658'
    WHEN name ILIKE '%transport%' OR name ILIKE '%car%' OR name ILIKE '%gas%' THEN '#ff8042'
    WHEN name ILIKE '%entertain%' OR name ILIKE '%movie%' OR name ILIKE '%stream%' THEN '#0088fe'
    WHEN name ILIKE '%health%' OR name ILIKE '%medical%' THEN '#00c49f'
    WHEN name ILIKE '%shopping%' OR name ILIKE '%clothes%' THEN '#ffbb28'
    WHEN name ILIKE '%education%' OR name ILIKE '%school%' OR name ILIKE '%course%' THEN '#a4de6c'
    WHEN name ILIKE '%travel%' OR name ILIKE '%vacation%' THEN '#d0ed57'
    WHEN name ILIKE '%saving%' OR name ILIKE '%invest%' THEN '#8dd1e1'
    WHEN name ILIKE '%debt%' OR name ILIKE '%loan%' OR name ILIKE '%credit%' THEN '#ff7c43'
    ELSE '#c6dbef'  -- Default color for others
  END;

-- Add color column to income_categories
ALTER TABLE income_categories 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#82ca9d';  -- Default color

-- Update existing rows to have different colors for better visualization
UPDATE income_categories SET 
  color = CASE 
    WHEN name ILIKE '%salary%' OR name ILIKE '%wage%' OR name ILIKE '%paycheck%' THEN '#82ca9d'
    WHEN name ILIKE '%freelance%' OR name ILIKE '%contract%' OR name ILIKE '%gig%' THEN '#8884d8'
    WHEN name ILIKE '%investment%' OR name ILIKE '%dividend%' OR name ILIKE '%interest%' THEN '#0088fe'
    WHEN name ILIKE '%rental%' OR name ILIKE '%property%' THEN '#ff8042'
    WHEN name ILIKE '%business%' OR name ILIKE '%self%' THEN '#00c49f'
    WHEN name ILIKE '%pension%' OR name ILIKE '%retire%' THEN '#ffbb28'
    WHEN name ILIKE '%social%' OR name ILIKE '%benefit%' OR name ILIKE '%welfare%' THEN '#a4de6c'
    WHEN name ILIKE '%gift%' OR name ILIKE '%donation%' THEN '#d0ed57'
    WHEN name ILIKE '%refund%' OR name ILIKE '%rebate%' THEN '#8dd1e1'
    WHEN name ILIKE '%other%' OR name ILIKE '%misc%' THEN '#c6dbef'
    ELSE '#82ca9d'  -- Default color
  END;
