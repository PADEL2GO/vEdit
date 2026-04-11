-- Entferne den fehlerhaften Constraint, der nur einen Preis pro Duration erlaubt
ALTER TABLE court_prices 
DROP CONSTRAINT IF EXISTS court_prices_duration_minutes_key;