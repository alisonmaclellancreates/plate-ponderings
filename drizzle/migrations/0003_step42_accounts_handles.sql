ALTER TABLE public.profiles ADD CONSTRAINT profiles_handle_valid CHECK (handle ~ '^[A-Za-z0-9_]{3,20}$' AND lower(handle) <> ALL (ARRAY['admin','administrator','owner','demo','moderator','mod','staff','support','whattheplate','system','null','undefined'])) NOT VALID;
ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_handle_valid;

CREATE FUNCTION public.create_generated_profile(_user_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE start_number integer := floor(random()*10000)::integer; candidate text; n integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN RETURN; END IF;
  FOR n IN 0..9999 LOOP
    IF (start_number+n)%10000 = 4821 THEN CONTINUE; END IF;
    candidate := 'Traveler' || lpad(((start_number+n)%10000)::text,4,'0');
    BEGIN
      INSERT INTO public.profiles(id,handle) VALUES (_user_id,candidate);
      RETURN;
    EXCEPTION WHEN unique_violation THEN
      IF EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN RETURN; END IF;
    END;
  END LOOP;
  RAISE EXCEPTION 'Account could not be created';
END $$;
REVOKE ALL ON FUNCTION public.create_generated_profile(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_generated_profile(uuid) TO service_role;

CREATE FUNCTION public.on_account_created() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN PERFORM public.create_generated_profile(NEW.id); RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.on_account_created() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.on_account_created() TO service_role;
CREATE TRIGGER plate_account_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.on_account_created();
DO $$ DECLARE existing_user record; BEGIN FOR existing_user IN SELECT id FROM auth.users WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id=auth.users.id) LOOP PERFORM public.create_generated_profile(existing_user.id); END LOOP; END $$;

CREATE TABLE public.handle_save_attempts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, attempted_at timestamptz NOT NULL DEFAULT now());
REVOKE ALL ON public.handle_save_attempts FROM anon, authenticated;
GRANT ALL ON public.handle_save_attempts TO service_role;
ALTER TABLE public.handle_save_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX handle_save_attempts_user_time ON public.handle_save_attempts(user_id,attempted_at);
CREATE FUNCTION public.consume_handle_save_attempt(_user_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
 IF public.has_role(_user_id,'demo') THEN RETURN false; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_user_id::text,42));
 IF (SELECT count(*) FROM public.handle_save_attempts WHERE user_id=_user_id AND attempted_at > clock_timestamp()-interval '15 minutes') >= 5 THEN RETURN false; END IF;
 INSERT INTO public.handle_save_attempts(user_id,attempted_at) VALUES (_user_id,clock_timestamp());
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.consume_handle_save_attempt(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_handle_save_attempt(uuid) TO service_role;

ALTER TABLE public.app_settings ADD COLUMN handle_check_block_category text, ADD COLUMN handle_check_blocked_at timestamptz, ADD COLUMN handle_check_run_id text;
ALTER TABLE public.app_settings ADD CONSTRAINT handle_check_block_category_valid CHECK (handle_check_block_category IS NULL OR handle_check_block_category IN ('provider_access_denied','credit_block'));
