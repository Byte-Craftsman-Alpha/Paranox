import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PatientDashboard } from "@/components/dashboard/PatientDashboard";
import { DoctorDashboard } from "@/components/dashboard/DoctorDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, FileText, Users, ShieldAlert } from "lucide-react";
import { format } from "date-fns";

const Dashboard = () => {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [orgPatients, setOrgPatients] = useState<Array<{ patient_id: string; full_name: string }>>([]);
  const [orgLoading, setOrgLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<{ patient_id: string; full_name: string } | null>(null);
  const [medicalRecords, setMedicalRecords] = useState<Array<{ id: string; title: string; description: string | null; record_date: string; record_type: string }>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Appointments history state
  const [orgAppointments, setOrgAppointments] = useState<Array<{ id: string; patient_id: string; appointment_date: string; status: string; notes: string | null; patient_name: string }>>([]);
  const [apptsLoading, setApptsLoading] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<null | { id: string; patient_id: string; appointment_date: string; status: string; notes: string | null; patient_name: string }>(null);
  const [appointmentProvider, setAppointmentProvider] = useState<null | { full_name: string; role: string }>(null);
  const [linkedRecord, setLinkedRecord] = useState<null | { id: string; title: string; description: string | null; record_date: string; record_type: string }>(null);

  const [emgPatientId, setEmgPatientId] = useState("");
  const [emergencyDetails, setEmergencyDetails] = useState<{ allergies: string | null; chronic_conditions: string | null; emergency_contact_name: string | null; emergency_contact_phone: string | null; emergency_contact_relationship: string | null } | null>(null);

  // Patient actions state (org)
  const [actionPatient, setActionPatient] = useState<{ patient_id: string; full_name: string } | null>(null);
  const [activeAction, setActiveAction] = useState<"add_record" | "summary" | "follow_up" | "refer" | null>(null);

  // Add Record form (structured)
  const [orgNewRecord, setOrgNewRecord] = useState({
    title: "",
    record_date: new Date().toISOString().split('T')[0],
    record_type: "general",
    objective: "",
    diagnosis: "",
    prescriptions: "",
    medicines: "",
    tests: "",
    followUp: "",
    notes: "",
  });

  // Summary data
  const [generatedCues, setGeneratedCues] = useState<string>("");
  const [generatedSummary, setGeneratedSummary] = useState<string>("");

  // Follow-up form
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");

  // Referral form
  const [referralRole, setReferralRole] = useState<"doctor" | "healthcare_organization" | "">("");
  const [referralTarget, setReferralTarget] = useState<string>("");
  const [referralOptions, setReferralOptions] = useState<Array<{ id: string; full_name: string }>>([]);
  const [referralReason, setReferralReason] = useState("");

  useEffect(() => {
    loadUserRole();
  }, [user]);

  useEffect(() => {
    if (userRole === "healthcare_organization") {
      loadApprovedPatients();
    }
  }, [userRole]);

  useEffect(() => {
    if (userRole === "healthcare_organization" && orgPatients.length > 0) {
      loadOrgAppointments();
    } else if (userRole === "healthcare_organization") {
      setOrgAppointments([]);
    }
  }, [userRole, orgPatients]);

  const loadUserRole = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setUserRole(data?.role || null);
    } catch (error) {
      console.error("Error loading user role:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadApprovedPatients = async () => {
    if (!user) return;
    setOrgLoading(true);
    try {
      const { data: accessRows, error: accessError } = await supabase
        .from("patient_organization_access")
        .select("patient_id")
        .eq("organization_id", user.id)
        .eq("has_access", true);
      if (accessError) throw accessError;

      const patientIds = (accessRows || []).map(r => r.patient_id);
      if (patientIds.length === 0) {
        setOrgPatients([]);
        return;
      }

      const { data: profilesRows, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", patientIds);
      if (profilesError) throw profilesError;

      const mapped = (profilesRows || []).map(p => ({ patient_id: p.id as string, full_name: (p as any).full_name as string }));
      setOrgPatients(mapped);
    } catch (e) {
      console.error("Error loading approved patients:", e);
      setOrgPatients([]);
    } finally {
      setOrgLoading(false);
    }
  };

  const loadOrgAppointments = async () => {
    setApptsLoading(true);
    try {
      const approvedPatientIds = orgPatients.map(p => p.patient_id);
      if (approvedPatientIds.length === 0) {
        setOrgAppointments([]);
        return;
      }

      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id, patient_id, appointment_date, status, notes,
          patients ( id, full_name )
        `)
        .in("patient_id", approvedPatientIds)
        .order("appointment_date", { ascending: false })
        .limit(50);

      if (error) throw error;

      const rows = (data || []).map((row: any) => ({
        id: row.id,
        patient_id: row.patient_id,
        appointment_date: row.appointment_date,
        status: row.status,
        notes: row.notes,
        patient_name: row.patients?.full_name || "Unknown",
      }));
      setOrgAppointments(rows);
    } catch (e) {
      console.error("Error loading organization appointments:", e);
      setOrgAppointments([]);
    } finally {
      setApptsLoading(false);
    }
  };

  const openOrgMedicalHistory = async (patient: { patient_id: string; full_name: string }) => {
    setSelectedPatient(patient);
    setHistoryLoading(true);
    try {
      const { data: { user: current } } = await supabase.auth.getUser();
      if (!current) return;

      const { data: records, error } = await supabase
        .from("medical_records")
        .select("id, title, description, record_date, record_type")
        .eq("patient_id", patient.patient_id)
        .order("record_date", { ascending: false });
      if (error) throw error;
      setMedicalRecords(records || []);

      if (records && records.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", current.id)
          .single();
        const logs = records.map(r => ({
          accessed_by: current.id,
          accessed_by_role: profileData?.role || null,
          medical_record_id: r.id,
          access_type: "view",
          context: "Organization viewed medical history",
        }));
        const { error: logErr } = await supabase
          .from("medical_record_access_logs")
          .insert(logs);
        if (logErr) {
          console.error("Error logging org access:", logErr);
        }
      }
    } catch (e) {
      console.error("Error loading org medical history:", e);
      setMedicalRecords([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchEmergencyDetails = async () => {
    if (!emgPatientId) {
      setEmergencyDetails(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("patient_emergency_details")
        .select("allergies, chronic_conditions, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship")
        .eq("user_id", emgPatientId)
        .maybeSingle();
      if (error) throw error;
      setEmergencyDetails(data || null);
    } catch (e) {
      console.error("Error fetching emergency details:", e);
      setEmergencyDetails(null);
    }
  };

  const openOrgAppointmentDetails = async (appt: { id: string; patient_id: string; appointment_date: string; status: string; notes: string | null; patient_name: string }) => {
    setSelectedAppointment(appt);
    setAppointmentProvider(null);
    setLinkedRecord(null);

    try {
      const { data: { user: current } } = await supabase.auth.getUser();
      if (!current) return;

      // Fetch provider info (created_by) from appointments row
      const { data: apptRow } = await supabase
        .from("appointments")
        .select("created_by")
        .eq("id", appt.id)
        .single();
      if (apptRow?.created_by) {
        const { data: prov } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", apptRow.created_by)
          .single();
        if (prov) setAppointmentProvider({ full_name: (prov as any).full_name, role: (prov as any).role });
      }

      // Fetch recent medical records for patient and pick closest by date
      const { data: recs } = await supabase
        .from("medical_records")
        .select("id, title, description, record_date, record_type")
        .eq("patient_id", appt.patient_id)
        .order("record_date", { ascending: false })
        .limit(20);

      if (recs && recs.length > 0) {
        const apptTime = new Date(appt.appointment_date).getTime();
        let best = recs[0];
        let bestDiff = Math.abs(new Date(recs[0].record_date).getTime() - apptTime);
        for (const r of recs) {
          const d = Math.abs(new Date(r.record_date).getTime() - apptTime);
          if (d < bestDiff) {
            best = r as any;
            bestDiff = d;
          }
        }
        setLinkedRecord(best as any);

        // Log access against the linked medical record
        const { data: profileData } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", current.id)
          .single();
        const { error: logErr } = await supabase
          .from("medical_record_access_logs")
          .insert({
            accessed_by: current.id,
            accessed_by_role: (profileData as any)?.role || null,
            medical_record_id: (best as any).id,
            access_type: "appointment_view",
            context: `Viewed from appointment ${appt.id}`,
          });
        if (logErr) console.error("Error logging appointment view:", logErr);
      }
    } catch (e) {
      console.error("Error opening appointment details:", e);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {userRole === "patient" && <PatientDashboard />}
      {userRole === "doctor" && <DoctorDashboard />}
      {userRole === "healthcare_organization" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Organization Dashboard</h1>
            <p className="text-muted-foreground">
              Access approved patient histories and view emergency details
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> Approved Patients
              </CardTitle>
            </CardHeader>
            <CardContent>
              {orgLoading ? (
                <div className="text-muted-foreground py-6">Loading...</div>
              ) : orgPatients.length === 0 ? (
                <div className="text-muted-foreground py-6">No approved patients found.</div>
              ) : (
                <div className="space-y-2">
                  {orgPatients.map((p) => (
                    <div key={p.patient_id} className="flex items-center justify-between rounded-md border p-3">
                      <div className="font-medium">{p.full_name}</div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => openOrgMedicalHistory(p)}>
                          <FileText className="h-4 w-4 mr-2" /> View medical history
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setActionPatient(p)}>
                          Actions
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => {
                          setOrgAppointments((prev) => prev.filter(a => a.patient_id === p.patient_id));
                        }}>
                          View appointments
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" /> Appointments History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {apptsLoading ? (
                <div className="text-muted-foreground py-6">Loading appointments...</div>
              ) : orgAppointments.length === 0 ? (
                <div className="text-muted-foreground py-6">No appointments found for approved patients.</div>
              ) : (
                <div className="space-y-2">
                  {orgAppointments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <div className="font-medium">{a.patient_name}</div>
                        <div className="text-xs text-muted-foreground">{new Date(a.appointment_date).toLocaleString()}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openOrgAppointmentDetails(a)}>Details</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" /> Emergency Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 md:grid-cols-3 items-end">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="patient_id_emg">Patient ID</Label>
                  <Input id="patient_id_emg" value={emgPatientId} onChange={(e) => setEmgPatientId(e.target.value)} placeholder="Enter patient user ID" />
                </div>
                <div className="flex md:justify-end">
                  <Button onClick={fetchEmergencyDetails}>View Emergency Details</Button>
                </div>
              </div>

              {emergencyDetails ? (
                <div className="rounded-md border p-4 space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Allergies</span>
                    <p className="text-sm">{emergencyDetails.allergies || "-"}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Chronic Conditions</span>
                    <p className="text-sm">{emergencyDetails.chronic_conditions || "-"}</p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <span className="text-sm text-muted-foreground">Emergency Contact Name</span>
                      <p className="text-sm">{emergencyDetails.emergency_contact_name || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Emergency Contact Relationship</span>
                      <p className="text-sm">{emergencyDetails.emergency_contact_relationship || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Emergency Contact Phone</span>
                      <p className="text-sm">{emergencyDetails.emergency_contact_phone || "-"}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Enter a patient ID to view emergency details.</div>
              )}
            </CardContent>
          </Card>

          <Dialog
            open={!!selectedPatient}
            onOpenChange={(open) => {
              if (!open) {
                setSelectedPatient(null);
                setMedicalRecords([]);
              }
            }}
          >
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>
                  Medical History{selectedPatient ? ` - ${selectedPatient.full_name}` : ""}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {historyLoading ? (
                  <div className="text-center py-6 text-muted-foreground">Loading medical history...</div>
                ) : medicalRecords.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">No medical records found.</div>
                ) : (
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {medicalRecords.map((record) => (
                      <Card key={record.id} className="border-muted hover:border-primary/60 transition-colors">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <CardTitle className="text-base flex items-center gap-2">
                                <FileText className="h-4 w-4 text-primary" />
                                {record.title}
                              </CardTitle>
                              <p className="text-xs text-muted-foreground mt-1 capitalize">
                                {record.record_type.replace("_", " ")}
                              </p>
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground whitespace-nowrap">
                              <Calendar className="h-3 w-3 mr-1" />
                              {format(new Date(record.record_date), "MMM dd, yyyy")}
                            </div>
                          </div>
                        </CardHeader>
                        {record.description && (
                          <CardContent className="pt-0">
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{record.description}</p>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Patient Actions Dialog */}
          <Dialog
            open={!!actionPatient}
            onOpenChange={(open) => {
              if (!open) {
                setActionPatient(null);
                setActiveAction(null);
                setOrgNewRecord({
                  title: "",
                  record_date: new Date().toISOString().split('T')[0],
                  record_type: "general",
                  objective: "",
                  diagnosis: "",
                  prescriptions: "",
                  medicines: "",
                  tests: "",
                  followUp: "",
                  notes: "",
                });
                setGeneratedCues("");
                setGeneratedSummary("");
                setFollowUpDate("");
                setFollowUpTime("");
                setFollowUpNotes("");
                setReferralRole("");
                setReferralTarget("");
                setReferralOptions([]);
                setReferralReason("");
              }
            }}
          >
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>
                  Patient Actions{actionPatient ? ` - ${actionPatient.full_name}` : ""}
                </DialogTitle>
              </DialogHeader>

              {/* Action selectors */}
              <div className="flex flex-wrap gap-2">
                <Button variant={activeAction === "add_record" ? "default" : "outline"} onClick={() => setActiveAction("add_record")}>
                  Add Record
                </Button>
                <Button variant={activeAction === "summary" ? "default" : "outline"} onClick={async () => {
                  setActiveAction("summary");
                  if (!actionPatient) return;
                  // Generate simple rule-based cues & summary from last few records
                  const { data: recs } = await supabase
                    .from("medical_records")
                    .select("title, description, record_date, record_type")
                    .eq("patient_id", actionPatient.patient_id)
                    .order("record_date", { ascending: false })
                    .limit(10);
                  const text = (recs || []).map(r => `${r.record_type}: ${r.title}\n${r.description || ""}`).join("\n\n");
                  const cues: string[] = [];
                  if (text.match(/diabet|sugar/i)) cues.push("Consider HbA1c / blood sugar monitoring");
                  if (text.match(/hypertens|bp|blood pressure/i)) cues.push("Monitor blood pressure; review antihypertensives");
                  if (text.match(/infection|antibiotic/i)) cues.push("Check WBC/CRP and culture if indicated");
                  const summary = `Recent history overview:\n\n${(recs || []).map(r => `- ${new Date(r.record_date).toLocaleDateString()}: ${r.title} (${r.record_type})`).join("\n")}`;
                  setGeneratedCues(cues.join("\n"));
                  setGeneratedSummary(summary);
                }}>
                  Generate Cues & Summary
                </Button>
                <Button variant={activeAction === "follow_up" ? "default" : "outline"} onClick={() => setActiveAction("follow_up")}>
                  Set Follow-up Reminder
                </Button>
                <Button variant={activeAction === "refer" ? "default" : "outline"} onClick={() => setActiveAction("refer")}>
                  Refer Patient
                </Button>
              </div>

              {/* Add Record */}
              {activeAction === "add_record" && (
                <div className="space-y-4 pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="org_title">Title</Label>
                      <Input id="org_title" value={orgNewRecord.title} onChange={(e) => setOrgNewRecord({ ...orgNewRecord, title: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org_date">Date</Label>
                      <Input id="org_date" type="date" value={orgNewRecord.record_date} onChange={(e) => setOrgNewRecord({ ...orgNewRecord, record_date: e.target.value })} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="org_type">Record Type</Label>
                    <Select value={orgNewRecord.record_type} onValueChange={(v) => setOrgNewRecord({ ...orgNewRecord, record_type: v })}>
                      <SelectTrigger id="org_type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="diagnosis">Diagnosis</SelectItem>
                        <SelectItem value="prescription">Prescription</SelectItem>
                        <SelectItem value="lab_report">Lab Report</SelectItem>
                        <SelectItem value="imaging">Imaging</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Objective / Reason</Label>
                      <Textarea value={orgNewRecord.objective} onChange={(e) => setOrgNewRecord({ ...orgNewRecord, objective: e.target.value })} rows={3} />
                    </div>
                    <div className="space-y-2">
                      <Label>Diagnosis</Label>
                      <Textarea value={orgNewRecord.diagnosis} onChange={(e) => setOrgNewRecord({ ...orgNewRecord, diagnosis: e.target.value })} rows={3} />
                    </div>
                    <div className="space-y-2">
                      <Label>Prescriptions</Label>
                      <Textarea value={orgNewRecord.prescriptions} onChange={(e) => setOrgNewRecord({ ...orgNewRecord, prescriptions: e.target.value })} rows={3} />
                    </div>
                    <div className="space-y-2">
                      <Label>Medicines</Label>
                      <Textarea value={orgNewRecord.medicines} onChange={(e) => setOrgNewRecord({ ...orgNewRecord, medicines: e.target.value })} rows={3} />
                    </div>
                    <div className="space-y-2">
                      <Label>Tests</Label>
                      <Textarea value={orgNewRecord.tests} onChange={(e) => setOrgNewRecord({ ...orgNewRecord, tests: e.target.value })} rows={3} />
                    </div>
                    <div className="space-y-2">
                      <Label>Follow-up advice</Label>
                      <Textarea value={orgNewRecord.followUp} onChange={(e) => setOrgNewRecord({ ...orgNewRecord, followUp: e.target.value })} rows={3} />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label>Notes</Label>
                      <Textarea value={orgNewRecord.notes} onChange={(e) => setOrgNewRecord({ ...orgNewRecord, notes: e.target.value })} rows={4} />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={async () => {
                      if (!actionPatient || !user) return;
                      const sections: Array<[string, string]> = [
                        ["Objective", orgNewRecord.objective],
                        ["Diagnosis", orgNewRecord.diagnosis],
                        ["Prescription", orgNewRecord.prescriptions],
                        ["Medicines", orgNewRecord.medicines],
                        ["Tests", orgNewRecord.tests],
                        ["Follow-up advice", orgNewRecord.followUp],
                        ["Notes", orgNewRecord.notes],
                      ];
                      const desc = sections.filter(([,v]) => (v||"").trim()).map(([k,v]) => `${k}:\n${v.trim()}`).join("\n\n");
                      await supabase.from("medical_records").insert({
                        title: orgNewRecord.title,
                        description: desc || null,
                        record_date: orgNewRecord.record_date,
                        record_type: orgNewRecord.record_type,
                        patient_id: actionPatient.patient_id,
                        doctor_id: user.id,
                      });
                      setActionPatient(null);
                    }}>Save Record</Button>
                  </div>
                </div>
              )}

              {/* Generate Cues & Summary */}
              {activeAction === "summary" && (
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>Diagnosis Cues</Label>
                    <Textarea value={generatedCues} onChange={(e) => setGeneratedCues(e.target.value)} rows={4} />
                  </div>
                  <div>
                    <Label>System Summary</Label>
                    <Textarea value={generatedSummary} onChange={(e) => setGeneratedSummary(e.target.value)} rows={6} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setActionPatient(null)}>Close</Button>
                    <Button onClick={async () => {
                      if (!actionPatient) return;
                      const desc = `Diagnosis Cues:\n${generatedCues}\n\nSummary:\n${generatedSummary}`;
                      await supabase.from("medical_records").insert({
                        title: "System Evaluation Summary",
                        description: desc,
                        record_date: new Date().toISOString().split('T')[0],
                        record_type: "general",
                        patient_id: actionPatient.patient_id,
                      });
                      setActionPatient(null);
                    }}>Save as Record</Button>
                  </div>
                </div>
              )}

              {/* Follow-up Reminder */}
              {activeAction === "follow_up" && (
                <div className="space-y-4 pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Time</Label>
                      <Input type="time" value={followUpTime} onChange={(e) => setFollowUpTime(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea value={followUpNotes} onChange={(e) => setFollowUpNotes(e.target.value)} rows={3} />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={async () => {
                      if (!actionPatient || !user || !followUpDate || !followUpTime) return;
                      const dt = `${followUpDate}T${followUpTime}:00`;
                      await supabase.from("appointments").insert({
                        patient_id: actionPatient.patient_id,
                        appointment_date: dt,
                        status: "booked",
                        notes: followUpNotes || null,
                        created_by: user.id,
                      });
                      setActionPatient(null);
                    }}>Create Reminder</Button>
                  </div>
                </div>
              )}

              {/* Refer Patient */}
              {activeAction === "refer" && (
                <div className="space-y-4 pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Refer to</Label>
                      <Select value={referralRole} onValueChange={async (v: any) => {
                        setReferralRole(v);
                        setReferralTarget("");
                        if (!v) return;
                        const { data } = await supabase
                          .from("profiles")
                          .select("id, full_name, role")
                          .eq("role", v);
                        setReferralOptions((data || []).map((d: any) => ({ id: d.id, full_name: d.full_name })));
                      }}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="doctor">Doctor</SelectItem>
                          <SelectItem value="healthcare_organization">Organization</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Recipient</Label>
                      <Select value={referralTarget} onValueChange={(v) => setReferralTarget(v)}>
                        <SelectTrigger><SelectValue placeholder="Select recipient" /></SelectTrigger>
                        <SelectContent>
                          {referralOptions.map(o => (
                            <SelectItem key={o.id} value={o.id}>{o.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Reason</Label>
                    <Textarea value={referralReason} onChange={(e) => setReferralReason(e.target.value)} rows={4} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setActionPatient(null)}>Cancel</Button>
                    <Button onClick={async () => {
                      if (!actionPatient || !referralRole || !referralTarget) return;
                      const desc = `Referral to ${referralRole === 'doctor' ? 'Doctor' : 'Organization'} (${referralTarget})\nReason:\n${referralReason || '-'}`;
                      await supabase.from("medical_records").insert({
                        title: "Referral",
                        description: desc,
                        record_date: new Date().toISOString().split('T')[0],
                        record_type: "referral",
                        patient_id: actionPatient.patient_id,
                      });
                      setActionPatient(null);
                    }}>Create Referral</Button>
                  </div>
                </div>
              )}

            </DialogContent>
          </Dialog>

          <Dialog
            open={!!selectedAppointment}
            onOpenChange={(open) => {
              if (!open) {
                setSelectedAppointment(null);
                setAppointmentProvider(null);
                setLinkedRecord(null);
              }
            }}
          >
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>
                  Appointment Details{selectedAppointment ? ` - ${selectedAppointment.patient_name}` : ""}
                </DialogTitle>
              </DialogHeader>
              {selectedAppointment && (
                <div className="space-y-4 py-2">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Appointment</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm space-y-1">
                        <div className="text-muted-foreground">Date & Time</div>
                        <div>{new Date(selectedAppointment.appointment_date).toLocaleString()}</div>
                        <div className="text-muted-foreground mt-3">Status</div>
                        <div className="capitalize">{selectedAppointment.status}</div>
                        {selectedAppointment.notes && (
                          <>
                            <div className="text-muted-foreground mt-3">Notes</div>
                            <div className="whitespace-pre-wrap">{selectedAppointment.notes}</div>
                          </>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Provider</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm space-y-1">
                        <div className="text-muted-foreground">Name</div>
                        <div>{appointmentProvider?.full_name || "-"}</div>
                        <div className="text-muted-foreground mt-3">Role</div>
                        <div className="capitalize">{appointmentProvider?.role || "-"}</div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Linked Medical Record</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {!linkedRecord ? (
                        <div className="text-sm text-muted-foreground">No nearby medical record was found for this appointment date.</div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{linkedRecord.title}</div>
                            <div className="text-xs text-muted-foreground flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {format(new Date(linkedRecord.record_date), "MMM dd, yyyy")}
                            </div>
                          </div>
                          {linkedRecord.description && (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{linkedRecord.description}</p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Dashboard;
