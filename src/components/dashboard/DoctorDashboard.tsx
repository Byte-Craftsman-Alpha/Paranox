import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DoctorPatientsList } from "./DoctorPatientsList";
import { DoctorProfile } from "./DoctorProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export const DoctorDashboard = () => {
  const { toast } = useToast();
  const [requestPatientId, setRequestPatientId] = useState("");
  const [myPatients, setMyPatients] = useState<Array<{ id: string; patient_id: string; status: string; patient_name?: string }>>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);

  const [actionPatient, setActionPatient] = useState<{ patient_id: string; patient_name?: string; status: string } | null>(null);
  const [activeAction, setActiveAction] = useState<"add_record" | "diagnosis_alert" | "revisit" | "refer" | null>(null);

  // Add Record form
  const [newRecord, setNewRecord] = useState({
    title: "",
    record_date: new Date().toISOString().split("T")[0],
    record_type: "general",
    objective: "",
    prescriptions: "",
    medicines: "",
    notes: "",
  });

  // Diagnosis alert
  const [diagnosisNotes, setDiagnosisNotes] = useState("");

  // Revisit reminder
  const [revDate, setRevDate] = useState("");
  const [revTime, setRevTime] = useState("");
  const [revNotes, setRevNotes] = useState("");

  // Referral
  const [refRole, setRefRole] = useState<"doctor" | "healthcare_organization" | "">("");
  const [refTargetId, setRefTargetId] = useState("");
  const [refNotes, setRefNotes] = useState("");

  useEffect(() => {
    loadMyPatients();
  }, []);

  const loadMyPatients = async () => {
    try {
      setLoadingPatients(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: rels, error } = await supabase
        .from("doctor_patients")
        .select("id, patient_id, status")
        .eq("doctor_id", user.id)
        .order("admission_date", { ascending: false });
      if (error) throw error;
      const pids = Array.from(new Set((rels || []).map(r => r.patient_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", pids.length ? pids : [""]);
      const nameMap = new Map((profs || []).map(p => [p.id, (p as any).full_name as string]));
      const mapped = (rels || []).map(r => ({ ...r, patient_name: nameMap.get(r.patient_id) }));
      setMyPatients(mapped);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message || "Failed to load patients" });
    } finally {
      setLoadingPatients(false);
    }
  };

  const requestAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !requestPatientId) return;
      const { error } = await supabase
        .from("doctor_patients")
        .insert({ doctor_id: user.id, patient_id: requestPatientId, status: "pending", admission_date: new Date().toISOString() });
      if (error) throw error;
      toast({ title: "Requested", description: "Access request sent to patient." });
      setRequestPatientId("");
      loadMyPatients();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message || "Failed to request access" });
    }
  };

  const canMutateRecords = (status: string) => status === "active" || status === "approved";

  const saveNewRecord = async () => {
    try {
      if (!actionPatient) return;
      if (!canMutateRecords(actionPatient.status)) {
        toast({ variant: "destructive", title: "Not allowed", description: "Access not approved. You can’t add records yet." });
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const sections: Array<[string, string]> = [
        ["Objective", newRecord.objective],
        ["Prescriptions", newRecord.prescriptions],
        ["Medicines", newRecord.medicines],
        ["Notes", newRecord.notes],
      ];
      const desc = sections.filter(([,v]) => (v||"").trim()).map(([k,v]) => `${k}:\n${v.trim()}`).join("\n\n");
      const { error } = await supabase
        .from("medical_records")
        .insert({
          title: newRecord.title,
          description: desc || null,
          record_date: newRecord.record_date,
          record_type: newRecord.record_type,
          patient_id: actionPatient.patient_id,
          doctor_id: user.id,
        });
      if (error) throw error;
      toast({ title: "Saved", description: "Record added for patient." });
      setActionPatient(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message || "Failed to add record" });
    }
  };

  const createDiagnosisAlert = async () => {
    try {
      if (!actionPatient) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const body = `ALERT: Diagnosis required before next operation.\n\n${diagnosisNotes ? `Notes:\n${diagnosisNotes}` : ""}`.trim();
      const { error } = await supabase
        .from("medical_records")
        .insert({
          title: "Diagnosis Required",
          description: body,
          record_date: new Date().toISOString().split("T")[0],
          record_type: "diagnosis",
          patient_id: actionPatient.patient_id,
          doctor_id: user.id,
        });
      if (error) throw error;
      toast({ title: "Alert created", description: "Diagnosis requirement recorded." });
      setActionPatient(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message || "Failed to create alert" });
    }
  };

  const createRevisitReminder = async () => {
    try {
      if (!actionPatient || !revDate || !revTime) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const dt = `${revDate}T${revTime}:00`;
      const { error } = await supabase
        .from("appointments")
        .insert({ patient_id: actionPatient.patient_id, appointment_date: dt, status: "booked", notes: revNotes || null, created_by: user.id });
      if (error) throw error;
      toast({ title: "Reminder set", description: "Patient revisit reminder created." });
      setActionPatient(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message || "Failed to set reminder" });
    }
  };

  const createReferral = async () => {
    try {
      if (!actionPatient || !refRole || !refTargetId) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const body = `Referral to ${refRole}: ${refTargetId}${refNotes ? `\n\nNotes:\n${refNotes}` : ""}`;
      const { error } = await supabase
        .from("medical_records")
        .insert({
          title: "Referral",
          description: body,
          record_date: new Date().toISOString().split("T")[0],
          record_type: "general",
          patient_id: actionPatient.patient_id,
          doctor_id: user.id,
        });
      if (error) throw error;
      toast({ title: "Referred", description: "Referral saved to patient history." });
      setActionPatient(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message || "Failed to refer" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Doctor Dashboard</h1>
        <p className="text-muted-foreground">Manage your patients and professional profile</p>
      </div>

      <Tabs defaultValue="patients" className="space-y-4">
        <TabsList>
          <TabsTrigger value="patients">My Patients</TabsTrigger>
          <TabsTrigger value="profile">Professional Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="patients" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Request Access to Patient Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-[1fr_auto] items-end">
                <div className="space-y-2">
                  <Label htmlFor="patient_id_req">Patient ID</Label>
                  <Input id="patient_id_req" value={requestPatientId} onChange={(e) => setRequestPatientId(e.target.value)} placeholder="Enter patient user ID" />
                </div>
                <div className="md:justify-end flex">
                  <Button onClick={requestAccess} disabled={!requestPatientId}>Request Access</Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Requests create a pending link. Patients must approve before you can add records. Existing records cannot be altered.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Patients</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPatients ? (
                <div className="text-muted-foreground py-4">Loading...</div>
              ) : myPatients.length === 0 ? (
                <div className="text-muted-foreground py-4">No patients yet.</div>
              ) : (
                <div className="space-y-2">
                  {myPatients.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded border p-3">
                      <div>
                        <div className="font-medium">{p.patient_name || p.patient_id}</div>
                        <div className="text-xs text-muted-foreground">Status: {p.status}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setActionPatient({ patient_id: p.patient_id, patient_name: p.patient_name, status: p.status }); setActiveAction(null); }}>Actions</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={!!actionPatient} onOpenChange={(open) => { if (!open) { setActionPatient(null); setActiveAction(null); } }}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Patient Actions{actionPatient ? ` - ${actionPatient.patient_name || actionPatient.patient_id}` : ""}</DialogTitle>
              </DialogHeader>

              <div className="flex flex-wrap gap-2">
                <Button variant={activeAction === "add_record" ? "default" : "outline"} onClick={() => setActiveAction("add_record")}>Add Record</Button>
                <Button variant={activeAction === "diagnosis_alert" ? "default" : "outline"} onClick={() => setActiveAction("diagnosis_alert")}>Diagnosis Alert</Button>
                <Button variant={activeAction === "revisit" ? "default" : "outline"} onClick={() => setActiveAction("revisit")}>Set Revisit</Button>
                <Button variant={activeAction === "refer" ? "default" : "outline"} onClick={() => setActiveAction("refer")}>Refer</Button>
              </div>

              {activeAction === "add_record" && (
                <div className="space-y-4 pt-4">
                  {!canMutateRecords(actionPatient!.status) && (
                    <div className="text-sm text-destructive">Access not approved yet. You can’t add records until the patient approves your request.</div>
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input id="title" value={newRecord.title} onChange={(e) => setNewRecord({ ...newRecord, title: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input id="date" type="date" value={newRecord.record_date} onChange={(e) => setNewRecord({ ...newRecord, record_date: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Record Type</Label>
                    <Select value={newRecord.record_type} onValueChange={(v) => setNewRecord({ ...newRecord, record_type: v })}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
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
                      <Label>Objective</Label>
                      <Textarea rows={3} value={newRecord.objective} onChange={(e) => setNewRecord({ ...newRecord, objective: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Prescriptions</Label>
                      <Textarea rows={3} value={newRecord.prescriptions} onChange={(e) => setNewRecord({ ...newRecord, prescriptions: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Medicines</Label>
                      <Textarea rows={3} value={newRecord.medicines} onChange={(e) => setNewRecord({ ...newRecord, medicines: e.target.value })} />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label>Notes</Label>
                      <Textarea rows={3} value={newRecord.notes} onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={saveNewRecord} disabled={!canMutateRecords(actionPatient!.status)}>Save Record</Button>
                  </div>
                </div>
              )}

              {activeAction === "diagnosis_alert" && (
                <div className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">Creates an alert entry that diagnosis is required before the next operation.</p>
                  <div className="space-y-2">
                    <Label>Notes (optional)</Label>
                    <Textarea rows={4} value={diagnosisNotes} onChange={(e) => setDiagnosisNotes(e.target.value)} />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={createDiagnosisAlert}>Create Alert</Button>
                  </div>
                </div>
              )}

              {activeAction === "revisit" && (
                <div className="space-y-4 pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input type="date" value={revDate} onChange={(e) => setRevDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Time</Label>
                      <Input type="time" value={revTime} onChange={(e) => setRevTime(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea rows={3} value={revNotes} onChange={(e) => setRevNotes(e.target.value)} />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={createRevisitReminder} disabled={!revDate || !revTime}>Set Reminder</Button>
                  </div>
                </div>
              )}

              {activeAction === "refer" && (
                <div className="space-y-4 pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Refer to</Label>
                      <Select value={refRole} onValueChange={(v: any) => { setRefRole(v); setRefTargetId(""); }}>
                        <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="doctor">Doctor</SelectItem>
                          <SelectItem value="healthcare_organization">Healthcare Organization</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Target ID</Label>
                      <Input value={refTargetId} onChange={(e) => setRefTargetId(e.target.value)} placeholder="Enter user/org ID" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea rows={3} value={refNotes} onChange={(e) => setRefNotes(e.target.value)} />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={createReferral} disabled={!refRole || !refTargetId}>Create Referral</Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <DoctorProfile />
        </TabsContent>
      </Tabs>
    </div>
  );
};
