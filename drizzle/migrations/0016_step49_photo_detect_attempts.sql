DROP POLICY IF EXISTS "story-photos: author uploads own folder" ON storage.objects;

CREATE TABLE public.photo_detect_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.photo_detect_attempts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.photo_detect_attempts TO service_role;
ALTER TABLE public.photo_detect_attempts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_photo_detect_attempt(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF public.has_role(_user_id, 'demo') THEN RETURN false; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(_user_id::text, 45));
  IF (SELECT count(*) FROM public.photo_detect_attempts WHERE user_id = _user_id AND attempted_at > clock_timestamp() - interval '15 minutes') >= 5 THEN RETURN false; END IF;
  INSERT INTO public.photo_detect_attempts (user_id, attempted_at) VALUES (_user_id, clock_timestamp());
  RETURN true;
END $function$;

REVOKE ALL ON FUNCTION public.consume_photo_detect_attempt(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_photo_detect_attempt(uuid) TO service_role;
