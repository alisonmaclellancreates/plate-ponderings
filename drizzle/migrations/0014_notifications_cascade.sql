alter table public.notifications drop constraint notifications_subject_id_fkey;
alter table public.notifications add constraint notifications_subject_id_fkey
  foreign key (subject_id) references public.subjects(id) on delete cascade;
alter table public.notifications drop constraint notifications_story_id_fkey;
alter table public.notifications add constraint notifications_story_id_fkey
  foreign key (story_id) references public.stories(id) on delete cascade;