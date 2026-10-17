REVOKE ALL ON public.subject_save_attempts FROM anon, authenticated;
ALTER TABLE public.subject_save_attempts ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.consume_subject_save_attempt(_user_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(_user_id::text, 43));
  IF (SELECT count(*) FROM public.subject_save_attempts WHERE user_id = _user_id AND attempted_at > clock_timestamp() - interval '15 minutes') >= 5 THEN RETURN false; END IF;
  INSERT INTO public.subject_save_attempts (user_id, attempted_at) VALUES (_user_id, clock_timestamp());
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.consume_subject_save_attempt(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_subject_save_attempt(uuid) TO service_role;
ALTER TABLE public.app_settings ADD CONSTRAINT ai_check_block_category_check CHECK (ai_check_block_category IS NULL OR ai_check_block_category IN ('provider_access_denied', 'credit_block'));
COMMENT ON COLUMN public.app_settings.handle_check_block_category IS 'DEPRECATED: replaced by ai_check_block_category';
COMMENT ON COLUMN public.app_settings.handle_check_blocked_at IS 'DEPRECATED: replaced by ai_check_blocked_at';
COMMENT ON COLUMN public.app_settings.handle_check_run_id IS 'DEPRECATED: replaced by ai_check_run_id';