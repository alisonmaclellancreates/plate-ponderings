ALTER TABLE public.reports ALTER COLUMN reporter_id DROP NOT NULL;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id)
  REFERENCES public.profiles(id) ON DELETE SET NULL NOT VALID;
ALTER TABLE public.reports VALIDATE CONSTRAINT reports_reporter_id_fkey;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_note_length CHECK (note IS NULL OR char_length(note) <= 200) NOT VALID;
ALTER TABLE public.reports VALIDATE CONSTRAINT reports_note_length;

CREATE OR REPLACE FUNCTION public.get_reported_stories()
RETURNS TABLE(
  story_id uuid,
  subject_id uuid,
  jurisdiction text,
  plate_text text,
  meaning text,
  handle text,
  status text,
  report_count integer,
  reasons text[],
  last_reported_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.subject_id, j.name, upper(sub.identity_b), s.meaning,
         coalesce(p.handle, 'Traveler'), s.status,
         count(r.id)::integer,
         array_agg(DISTINCT r.reason ORDER BY r.reason),
         max(r.created_at)
  FROM public.reports r
  JOIN public.stories s ON s.id = r.story_id
  JOIN public.subjects sub ON sub.id = s.subject_id
  JOIN public.jurisdictions j ON j.code = sub.identity_a
  LEFT JOIN public.profiles p ON p.id = s.author_id
  WHERE s.status IN ('published', 'hidden')
  GROUP BY s.id, j.name, sub.identity_b, p.handle
  ORDER BY max(r.created_at) DESC
$$;

REVOKE ALL ON FUNCTION public.get_reported_stories() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_reported_stories() TO service_role;