CREATE INDEX subject_save_attempts_user_time
  ON public.subject_save_attempts (user_id, attempted_at);