-- Create new enum type with updated roles
CREATE TYPE public.app_role_new AS ENUM ('doctor', 'patient', 'healthcare_organization');

-- Update profiles table to use new enum
ALTER TABLE public.profiles 
  ALTER COLUMN role DROP DEFAULT,
  ALTER COLUMN role TYPE public.app_role_new USING (
    CASE role::text
      WHEN 'provider' THEN 'doctor'::public.app_role_new
      WHEN 'staff' THEN 'healthcare_organization'::public.app_role_new
      ELSE 'patient'::public.app_role_new
    END
  ),
  ALTER COLUMN role SET DEFAULT 'patient'::public.app_role_new;

-- Drop old enum type
DROP TYPE public.app_role;

-- Rename new enum to original name
ALTER TYPE public.app_role_new RENAME TO app_role;

-- Update the handle_new_user function to use new default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'patient')
  );
  RETURN NEW;
END;
$function$;