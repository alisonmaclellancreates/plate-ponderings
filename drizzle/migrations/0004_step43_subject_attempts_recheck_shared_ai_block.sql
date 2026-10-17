CREATE TABLE public.subject_save_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.subject_save_attempts TO service_role;

CREATE OR REPLACE FUNCTION public.consume_subject_save_attempt(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
BEGIN
  SELECT count(*) INTO recent_count
  FROM public.subject_save_attempts
  WHERE user_id = _user_id
    AND attempted_at > now() - interval '15 minutes';
  IF recent_count >= 5 THEN
    RETURN false;
  END IF;
  INSERT INTO public.subject_save_attempts (user_id) VALUES (_user_id);
  RETURN true;
END;
$$;

ALTER TABLE public.profiles ADD COLUMN last_recheck_at timestamptz;

ALTER TABLE public.app_settings ADD COLUMN ai_check_block_category text;
ALTER TABLE public.app_settings ADD COLUMN ai_check_blocked_at timestamptz;
ALTER TABLE public.app_settings ADD COLUMN ai_check_run_id text;
UPDATE public.app_settings
SET ai_check_block_category = handle_check_block_category,
    ai_check_blocked_at = handle_check_blocked_at,
    ai_check_run_id = handle_check_run_id;
COMMENT ON COLUMN public.app_settings.handle_check_block_category IS 'DEPRECATED: replaced by ai_check_block_category';
COMMENT ON COLUMN public.app_settings.handle_check_blocked_at IS 'DEPRECATED: replaced by ai_check_blocked_at';
COMMENT ON COLUMN public.app_settings.handle_check_run_id IS 'DEPRECATED: replaced by ai_check_run_id';