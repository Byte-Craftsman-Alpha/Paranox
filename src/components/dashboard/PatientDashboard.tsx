import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface MedicalRecord {
  id: string;
  title: string;
  description: string | null;
  record_date: string;
  record_type: string;
  file_url: string | null;
  created_at: string;
}

export const PatientDashboard = () => {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const { toast } = useToast();

  const [newRecord, setNewRecord] = useState({
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

  useEffect(() => {
    loadMedicalRecords();
  }, []);

  const loadMedicalRecords = async () => {
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
    } catch (error) {
      console.error("Error loading medical records:", error);
      toast({
        title: "Error",
        description: "Failed to load medical records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecord = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const descriptionSections: Array<[string, string]> = [
        ["Objective", newRecord.objective],
        ["Diagnosis", newRecord.diagnosis],
        ["Prescription", newRecord.prescriptions],
        ["Medicines", newRecord.medicines],
        ["Tests", newRecord.tests],
        ["Follow-up advice", newRecord.followUp],
        ["Notes", newRecord.notes],
      ];

      const composedDescription = descriptionSections
        .filter(([, val]) => (val || "").trim().length > 0)
        .map(([label, val]) => `${label}:
${val.trim()}`)
        .join("\n\n");

      const payload = {
        title: newRecord.title,
        description: composedDescription || null,
        record_date: newRecord.record_date,
        record_type: newRecord.record_type,
        patient_id: user.id,
      };

      const { error } = await supabase
        .from("medical_records")
        .insert(payload);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Medical record added successfully",
      });

      setIsAddDialogOpen(false);
      setNewRecord({
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
      loadMedicalRecords();
    } catch (error) {
      console.error("Error adding record:", error);
      toast({
        title: "Error",
        description: "Failed to add medical record",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Medical Records</h1>
          <p className="text-muted-foreground">
            View and manage your medical history
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Record
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Medical Record</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newRecord.title}
                    onChange={(e) => setNewRecord({ ...newRecord, title: e.target.value })}
                    placeholder="e.g., Annual Checkup"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="record_date">Date</Label>
                  <Input
                    id="record_date"
                    type="date"
                    value={newRecord.record_date}
                    onChange={(e) => setNewRecord({ ...newRecord, record_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="record_type">Record Type</Label>
                <Select
                  value={newRecord.record_type}
                  onValueChange={(value) => setNewRecord({ ...newRecord, record_type: value })}
                >
                  <SelectTrigger id="record_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="diagnosis">Diagnosis</SelectItem>
                    <SelectItem value="prescription">Prescription</SelectItem>
                    <SelectItem value="lab_report">Lab Report</SelectItem>
                    <SelectItem value="imaging">Imaging</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="objective">Objective / Reason</Label>
                  <Textarea
                    id="objective"
                    value={newRecord.objective}
                    onChange={(e) => setNewRecord({ ...newRecord, objective: e.target.value })}
                    placeholder="Reason for the record/visit"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diagnosis">Diagnosis</Label>
                  <Textarea
                    id="diagnosis"
                    value={newRecord.diagnosis}
                    onChange={(e) => setNewRecord({ ...newRecord, diagnosis: e.target.value })}
                    placeholder="Diagnosis details"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prescriptions">Prescriptions</Label>
                  <Textarea
                    id="prescriptions"
                    value={newRecord.prescriptions}
                    onChange={(e) => setNewRecord({ ...newRecord, prescriptions: e.target.value })}
                    placeholder="Prescribed treatment"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medicines">Medicines</Label>
                  <Textarea
                    id="medicines"
                    value={newRecord.medicines}
                    onChange={(e) => setNewRecord({ ...newRecord, medicines: e.target.value })}
                    placeholder="Medicines and dosage"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tests">Tests</Label>
                  <Textarea
                    id="tests"
                    value={newRecord.tests}
                    onChange={(e) => setNewRecord({ ...newRecord, tests: e.target.value })}
                    placeholder="Recommended tests"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="followUp">Follow-up advice</Label>
                  <Textarea
                    id="followUp"
                    value={newRecord.followUp}
                    onChange={(e) => setNewRecord({ ...newRecord, followUp: e.target.value })}
                    placeholder="Follow-up recommendations"
                    rows={3}
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={newRecord.notes}
                    onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
                    placeholder="Any additional notes"
                    rows={4}
                  />
                </div>
              </div>

              <Button onClick={handleAddRecord} className="w-full">
                Add Record
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No medical records yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Click "Add Record" to create your first entry
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {records.map((record) => (
            <Card
              key={record.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setSelectedRecord(record)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{record.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 capitalize">
                      {record.record_type.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-1" />
                    {format(new Date(record.record_date), "MMM dd, yyyy")}
                  </div>
                </div>
              </CardHeader>
              {record.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {record.description}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedRecord?.title}</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-muted-foreground">Type</Label>
                <p className="capitalize">{selectedRecord.record_type.replace('_', ' ')}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Date</Label>
                <p>{format(new Date(selectedRecord.record_date), "MMMM dd, yyyy")}</p>
              </div>
              {selectedRecord.description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="whitespace-pre-wrap">{selectedRecord.description}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Added on</Label>
                <p>{format(new Date(selectedRecord.created_at), "MMMM dd, yyyy 'at' h:mm a")}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
