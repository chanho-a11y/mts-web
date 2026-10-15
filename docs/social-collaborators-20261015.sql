-- D-145 인스타그램 공동 작업자. 2026-10-15 프로덕션(mtspace-commerce) 적용 완료.
alter table public.social_post add column if not exists collaborators text[] not null default '{}'::text[];
alter table public.social_post add constraint social_post_collaborators_check check (cardinality(collaborators) <= 3 and array_to_string(collaborators, ',') ~ '^([A-Za-z0-9._]{1,30}(,[A-Za-z0-9._]{1,30})*)?$');
comment on column public.social_post.collaborators is 'Instagram 공동 작업자 사용자명(@ 없이, 최대 3). 발행 워커가 컨테이너 생성 시 collaborators 로 보낸다 (D-145)';
