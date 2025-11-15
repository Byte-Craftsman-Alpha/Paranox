import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Plus, FileText } from "lucide-react";

type MedicalRecord = {
  id: string;
  title: string;
  description: string | null;
  record_date: string;
  record_type: string;
  file_url: string | null;
  created_at: string;
};

const MedicalHistory = () => {
  const { toast } = useToast();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    title: "",
    record_date: new Date().toISOString().split("T")[0],
    record_type: "general",
    issuing_hospital: "",
    objective: "",
    prescriptions: "",
    medicines: "",
    followup_advice: "",
    notes: "",
  });

  const detailsText = useMemo(() => {
    const parts: Array<[string, string]> = [
      ["Issuing Hospital", form.issuing_hospital],
      ["Objective", form.objective],
      ["Prescriptions", form.prescriptions],
      ["Medicines", form.medicines],
      ["Follow-up advice", form.followup_advice],
      ["Notes", form.notes],
    ];
    return parts
      .filter(([, v]) => (v || "").trim())
      .map(([k, v]) => `${k}:\n${v.trim()}`)
      .join("\n\n");
  }, [form]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("medical_records")
          .select("*")
          .eq("patient_id", user.id)
          .order("record_date", { ascending: false });

        if (error) throw error;
        setRecords(data || []);
      } catch (err) {
        console.error(err);
        toast({ variant: "destructive", title: "Error", description: "Failed to load medical history" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toast]);

  const handleUploadIfAny = async (userId: string): Promise<string | null> => {
    if (!file) return null;
    const ext = file.name.split(".").pop() || "bin";
    const path = `${userId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("medical-records").upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || `application/octet-stream`,
      upsert: false,
    });
    if (error) throw error;
    return path; // store storage path in file_url
  };

  const addRecord = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const filePath = await handleUploadIfAny(user.id);

      const payload = {
        title: form.title,
        description: detailsText || null,
        record_date: form.record_date,
        record_type: form.record_type,
        file_url: filePath ?? null,
        patient_id: user.id,
      };

      const { error } = await supabase.from("medical_records").insert([payload]);
      if (error) throw error;

      toast({ title: "Added", description: "Medical record added successfully" });
      setOpen(false);
      setForm({
        title: "",
        record_date: new Date().toISOString().split("T")[0],
        record_type: "general",
        issuing_hospital: "",
        objective: "",
        prescriptions: "",
        medicines: "",
        followup_advice: "",
        notes: "",
      });
      setFile(null);

      // reload
      const { data } = await supabase
        .from("medical_records")
        .select("*")
        .eq("patient_id", user.id)
        .order("record_date", { ascending: false });
      setRecords(data || []);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Failed to add record" });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Medical History</h1>
            <p className="text-muted-foreground">Upload and manage your medical records</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Record
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Medical Record</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input id="date" type="date" value={form.record_date} onChange={(e) => setForm({ ...form, record_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={form.record_type} onValueChange={(v) => setForm({ ...form, record_type: v })}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="prescription">Prescription</SelectItem>
                        <SelectItem value="lab">Lab Report</SelectItem>
                        <SelectItem value="imaging">Imaging</SelectItem>
                        <SelectItem value="discharge">Discharge Summary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hospital">Issuing Hospital</Label>
                    <Input id="hospital" value={form.issuing_hospital} onChange={(e) => setForm({ ...form, issuing_hospital: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="objective">Objective (Reason)</Label>
                  <Textarea id="objective" rows={2} value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prescriptions">Prescriptions</Label>
                  <Textarea id="prescriptions" rows={2} value={form.prescriptions} onChange={(e) => setForm({ ...form, prescriptions: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medicines">Medicine Details</Label>
                  <Textarea id="medicines" rows={2} value={form.medicines} onChange={(e) => setForm({ ...form, medicines: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="followup">Follow-up Advice</Label>
                  <Textarea id="followup" rows={2} value={form.followup_advice} onChange={(e) => setForm({ ...form, followup_advice: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="file">Upload (image or PDF) - optional</Label>
                  <Input id="file" type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </div>

                <div className="flex justify-end">
                  <Button onClick={addRecord}>Save Record</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Records</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-muted-foreground py-4">Loading...</div>
            ) : records.length === 0 ? (
              <div className="text-muted-foreground py-4">No records yet.</div>
            ) : (
              <div className="space-y-3">
                {records.map((r) => (
                  <div key={r.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{r.title}</div>
                      <div className="text-sm text-muted-foreground">{format(new Date(r.record_date), "PP")}</div>
                    </div>
                    {r.description && (
                      <pre className="whitespace-pre-wrap text-sm mt-2">{r.description}</pre>
                    )}
                    {r.file_url && (
                      <a
                        className="inline-flex items-center gap-2 text-primary text-sm mt-2"
                        href={supabase.storage.from("medical-records").getPublicUrl(r.file_url).data.publicUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <FileText className="h-4 w-4" />
                        View attachment
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MedicalHistory;