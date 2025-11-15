import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DoctorPatientsList } from "./DoctorPatientsList";
import { DoctorProfile } from "./DoctorProfile";

export const DoctorDashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Doctor Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your patients and professional profile
        </p>
      </div>

      <Tabs defaultValue="patients" className="space-y-4">
        <TabsList>
          <TabsTrigger value="patients">My Patients</TabsTrigger>
          <TabsTrigger value="profile">Professional Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="patients" className="space-y-4">
          <DoctorPatientsList />
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <DoctorProfile />
        </TabsContent>
      </Tabs>
    </div>
  );
};
