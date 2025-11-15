import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Plus, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface Patient {
  id: string;
  full_name: string;
  date_of_birth: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_by: string;
}

const Patients = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [role, setRole] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    full_name: "",
    date_of_birth: "",
    phone: "",
    email: "",
    notes: "",
  });

  useEffect(() => {
    const init = async () => {
      const { data: { user: current } } = await supabase.auth.getUser();
      if (!current) return;
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", current.id)
        .single();
      const r = data?.role ?? null;
      setRole(r);
      if (r === "patient") {
        navigate("/dashboard", { replace: true });
        return;
      }
      await loadPatients();
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPatients = async () => {
    try {
      const { data: { user: current } } = await supabase.auth.getUser();
      if (!current) return;
      const { data, error } = await supabase
        .from("patients")
        .select("id, full_name, date_of_birth, phone, email, notes, created_by")
        .eq("created_by", current.id)
        .order("created_at", { ascending: false });

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
      const { data: { user: current } } = await supabase.auth.getUser();
      if (!current) throw new Error("Not authenticated");

      if (editingPatient) {
        const { error } = await supabase
          .from("patients")
          .update(formData)
          .eq("id", editingPatient.id)
          .eq("created_by", current.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Patient updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("patients")
          .insert([{ ...formData, created_by: current.id }]);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Patient created successfully",
        });
      }

      setDialogOpen(false);
      resetForm();
      loadPatients();
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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this patient?")) return;

    try {
      const { data: { user: current } } = await supabase.auth.getUser();
      if (!current) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("patients")
        .delete()
        .eq("id", id)
        .eq("created_by", current.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Patient deleted successfully",
      });
      
      loadPatients();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const openEditDialog = (patient: Patient) => {
    setEditingPatient(patient);
    setFormData({
      full_name: patient.full_name,
      date_of_birth: patient.date_of_birth,
      phone: patient.phone || "",
      email: patient.email || "",
      notes: patient.notes || "",
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingPatient(null);
    setFormData({
      full_name: "",
      date_of_birth: "",
      phone: "",
      email: "",
      notes: "",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Patients</h1>
            <p className="text-muted-foreground">Manage patient records</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Patient
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPatient ? "Edit Patient" : "Add New Patient"}
                </DialogTitle>
                <DialogDescription>
                  {editingPatient ? "Update patient information" : "Enter patient details"}
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date of Birth *</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Saving..." : editingPatient ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Patient Records</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Date of Birth</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No patients found. Add your first patient to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  patients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-medium">{patient.full_name}</TableCell>
                      <TableCell>{new Date(patient.date_of_birth).toLocaleDateString()}</TableCell>
                      <TableCell>{patient.phone || "-"}</TableCell>
                      <TableCell>{patient.email || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(patient)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(patient.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Patients;
