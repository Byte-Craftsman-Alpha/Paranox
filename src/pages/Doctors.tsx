import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DoctorProfile = {
  user_id: string;
  full_name: string;
  specialization: string | null;
  years_of_experience: number | null;
  organization_name: string | null;
  academic_records: Array<{
    id: string;
    degree_name: string;
    institution: string;
    year_obtained: number;
    certificate_url: string | null;
  }>;
};

const Doctors = () => {
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        // Load doctor profiles
        const { data: docProfiles, error } = await supabase
          .from("doctor_profiles")
          .select("user_id, specialization, years_of_experience, healthcare_organization_id");
        if (error) throw error;

        const userIds = (docProfiles || []).map((d) => d.user_id);
        const orgIds = Array.from(
          new Set((docProfiles || []).map((d) => d.healthcare_organization_id).filter(Boolean) as string[])
        );

        // Load names and organizations
        const [{ data: profiles }, { data: orgs }, { data: academics }] = await Promise.all([
          supabase.from("profiles").select("id, full_name").in("id", userIds.length ? userIds : [""]),
          supabase.from("healthcare_organizations").select("id, name").in("id", orgIds.length ? orgIds : [""]),
          supabase.from("academic_records").select("id, doctor_id, degree_name, institution, year_obtained, certificate_url"),
        ]);

        const profileMap = new Map((profiles || []).map((p) => [p.id, p.full_name]));
        const orgMap = new Map((orgs || []).map((o) => [o.id, o.name]));
        const acadByDoctor = new Map<string, DoctorProfile["academic_records"]>();
        (academics || []).forEach((a) => {
          const list = acadByDoctor.get(a.doctor_id) ?? [];
          list.push({
            id: a.id,
            degree_name: a.degree_name,
            institution: a.institution,
            year_obtained: a.year_obtained,
            certificate_url: a.certificate_url,
          });
          acadByDoctor.set(a.doctor_id, list);
        });

        const mapped: DoctorProfile[] = (docProfiles || []).map((d) => ({
          user_id: d.user_id,
          full_name: profileMap.get(d.user_id) ?? "Doctor",
          specialization: d.specialization ?? null,
          years_of_experience: d.years_of_experience ?? null,
          organization_name: d.healthcare_organization_id ? orgMap.get(d.healthcare_organization_id) ?? null : null,
          academic_records: acadByDoctor.get(d.user_id) ?? [],
        }));

        setDoctors(mapped);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Doctors</h1>
          <p className="text-muted-foreground">Public profiles and qualifications</p>
        </div>

        {loading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : doctors.length === 0 ? (
          <div className="text-muted-foreground">No doctors found.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {doctors.map((d) => (
              <Card key={d.user_id}>
                <CardHeader>
                  <CardTitle className="text-lg">{d.full_name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    {d.specialization || "General"}{d.years_of_experience != null ? ` • ${d.years_of_experience} yrs` : ""}
                    {d.organization_name ? ` • ${d.organization_name}` : ""}
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Academic Records</div>
                    {d.academic_records.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No records listed.</div>
                    ) : (
                      <ul className="list-disc pl-5 text-sm">
                        {d.academic_records.map((a) => (
                          <li key={a.id}>
                            {a.degree_name}, {a.institution} ({a.year_obtained})
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Doctors;