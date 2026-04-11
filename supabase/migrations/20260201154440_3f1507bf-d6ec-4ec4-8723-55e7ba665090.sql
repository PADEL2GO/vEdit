-- Add perks column to expert_levels_config
ALTER TABLE expert_levels_config 
ADD COLUMN IF NOT EXISTS perks TEXT[] DEFAULT '{}';

-- Seed perks data for all 8 levels
UPDATE expert_levels_config SET perks = '{}' WHERE name = 'Beginner';

UPDATE expert_levels_config SET perks = ARRAY[
  '3% Rabatt auf Buchungen',
  'Erste Badges freischalten',
  'Erweiterte Rewards im Store',
  'Exklusiver Newsletter'
] WHERE name = 'Rookie';

UPDATE expert_levels_config SET perks = ARRAY[
  '5% Rabatt auf Buchungen',
  'Frühzeitiger Event-Zugang',
  'Player Badges',
  'Community-Events Einladungen'
] WHERE name = 'Player';

UPDATE expert_levels_config SET perks = ARRAY[
  '8% Rabatt auf Buchungen',
  'Priority-Booking (12h Vorsprung)',
  'Expert Events Zugang',
  'Partner-Rewards freischalten'
] WHERE name = 'Expert';

UPDATE expert_levels_config SET perks = ARRAY[
  '12% Rabatt auf Buchungen',
  'Priority-Booking (24h Vorsprung)',
  'Pro-Only Merchandise',
  'Bonus-Punkte bei Events'
] WHERE name = 'Pro';

UPDATE expert_levels_config SET perks = ARRAY[
  '15% Rabatt auf Buchungen',
  'Priority-Booking (48h Vorsprung)',
  'VIP-Zugang bei Finals',
  'Exklusives Merchandise',
  'Persönlicher Support'
] WHERE name = 'Master';

UPDATE expert_levels_config SET perks = ARRAY[
  '18% Rabatt auf Buchungen',
  'Priority-Booking (72h Vorsprung)',
  'Champion Events',
  'Gratis Circuit-Tickets',
  'Champion Rewards'
] WHERE name = 'Champion';

UPDATE expert_levels_config SET perks = ARRAY[
  '25% Rabatt auf Buchungen',
  'Priority-Booking (96h Vorsprung)',
  'Exklusive Legend Events',
  'Gratis Finals-Tickets',
  'Legend Merchandise',
  'Beta-Zugang neue Features'
] WHERE name = 'Padel Legend';