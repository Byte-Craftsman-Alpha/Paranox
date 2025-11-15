import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const PatientProfile = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
    phone: "",
    address: "",
    date_of_birth: "",
    blood_group: "",
    insurance_id: "",
  });

  const [emergency, setEmergency] = useState({
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relationship: "",
    allergies: "",
    chronic_conditions: "",
  });

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [{ data: p }, { data: e }] = await Promise.all([
          supabase.from("patient_profiles")
            .select("phone,address,date_of_birth,blood_group,insurance_id")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase.from("patient_emergency_details")
            .select("emergency_contact_name,emergency_contact_phone,emergency_contact_relationship,allergies,chronic_conditions")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

        if (p) {
          setProfile({
            phone: p.phone ?? "",
            address: p.address ?? "",
            date_of_birth: p.date_of_birth ?? "",
            blood_group: p.blood_group ?? "",
            insurance_id: p.insurance_id ?? "",
          });
        }
        if (e) {
          setEmergency({
            emergency_contact_name: e.emergency_contact_name ?? "",
            emergency_contact_phone: e.emergency_contact_phone ?? "",
            emergency_contact_relationship: e.emergency_contact_relationship ?? "",
            allergies: e.allergies ?? "",
            chronic_conditions: e.chronic_conditions ?? "",
          });
        }
      } catch (err) {
        console.error(err);
        toast({ variant: "destructive", title: "Error", description: "Failed to load profile" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toast]);

  const saveAll = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const upsertProfile = supabase.from("patient_profiles").upsert(
        { user_id: user.id, ...profile },
        { onConflict: "user_id" }
      );

      const upsertEmergency = supabase.from("patient_emergency_details").upsert(
        { user_id: user.id, ...emergency },
        { onConflict: "user_id" }
      );

      const [{ error: e1 }, { error: e2 }] = await Promise.all([upsertProfile, upsertEmergency]);
      if (e1) throw e1;
      if (e2) throw e2;

      toast({ title: "Saved", description: "Profile updated successfully" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patient Profile</h1>
          <p className="text-muted-foreground">Manage your personal and emergency information</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Personal Details</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-muted-foreground py-4">Loading...</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input id="dob" type="date" value={profile.date_of_birth || ""} onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea id="address" rows={3} value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="blood">Blood Group</Label>
                  <Input id="blood" value={profile.blood_group} onChange={(e) => setProfile({ ...profile, blood_group: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ins">Insurance ID</Label>
                  <Input id="ins" value={profile.insurance_id} onChange={(e) => setProfile({ ...profile, insurance_id: e.target.value })} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Emergency & Public Info</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Emergency details are publicly readable to aid emergency care. Doctors linked to you can access your records per policies.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ecn">Emergency Contact Name</Label>
                <Input id="ecn" value={emergency.emergency_contact_name} onChange={(e) => setEmergency({ ...emergency, emergency_contact_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ecp">Emergency Contact Phone</Label>
                <Input id="ecp" value={emergency.emergency_contact_phone} onChange={(e) => setEmergency({ ...emergency, emergency_contact_phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ecr">Relationship</Label>
                <Input id="ecr" value={emergency.emergency_contact_relationship} onChange={(e) => setEmergency({ ...emergency, emergency_contact_relationship: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="all">Allergies</Label>
                <Textarea id="all" rows={3} value={emergency.allergies} onChange={(e) => setEmergency({ ...emergency, allergies: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ch">Chronic Conditions</Label>
                <Textarea id="ch" rows={3} value={emergency.chronic_conditions} onChange={(e) => setEmergency({ ...emergency, chronic_conditions: e.target.value })} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={saveAll} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PatientProfile;