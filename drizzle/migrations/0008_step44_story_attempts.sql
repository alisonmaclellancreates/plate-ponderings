CREATE TABLE public.story_save_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.story_save_attempts FROM anon, authenticated;
GRANT ALL ON public.story_save_attempts TO service_role;
ALTER TABLE public.story_save_attempts ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.consume_story_save_attempt(_user_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(_user_id::text, 44));
  IF (SELECT count(*) FROM public.story_save_attempts WHERE user_id = _user_id AND attempted_at > clock_timestamp() - interval '15 minutes') >= 5 THEN RETURN false; END IF;
  INSERT INTO public.story_save_attempts (user_id, attempted_at) VALUES (_user_id, clock_timestamp());
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.consume_story_save_attempt(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_story_save_attempt(uuid) TO service_role;
CREATE INDEX story_save_attempts_user_time ON public.story_save_attempts (user_id, attempted_at);