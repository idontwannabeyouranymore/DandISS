-- =====================================================================
-- DandISS — Fase 4: políticas de Storage para imágenes de la barbería
-- =====================================================================
-- Ejecuta UNA vez en el SQL Editor, después de schema.sql y phase3-setup.sql.
-- Permite que el DUEÑO suba la portada/logo de SU barbería al bucket media,
-- bajo la carpeta shops/<barbershop_id>/...
-- (La lectura pública ya la habilita la política "media lectura publica".)
-- =====================================================================

drop policy if exists "media dueno sube shop" on storage.objects;
create policy "media dueno sube shop" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = 'shops'
    and exists (
      select 1 from public.barbershops b
      where b.id::text = (storage.foldername(name))[2]
        and b.owner_id = auth.uid()
    )
  );

drop policy if exists "media dueno actualiza shop" on storage.objects;
create policy "media dueno actualiza shop" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = 'shops'
    and exists (
      select 1 from public.barbershops b
      where b.id::text = (storage.foldername(name))[2]
        and b.owner_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = 'shops'
    and exists (
      select 1 from public.barbershops b
      where b.id::text = (storage.foldername(name))[2]
        and b.owner_id = auth.uid()
    )
  );

drop policy if exists "media dueno borra shop" on storage.objects;
create policy "media dueno borra shop" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = 'shops'
    and exists (
      select 1 from public.barbershops b
      where b.id::text = (storage.foldername(name))[2]
        and b.owner_id = auth.uid()
    )
  );
