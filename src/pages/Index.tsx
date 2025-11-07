import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-secondary/30 to-background">
      <div className="container mx-auto px-4 text-center">
        <div className="flex justify-center mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-primary shadow-lg">
            <Activity className="h-12 w-12 text-primary-foreground" />
          </div>
        </div>
        
        <h1 className="mb-4 text-5xl font-bold tracking-tight">
          HealthSync
        </h1>
        <p className="mb-2 text-xl text-muted-foreground max-w-2xl mx-auto">
          Digital Health & Appointment Management System
        </p>
        <p className="mb-8 text-muted-foreground max-w-xl mx-auto">
          Streamline patient records, appointments, and practice management with our secure, easy-to-use platform.
        </p>
        
        <Button size="lg" onClick={() => navigate("/auth")}>
          Get Started
        </Button>
      </div>
    </div>
  );
};

export default Index;
