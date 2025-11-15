-- Create healthcare organizations table
CREATE TABLE public.healthcare_organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  contact_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.healthcare_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Healthcare organizations are viewable by everyone"
  ON public.healthcare_organizations FOR SELECT
  USING (true);

CREATE POLICY "Only healthcare_organization role can manage their organization"
  ON public.healthcare_organizations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'healthcare_organization'
    )
  );

-- Create doctor profiles table
CREATE TABLE public.doctor_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  specialization TEXT,
  years_of_experience INTEGER,
  bio TEXT,
  healthcare_organization_id UUID REFERENCES public.healthcare_organizations(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.doctor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctor profiles are viewable by everyone"
  ON public.doctor_profiles FOR SELECT
  USING (true);

CREATE POLICY "Doctors can manage their own profile"
  ON public.doctor_profiles FOR ALL
  USING (auth.uid() = user_id);

-- Create academic records table for doctors
CREATE TABLE public.academic_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES public.doctor_profiles(id) ON DELETE CASCADE,
  degree_name TEXT NOT NULL,
  institution TEXT NOT NULL,
  year_obtained INTEGER NOT NULL,
  certificate_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.academic_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Academic records are viewable by everyone"
  ON public.academic_records FOR SELECT
  USING (true);

CREATE POLICY "Doctors can manage their own academic records"
  ON public.academic_records FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.doctor_profiles
      WHERE doctor_profiles.id = academic_records.doctor_id
      AND doctor_profiles.user_id = auth.uid()
    )
  );

-- Create doctor-patient relationship table (BEFORE medical_records)
CREATE TABLE public.doctor_patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admission_date DATE NOT NULL,
  discharge_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, patient_id, admission_date)
);

ALTER TABLE public.doctor_patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can view their own patients"
  ON public.doctor_patients FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can manage their own patient relationships"
  ON public.doctor_patients FOR ALL
  USING (auth.uid() = doctor_id);

CREATE POLICY "Patients can view their doctor relationships"
  ON public.doctor_patients FOR SELECT
  USING (auth.uid() = patient_id);

-- Create medical records table (AFTER doctor_patients)
CREATE TABLE public.medical_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  record_date DATE NOT NULL,
  file_url TEXT,
  record_type TEXT NOT NULL DEFAULT 'general',
  doctor_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view their own medical records"
  ON public.medical_records FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can create their own medical records"
  ON public.medical_records FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can update their own medical records"
  ON public.medical_records FOR UPDATE
  USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can view medical records of their patients"
  ON public.medical_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.doctor_patients
      WHERE doctor_patients.doctor_id = auth.uid()
      AND doctor_patients.patient_id = medical_records.patient_id
    )
  );

-- Create triggers for updated_at columns
CREATE TRIGGER update_healthcare_organizations_updated_at
  BEFORE UPDATE ON public.healthcare_organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_doctor_profiles_updated_at
  BEFORE UPDATE ON public.doctor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_medical_records_updated_at
  BEFORE UPDATE ON public.medical_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_doctor_patients_updated_at
  BEFORE UPDATE ON public.doctor_patients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();