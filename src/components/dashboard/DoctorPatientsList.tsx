import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Users, Calendar } from "lucide-react";

interface DoctorPatient {
  id: string;
  patient_id: string;
  admission_date: string;
  discharge_date: string | null;
  status: string;
  notes: string | null;
  patient_name?: string;
}

export const DoctorPatientsList = () => {
  const [patients, setPatients] = useState<DoctorPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First get the patient relationships
      const { data: patientData, error: patientsError } = await supabase
        .from("doctor_patients")
        .select("*")
        .eq("doctor_id", user.id)
        .order("admission_date", { ascending: false });

      if (patientsError) throw patientsError;

      if (patientData && patientData.length > 0) {
        // Get unique patient IDs
        const patientIds = [...new Set(patientData.map(p => p.patient_id))];

        // Fetch profiles for these patients
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", patientIds);

        if (profilesError) throw profilesError;

        // Combine the data
        const enrichedPatients = patientData.map(patient => ({
          ...patient,
          patient_name: profilesData?.find(p => p.id === patient.patient_id)?.full_name || "Unknown Patient"
        }));

        setPatients(enrichedPatients);
      } else {
        setPatients([]);
      }
    } catch (error) {
      console.error("Error loading patients:", error);
      toast({
        title: "Error",
        description: "Failed to load patient list",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading patients...</div>;
  }

  if (patients.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No patients under your care yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {patients.map((patient) => (
        <Card key={patient.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg">
                {patient.patient_name}
              </CardTitle>
              <Badge variant={patient.status === "active" ? "default" : "secondary"}>
                {patient.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center text-sm">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-muted-foreground">Admitted:</span>
              <span className="ml-2 font-medium">
                {format(new Date(patient.admission_date), "MMM dd, yyyy")}
              </span>
            </div>
            {patient.discharge_date && (
              <div className="flex items-center text-sm">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground">Discharged:</span>
                <span className="ml-2 font-medium">
                  {format(new Date(patient.discharge_date), "MMM dd, yyyy")}
                </span>
              </div>
            )}
            {patient.notes && (
              <div className="text-sm text-muted-foreground mt-2 pt-2 border-t">
                <p className="line-clamp-2">{patient.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
