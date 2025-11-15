import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Award, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface DoctorProfileData {
  id: string;
  specialization: string | null;
  years_of_experience: number | null;
  bio: string | null;
  healthcare_organization_id: string | null;
}

interface AcademicRecord {
  id: string;
  degree_name: string;
  institution: string;
  year_obtained: number;
  certificate_url: string | null;
}

export const DoctorProfile = () => {
  const [profile, setProfile] = useState<DoctorProfileData | null>(null);
  const [academicRecords, setAcademicRecords] = useState<AcademicRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddAcademicOpen, setIsAddAcademicOpen] = useState(false);
  const { toast } = useToast();

  const [newAcademic, setNewAcademic] = useState({
    degree_name: "",
    institution: "",
    year_obtained: new Date().getFullYear(),
  });

  useEffect(() => {
    loadProfile();
    loadAcademicRecords();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("doctor_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (!data) {
        // Create profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from("doctor_profiles")
          .insert({ user_id: user.id })
          .select()
          .single();

        if (createError) throw createError;
        setProfile(newProfile);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAcademicRecords = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First get the doctor profile ID
      const { data: profileData } = await supabase
        .from("doctor_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profileData) return;

      const { data, error } = await supabase
        .from("academic_records")
        .select("*")
        .eq("doctor_id", profileData.id)
        .order("year_obtained", { ascending: false });

      if (error) throw error;
      setAcademicRecords(data || []);
    } catch (error) {
      console.error("Error loading academic records:", error);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      if (!profile) return;

      const { error } = await supabase
        .from("doctor_profiles")
        .update({
          specialization: profile.specialization,
          years_of_experience: profile.years_of_experience,
          bio: profile.bio,
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const handleAddAcademic = async () => {
    try {
      if (!profile) return;

      const { error } = await supabase
        .from("academic_records")
        .insert({
          ...newAcademic,
          doctor_id: profile.id,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Academic record added successfully",
      });

      setIsAddAcademicOpen(false);
      setNewAcademic({
        degree_name: "",
        institution: "",
        year_obtained: new Date().getFullYear(),
      });
      loadAcademicRecords();
    } catch (error) {
      console.error("Error adding academic record:", error);
      toast({
        title: "Error",
        description: "Failed to add academic record",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading profile...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Professional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="specialization">Specialization</Label>
            <Input
              id="specialization"
              value={profile?.specialization || ""}
              onChange={(e) => setProfile(profile ? { ...profile, specialization: e.target.value } : null)}
              placeholder="e.g., Cardiology"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="experience">Years of Experience</Label>
            <Input
              id="experience"
              type="number"
              value={profile?.years_of_experience || ""}
              onChange={(e) => setProfile(profile ? { ...profile, years_of_experience: parseInt(e.target.value) || null } : null)}
              placeholder="e.g., 10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Professional Bio</Label>
            <Textarea
              id="bio"
              value={profile?.bio || ""}
              onChange={(e) => setProfile(profile ? { ...profile, bio: e.target.value } : null)}
              placeholder="Tell us about your expertise and experience..."
              rows={4}
            />
          </div>
          <Button onClick={handleUpdateProfile}>Save Changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Academic Credentials</CardTitle>
            <Dialog open={isAddAcademicOpen} onOpenChange={setIsAddAcademicOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Credential
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Academic Credential</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="degree">Degree Name</Label>
                    <Input
                      id="degree"
                      value={newAcademic.degree_name}
                      onChange={(e) => setNewAcademic({ ...newAcademic, degree_name: e.target.value })}
                      placeholder="e.g., Doctor of Medicine (MD)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="institution">Institution</Label>
                    <Input
                      id="institution"
                      value={newAcademic.institution}
                      onChange={(e) => setNewAcademic({ ...newAcademic, institution: e.target.value })}
                      placeholder="e.g., Harvard Medical School"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year">Year Obtained</Label>
                    <Input
                      id="year"
                      type="number"
                      value={newAcademic.year_obtained}
                      onChange={(e) => setNewAcademic({ ...newAcademic, year_obtained: parseInt(e.target.value) })}
                    />
                  </div>
                  <Button onClick={handleAddAcademic} className="w-full">
                    Add Credential
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {academicRecords.length === 0 ? (
            <div className="text-center py-8">
              <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No academic credentials added yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {academicRecords.map((record) => (
                <div key={record.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
                  <Award className="h-5 w-5 text-primary mt-1" />
                  <div className="flex-1">
                    <h4 className="font-semibold">{record.degree_name}</h4>
                    <p className="text-sm text-muted-foreground">{record.institution}</p>
                    <p className="text-sm text-muted-foreground">Year: {record.year_obtained}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
