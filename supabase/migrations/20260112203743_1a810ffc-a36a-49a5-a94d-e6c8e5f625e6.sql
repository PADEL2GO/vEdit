-- 1. Drop existing foreign key constraint
ALTER TABLE public.lobbies 
DROP CONSTRAINT IF EXISTS lobbies_court_id_fkey;

-- 2. Add new foreign key with ON DELETE CASCADE
ALTER TABLE public.lobbies
ADD CONSTRAINT lobbies_court_id_fkey 
  FOREIGN KEY (court_id) 
  REFERENCES public.courts(id) 
  ON DELETE CASCADE;