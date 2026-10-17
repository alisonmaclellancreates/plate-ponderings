REVOKE ALL ON public.stories FROM anon, authenticated;
GRANT SELECT ON public.stories TO authenticated;
GRANT ALL ON public.stories TO service_role;
REVOKE ALL ON public.story_save_attempts FROM anon, authenticated;
GRANT ALL ON public.story_save_attempts TO service_role;