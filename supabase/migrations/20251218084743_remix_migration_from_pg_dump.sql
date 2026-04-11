CREATE EXTENSION IF NOT EXISTS "btree_gist" WITH SCHEMA "public";
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: booking_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.booking_status AS ENUM (
    'pending',
    'confirmed',
    'cancelled'
);


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  
  INSERT INTO public.wallets (user_id)
  VALUES (NEW.id);
  
  INSERT INTO public.skill_stats (user_id)
  VALUES (NEW.id);
  
  INSERT INTO public.ai_player_analytics (user_id, has_ai_data, data)
  VALUES (NEW.id, false, '{}'::jsonb);
  
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: validate_username(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_username() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $_$
BEGIN
  IF NEW.username IS NOT NULL THEN
    -- Check length
    IF LENGTH(NEW.username) < 3 OR LENGTH(NEW.username) > 30 THEN
      RAISE EXCEPTION 'Username must be between 3 and 30 characters';
    END IF;
    -- Check format (lowercase alphanumeric, dots, underscores)
    IF NEW.username !~ '^[a-z0-9._]+$' THEN
      RAISE EXCEPTION 'Username can only contain lowercase letters, numbers, dots and underscores';
    END IF;
    -- Lowercase the username
    NEW.username = LOWER(NEW.username);
  END IF;
  RETURN NEW;
END;
$_$;


SET default_table_access_method = heap;

--
-- Name: ai_player_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_player_analytics (
    user_id uuid NOT NULL,
    has_ai_data boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT now(),
    data jsonb DEFAULT '{}'::jsonb
);


--
-- Name: ai_visual_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_visual_assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    asset_type text NOT NULL,
    image_url text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: booking_players; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_players (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    user_id uuid,
    display_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    location_id uuid NOT NULL,
    court_id uuid NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    status public.booking_status DEFAULT 'confirmed'::public.booking_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    cancelled_at timestamp with time zone,
    CONSTRAINT valid_time_range CHECK ((end_time > start_time))
);


--
-- Name: courts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    location_id uuid NOT NULL,
    name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    address text,
    timezone text DEFAULT 'Europe/Berlin'::text NOT NULL,
    opening_hours_json jsonb DEFAULT '{"friday": {"open": "06:00", "close": "23:00"}, "monday": {"open": "06:00", "close": "23:00"}, "sunday": {"open": "06:00", "close": "23:00"}, "tuesday": {"open": "06:00", "close": "23:00"}, "saturday": {"open": "06:00", "close": "23:00"}, "thursday": {"open": "06:00", "close": "23:00"}, "wednesday": {"open": "06:00", "close": "23:00"}}'::jsonb NOT NULL,
    rewards_enabled boolean DEFAULT true NOT NULL,
    ai_analysis_enabled boolean DEFAULT true NOT NULL,
    vending_enabled boolean DEFAULT false NOT NULL,
    features_json jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    user_id uuid NOT NULL,
    username text,
    display_name text,
    age integer,
    avatar_url text,
    games_played_self integer DEFAULT 0,
    skill_self_rating integer DEFAULT 5,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT profiles_age_check CHECK (((age IS NULL) OR ((age >= 0) AND (age <= 120)))),
    CONSTRAINT profiles_games_played_self_check CHECK ((games_played_self >= 0)),
    CONSTRAINT profiles_skill_self_rating_check CHECK (((skill_self_rating >= 1) AND (skill_self_rating <= 10)))
);


--
-- Name: skill_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skill_stats (
    user_id uuid NOT NULL,
    skill_level integer DEFAULT 0,
    ai_rank integer,
    last_ai_update timestamp with time zone,
    CONSTRAINT skill_stats_skill_level_check CHECK (((skill_level >= 0) AND (skill_level <= 10000)))
);


--
-- Name: wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallets (
    user_id uuid NOT NULL,
    play_credits integer DEFAULT 0 NOT NULL,
    reward_credits integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wallets_play_credits_check CHECK ((play_credits >= 0)),
    CONSTRAINT wallets_reward_credits_check CHECK ((reward_credits >= 0))
);


--
-- Name: ai_player_analytics ai_player_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_player_analytics
    ADD CONSTRAINT ai_player_analytics_pkey PRIMARY KEY (user_id);


--
-- Name: ai_visual_assets ai_visual_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_visual_assets
    ADD CONSTRAINT ai_visual_assets_pkey PRIMARY KEY (id);


--
-- Name: booking_players booking_players_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_players
    ADD CONSTRAINT booking_players_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: courts courts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courts
    ADD CONSTRAINT courts_pkey PRIMARY KEY (id);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: locations locations_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_slug_key UNIQUE (slug);


--
-- Name: bookings no_overlapping_bookings; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT no_overlapping_bookings EXCLUDE USING gist (court_id WITH =, tstzrange(start_time, end_time) WITH &&) WHERE ((status = ANY (ARRAY['pending'::public.booking_status, 'confirmed'::public.booking_status])));


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (user_id);


--
-- Name: profiles profiles_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_username_key UNIQUE (username);


--
-- Name: skill_stats skill_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skill_stats
    ADD CONSTRAINT skill_stats_pkey PRIMARY KEY (user_id);


--
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (user_id);


--
-- Name: idx_ai_visual_assets_asset_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_visual_assets_asset_type ON public.ai_visual_assets USING btree (asset_type);


--
-- Name: idx_ai_visual_assets_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_visual_assets_user_id ON public.ai_visual_assets USING btree (user_id);


--
-- Name: idx_bookings_court_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_court_start ON public.bookings USING btree (court_id, start_time);


--
-- Name: idx_bookings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_status ON public.bookings USING btree (status);


--
-- Name: idx_bookings_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_user ON public.bookings USING btree (user_id);


--
-- Name: idx_courts_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courts_location ON public.courts USING btree (location_id);


--
-- Name: locations update_locations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: wallets update_wallets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles validate_username_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_username_trigger BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.validate_username();


--
-- Name: ai_player_analytics ai_player_analytics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_player_analytics
    ADD CONSTRAINT ai_player_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ai_visual_assets ai_visual_assets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_visual_assets
    ADD CONSTRAINT ai_visual_assets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: booking_players booking_players_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_players
    ADD CONSTRAINT booking_players_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: booking_players booking_players_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_players
    ADD CONSTRAINT booking_players_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: bookings bookings_court_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_court_id_fkey FOREIGN KEY (court_id) REFERENCES public.courts(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: courts courts_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courts
    ADD CONSTRAINT courts_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: skill_stats skill_stats_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skill_stats
    ADD CONSTRAINT skill_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: wallets wallets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: bookings Anyone can check availability; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can check availability" ON public.bookings FOR SELECT USING (true);


--
-- Name: courts Anyone can view courts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view courts" ON public.courts FOR SELECT USING (true);


--
-- Name: locations Anyone can view locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view locations" ON public.locations FOR SELECT USING (true);


--
-- Name: booking_players Users can add players to their bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add players to their bookings" ON public.booking_players FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.bookings
  WHERE ((bookings.id = booking_players.booking_id) AND (bookings.user_id = auth.uid())))));


--
-- Name: bookings Users can insert their own bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own bookings" ON public.bookings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: bookings Users can update their own bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own bookings" ON public.bookings FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: booking_players Users can view booking players for their bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view booking players for their bookings" ON public.booking_players FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.bookings
  WHERE ((bookings.id = booking_players.booking_id) AND (bookings.user_id = auth.uid())))));


--
-- Name: ai_player_analytics Users can view their own analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own analytics" ON public.ai_player_analytics FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: bookings Users can view their own bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own bookings" ON public.bookings FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: skill_stats Users can view their own skill stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own skill stats" ON public.skill_stats FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: ai_visual_assets Users can view their own visual assets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own visual assets" ON public.ai_visual_assets FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: wallets Users can view their own wallet; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own wallet" ON public.wallets FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: ai_player_analytics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_player_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_visual_assets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_visual_assets ENABLE ROW LEVEL SECURITY;

--
-- Name: booking_players; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.booking_players ENABLE ROW LEVEL SECURITY;

--
-- Name: bookings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

--
-- Name: courts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;

--
-- Name: locations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: skill_stats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.skill_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: wallets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


