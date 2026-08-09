CREATE POLICY "Signed-in users can view reference photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'reference-photos');

CREATE POLICY "Managers and owners can upload reference photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reference-photos' AND public.is_manager_or_owner());

CREATE POLICY "Managers and owners can update reference photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'reference-photos' AND public.is_manager_or_owner())
  WITH CHECK (bucket_id = 'reference-photos' AND public.is_manager_or_owner());

CREATE POLICY "Managers and owners can delete reference photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'reference-photos' AND public.is_manager_or_owner());