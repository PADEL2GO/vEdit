-- 1. Drop the existing category check constraint
ALTER TABLE marketplace_items DROP CONSTRAINT IF EXISTS marketplace_items_category_check;

-- 2. Add new constraint with updated categories
ALTER TABLE marketplace_items ADD CONSTRAINT marketplace_items_category_check 
  CHECK (category IN ('courtbooking', 'equipment', 'other', 'events', 'booking', 'physio'));

-- 3. Update existing categories to new values
UPDATE marketplace_items SET category = 'courtbooking' WHERE category = 'booking';
UPDATE marketplace_items SET category = 'other' WHERE category = 'physio';

-- 4. Delete existing items to replace with new structure  
DELETE FROM marketplace_items;

-- 5. Remove old constraint and add final constraint
ALTER TABLE marketplace_items DROP CONSTRAINT IF EXISTS marketplace_items_category_check;
ALTER TABLE marketplace_items ADD CONSTRAINT marketplace_items_category_check 
  CHECK (category IN ('courtbooking', 'equipment', 'other', 'events'));

-- 6. Insert 16 dummy products (4 per category)
INSERT INTO marketplace_items (name, category, credit_cost, description, image_url, partner_name, is_active, sort_order) VALUES
-- Courtbuchung (4 items)
('30 Min Court-Gutschein', 'courtbooking', 150, 'Einlösbar für eine 30-minütige Platzbuchung an allen P2G Standorten.', 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400&h=300&fit=crop', 'P2G', true, 1),
('60 Min Court-Gutschein', 'courtbooking', 280, 'Einlösbar für eine 60-minütige Platzbuchung an allen P2G Standorten.', 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=400&h=300&fit=crop', 'P2G', true, 2),
('90 Min Court-Gutschein', 'courtbooking', 400, 'Einlösbar für eine 90-minütige Platzbuchung an allen P2G Standorten.', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop', 'P2G', true, 3),
('Premium Court-Buchung', 'courtbooking', 500, 'Premium Court-Buchung inkl. Getränke und Handtücher.', 'https://images.unsplash.com/photo-1593787406217-f0bb98aa7d77?w=400&h=300&fit=crop', 'P2G Premium', true, 4),

-- Equipment (4 items)
('Padel-Schläger Verleih', 'equipment', 50, 'Hochwertiger Schläger für eine Spielsession.', 'https://images.unsplash.com/photo-1617883861744-13b534e3b928?w=400&h=300&fit=crop', 'Adidas', true, 1),
('10er Pack Padel-Bälle', 'equipment', 80, 'Premium Padel-Bälle für optimales Spielgefühl.', 'https://images.unsplash.com/photo-1519861155730-0b607c064445?w=400&h=300&fit=crop', 'Wilson', true, 2),
('Griffband Set (3 Stück)', 'equipment', 30, 'Hochwertige Griffbänder für besseren Halt.', 'https://images.unsplash.com/photo-1600256697404-e6e276b2c30d?w=400&h=300&fit=crop', 'Head', true, 3),
('Padel-Tasche Premium', 'equipment', 350, 'Große Padel-Tasche mit Schuhfach und Thermo-Isolierung.', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=300&fit=crop', 'Bullpadel', true, 4),

-- Sonstiges/Other inkl. Physio (4 items)
('Physio Session 30 Min', 'other', 200, 'Professionelle Physiotherapie-Einheit für Padel-Spieler.', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop', 'PhysioFit', true, 1),
('Massage 45 Min', 'other', 250, 'Entspannende Sportmassage nach dem Spiel.', 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=400&h=300&fit=crop', 'WellnessZone', true, 2),
('Energy Drink 6er Pack', 'other', 40, 'Isotonische Getränke für optimale Energie.', 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=400&h=300&fit=crop', 'Red Bull', true, 3),
('P2G Merchandise Shirt', 'other', 120, 'Offizielles P2G T-Shirt in verschiedenen Größen.', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=300&fit=crop', 'P2G', true, 4),

-- Events (4 items)
('P2G Summer Jam Ticket', 'events', 300, 'Eintritt zum legendären P2G Summer Jam Event.', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=300&fit=crop', 'P2G Events', true, 1),
('Padel Night Party', 'events', 150, 'Ticket für die monatliche Padel Night mit DJ und Turnieren.', 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=300&fit=crop', 'P2G Events', true, 2),
('Pro-Am Turnier Teilnahme', 'events', 450, 'Teilnahme am Pro-Am Turnier mit Profi-Spielern.', 'https://images.unsplash.com/photo-1461896836934-480e46e15a41?w=400&h=300&fit=crop', 'P2G League', true, 3),
('VIP Lounge Zugang', 'events', 200, 'VIP Zugang bei allen P2G Events inkl. Catering.', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=300&fit=crop', 'P2G VIP', true, 4);