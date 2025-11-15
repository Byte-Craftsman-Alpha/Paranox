import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Plus } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";

interface Patient {
  id: string;
  full_name: string;
}

interface Appointment {
  id: string;
  patient_id: string;
  appointment_date: string;
  status: string;
  notes: string | null;
  patients: Patient;
}

const Appointments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Role and patient-specific data
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Organization access management
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [orgAccess, setOrgAccess] = useState<Array<{ id: string; organization_id: string; has_access: boolean; org_name: string }>>([]);
  const [orgAccessSupported, setOrgAccessSupported] = useState(true);

  // Access logs
  const [accessLogs, setAccessLogs] = useState<Array<{ id: string; accessed_at: string; accessed_by: string; name: string; role: string | null }>>([]);
  const [logsSupported, setLogsSupported] = useState(true);

  // Linked doctors (read-only)
  const [linkedDoctors, setLinkedDoctors] = useState<Array<{ user_id: string; full_name: string; specialization: string | null; years_of_experience: number | null }>>([]);

  // Form state
  const [formData, setFormData] = useState({
    patient_id: "",
    appointment_date: "",
    appointment_time: "",
    status: "booked",
    notes: "",
  });

  useEffect(() => {
    const init = async () => {
      const { data: { user: current } } = await supabase.auth.getUser();
      if (!current) return;
      setUserId(current.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", current.id)
        .single();
      const role = profile?.role ?? null;
      setUserRole(role);

      // Patient-only auxiliary data
      if (role === "patient") {
        await Promise.all([
          loadOrganizations(),
          loadOrgAccess(current.id),
          loadAccessLogs(current.id),
          loadLinkedDoctors(current.id),
        ]);
      }

      // Existing data
      await Promise.all([loadAppointments(), loadPatients()]);
    };
    init();
  }, []);

  const loadAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          patients (
            id,
            full_name
          )
        `)
        .order("appointment_date", { ascending: true });

      if (error) throw error;
      setLogsSupported(true);
      setAppointments(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const loadOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from("healthcare_organizations")
        .select("id, name")
        .order("name");
      if (error) throw error;
      setOrganizations(data || []);
      setOrgAccessSupported(true);
    } catch (error: any) {
      const msg: string = error?.message || "";
      if (msg.includes("healthcare_organizations") || msg.includes("does not exist") || msg.includes("schema cache")) {
        setOrgAccessSupported(false);
        setOrganizations([]);
        return;
      }
      toast({ variant: "destructive", title: "Error", description: msg });
    }
  };

  const loadOrgAccess = async (pid: string) => {
    try {
      const { data, error } = await supabase
        .from("patient_organization_access")
        .select("id, organization_id, has_access, healthcare_organizations ( name )")
        .eq("patient_id", pid)
        .order("granted_at", { ascending: false });
      if (error) throw error;
      const mapped = (data || []).map((row: any) => ({
        id: row.id,
        organization_id: row.organization_id,
        has_access: row.has_access,
        org_name: row.healthcare_organizations?.name || "Unknown",
      }));
      setOrgAccess(mapped);
      setOrgAccessSupported(true);
    } catch (error: any) {
      const msg: string = error?.message || "";
      if (msg.includes("patient_organization_access") || msg.includes("does not exist") || msg.includes("schema cache")) {
        setOrgAccessSupported(false);
        setOrgAccess([]);
        return;
      }
      toast({ variant: "destructive", title: "Error", description: msg });
    }
  };

  const loadAccessLogs = async (pid: string) => {
    try {
      const { data: logs, error } = await supabase
        .from("medical_record_access_logs")
        .select("id, accessed_at, accessed_by, accessed_by_role, medical_record_id")
        .order("accessed_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const byIds = Array.from(new Set((logs || []).map((l) => l.accessed_by)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .in("id", byIds.length ? byIds : [""]);
      const nameMap = new Map((profs || []).map((p) => [p.id, { name: p.full_name, role: p.role }]));
      const mapped = (logs || []).map((l) => ({
        id: l.id,
        accessed_at: l.accessed_at,
        accessed_by: l.accessed_by,
        name: nameMap.get(l.accessed_by)?.name || l.accessed_by,
        role: nameMap.get(l.accessed_by)?.role || null,
      }));
      setAccessLogs(mapped);
    } catch (error: any) {
      const msg: string = error?.message || "";
      // If the table doesn't exist, silently ignore and leave logs empty
      if (msg.includes("medical_record_access_logs") || msg.includes("does not exist") || msg.includes("schema cache")) {
        setAccessLogs([]);
        setLogsSupported(false);
        return;
      }
      toast({ variant: "destructive", title: "Error", description: msg });
    }
  };

  const loadLinkedDoctors = async (pid: string) => {
    try {
      const { data: rels, error } = await supabase
        .from("doctor_patients")
        .select("doctor_id")
        .eq("patient_id", pid);
      if (error) throw error;
      const docIds = Array.from(new Set((rels || []).map((r) => r.doctor_id)));
      if (docIds.length === 0) { setLinkedDoctors([]); return; }
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", docIds);
      const { data: docs } = await supabase
        .from("doctor_profiles")
        .select("user_id, specialization, years_of_experience")
        .in("user_id", docIds);
      const docMap = new Map((docs || []).map((d) => [d.user_id, d]));
      const mapped = (profs || []).map((p) => ({
        user_id: p.id,
        full_name: p.full_name,
        specialization: docMap.get(p.id)?.specialization ?? null,
        years_of_experience: docMap.get(p.id)?.years_of_experience ?? null,
      }));
      setLinkedDoctors(mapped);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const grantOrgAccess = async () => {
    try {
      if (!orgAccessSupported) {
        toast({ title: "Unavailable", description: "Organization access management is not enabled in this environment." });
        return;
      }
      if (!userId || !selectedOrg) return;
      const { error } = await supabase
        .from("patient_organization_access")
        .upsert({
          patient_id: userId,
          organization_id: selectedOrg,
          has_access: true,
          granted_at: new Date().toISOString(),
          revoked_at: null,
        }, { onConflict: "patient_id,organization_id" });
      if (error) throw error;
      toast({ title: "Granted", description: "Organization access granted" });
      setSelectedOrg("");
      await loadOrgAccess(userId);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const revokeOrgAccess = async (id: string) => {
    try {
      if (!orgAccessSupported) {
        toast({ title: "Unavailable", description: "Organization access management is not enabled in this environment." });
        return;
      }
      const { error } = await supabase
        .from("patient_organization_access")
        .update({ has_access: false, revoked_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Revoked", description: "Organization access revoked" });
      if (userId) await loadOrgAccess(userId);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const loadPatients = async () => {
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("id, full_name")
        .order("full_name");

      if (error) throw error;
      setPatients(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const appointmentDateTime = `${formData.appointment_date}T${formData.appointment_time}:00`;

      const { error } = await supabase
        .from("appointments")
        .insert([{
          patient_id: formData.patient_id,
          appointment_date: appointmentDateTime,
          status: formData.status,
          notes: formData.notes || null,
          created_by: user?.id,
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Appointment created successfully",
      });

      setDialogOpen(false);
      resetForm();
      loadAppointments();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAppointmentStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Appointment marked as ${status}`,
      });

      loadAppointments();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const resetForm = () => {
    setFormData({
      patient_id: "",
      appointment_date: "",
      appointment_time: "",
      status: "booked",
      notes: "",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      booked: "default",
      completed: "secondary",
      cancelled: "destructive",
    };
    
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const groupAppointmentsByDate = () => {
    const grouped: Record<string, Appointment[]> = {};
    
    appointments.forEach((appointment) => {
      const date = new Date(appointment.appointment_date).toLocaleDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(appointment);
    });
    
    return grouped;
  };

  const groupedAppointments = groupAppointmentsByDate();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
            <p className="text-muted-foreground">Manage appointment schedule</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Schedule Appointment</DialogTitle>
                <DialogDescription>
                  Create a new appointment for a patient
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="patient_id">Patient *</Label>
                  <Select
                    value={formData.patient_id}
                    onValueChange={(value) => setFormData({ ...formData, patient_id: value })}
                    required
                  >
                    <SelectTrigger id="patient_id">
                      <SelectValue placeholder="Select a patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="appointment_date">Date *</Label>
                    <Input
                      id="appointment_date"
                      type="date"
                      value={formData.appointment_date}
                      onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="appointment_time">Time *</Label>
                    <Input
                      id="appointment_time"
                      type="time"
                      value={formData.appointment_time}
                      onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Creating..." : "Create Appointment"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {userRole === "patient" && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Manage Organization Access</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!orgAccessSupported ? (
                  <p className="text-sm text-muted-foreground">Organization access management is not available in this environment.</p>
                ) : (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="org">Grant access to organization</Label>
                      <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                        <SelectTrigger id="org"><SelectValue placeholder="Select organization" /></SelectTrigger>
                        <SelectContent>
                          {organizations.map((o) => (
                            <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex justify-end">
                        <Button size="sm" onClick={grantOrgAccess} disabled={!selectedOrg}>Grant</Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Organizations with access</p>
                      {(orgAccess || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No organizations have access.</p>
                      ) : (
                        <div className="space-y-2">
                          {orgAccess.filter((a) => a.has_access).map((a) => (
                            <div key={a.id} className="flex items-center justify-between rounded border p-2">
                              <span>{a.org_name}</span>
                              <Button size="sm" variant="outline" onClick={() => revokeOrgAccess(a.id)}>Revoke</Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Access Logs (private data)</CardTitle>
              </CardHeader>
              <CardContent>
                {(!logsSupported) ? (
                  <p className="text-sm text-muted-foreground">Access logs are not available in this environment.</p>
                ) : (accessLogs || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No access logs.</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-auto pr-1">
                    {accessLogs.map((l) => (
                      <div key={l.id} className="flex items-center justify-between rounded border p-2">
                        <div>
                          <div className="font-medium text-sm">{l.name}</div>
                          <div className="text-xs text-muted-foreground">{new Date(l.accessed_at).toLocaleString()}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">{l.role || "-"}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Linked Doctors</CardTitle>
              </CardHeader>
              <CardContent>
                {(linkedDoctors || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No linked doctors.</p>
                ) : (
                  <div className="grid gap-2 md:grid-cols-2">
                    {linkedDoctors.map((d) => (
                      <div key={d.user_id} className="rounded border p-3">
                        <div className="font-medium">{d.full_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {d.specialization || "General"}{d.years_of_experience != null ? ` • ${d.years_of_experience} yrs` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-3">
                  Note: Granting/revoking doctor access requires a doctor-patient link managed by providers per current policies.
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {Object.keys(groupedAppointments).length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                No appointments scheduled. Create your first appointment to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedAppointments).map(([date, dayAppointments]) => (
              <Card key={date}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {date}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dayAppointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <p className="font-semibold">{appointment.patients.full_name}</p>
                            {getStatusBadge(appointment.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(appointment.appointment_date).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          {appointment.notes && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {appointment.notes}
                            </p>
                          )}
                        </div>

                        {appointment.status === "booked" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateAppointmentStatus(appointment.id, "completed")}
                            >
                              Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateAppointmentStatus(appointment.id, "cancelled")}
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
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

export default Appointments;
