-- Migration: 0026_fix_storage_objects_collation_indexes
-- Fixes PostgreSQL error 42P10 on storage upload by ensuring unique indexes match ON CONFLICT (bucket_id, name COLLATE "C")
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects') THEN
    -- Only switch role if current user is authorized to assume supabase_storage_admin
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_roles r 
        JOIN pg_auth_members m ON r.oid = m.roleid 
        WHERE r.rolname = 'supabase_storage_admin' 
          AND m.member = (SELECT oid FROM pg_roles WHERE rolname = CURRENT_USER)
      ) THEN
        PERFORM set_config('role', 'supabase_storage_admin', true);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    BEGIN
      DROP INDEX IF EXISTS storage.idx_objects_current_version;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_objects_current_version ON storage.objects (bucket_id, name COLLATE "C") WHERE archived_at IS NULL;

      DROP INDEX IF EXISTS storage.idx_objects_null_version;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_objects_null_version ON storage.objects (bucket_id, name COLLATE "C") WHERE NOT is_versioned;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping storage.objects index creation due to permissions: %', SQLERRM;
    END;

    BEGIN
      RESET ROLE;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
END $$;
