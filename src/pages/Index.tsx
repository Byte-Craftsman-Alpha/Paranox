import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Activity, CheckCircle, Clock, Shield, Users, Zap, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const features = [
    {
      icon: Users,
      title: "Smart Patient Management",
      description: "Comprehensive patient profiles with instant access to medical history, notes, and contact information."
    },
    {
      icon: Clock,
      title: "Intelligent Scheduling",
      description: "Streamlined appointment system with real-time availability, automated reminders, and conflict prevention."
    },
    {
      icon: Shield,
      title: "Enterprise-Grade Security",
      description: "HIPAA-compliant data protection with role-based access control and encrypted storage."
    },
    {
      icon: Zap,
      title: "Lightning Fast Performance",
      description: "Cloud-powered infrastructure ensuring instant data access and zero downtime for your practice."
    }
  ];

  const comparisons = [
    {
      feature: "Setup Time",
      traditional: "2-4 weeks",
      competitors: "1-2 weeks",
      medicareX: "< 1 hour"
    },
    {
      feature: "Monthly Cost",
      traditional: "$500-2000",
      competitors: "$200-800",
      medicareX: "From $99"
    },
    {
      feature: "Training Required",
      traditional: "Extensive (days)",
      competitors: "Moderate (hours)",
      medicareX: "Minimal (minutes)"
    },
    {
      feature: "Data Security",
      traditional: "On-premise only",
      competitors: "Cloud-based",
      medicareX: "HIPAA-compliant Cloud"
    },
    {
      feature: "Mobile Access",
      traditional: "Limited",
      competitors: "Basic",
      medicareX: "Full-featured"
    },
    {
      feature: "Updates & Support",
      traditional: "Manual, costly",
      competitors: "Periodic",
      medicareX: "Automatic, 24/7"
    }
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/10 via-secondary/30 to-background">
        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="flex flex-col items-center text-center">
            <div className="flex justify-center mb-6">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary shadow-2xl">
                <Activity className="h-14 w-14 text-primary-foreground" />
              </div>
            </div>
            
            <h1 className="mb-6 text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              MedicareX
            </h1>
            <p className="mb-4 text-2xl md:text-3xl font-semibold text-foreground max-w-3xl">
              The Future of Healthcare Management
            </p>
            <p className="mb-8 text-lg text-muted-foreground max-w-2xl">
              Transform your medical practice with an intelligent, secure, and easy-to-use platform that puts patient care first.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="text-lg px-8" onClick={() => navigate("/auth")}>
                Get Started Free
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8">
                Watch Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Powerful Features for Modern Healthcare</h2>
            <p className="text-xl text-muted-foreground">Everything you need to run an efficient medical practice</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="bg-card rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-border">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Choose MedicareX?</h2>
            <p className="text-xl text-muted-foreground">See how we compare to traditional systems and competitors</p>
          </div>

          <div className="max-w-5xl mx-auto overflow-x-auto">
            <div className="bg-card rounded-xl shadow-2xl border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-secondary/50">
                    <th className="px-6 py-4 text-left font-semibold">Feature</th>
                    <th className="px-6 py-4 text-center font-semibold">Traditional Systems</th>
                    <th className="px-6 py-4 text-center font-semibold">Competitors</th>
                    <th className="px-6 py-4 text-center font-semibold bg-primary/10">
                      <span className="text-primary">MedicareX</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((row, index) => (
                    <tr key={index} className="border-t border-border hover:bg-secondary/20 transition-colors">
                      <td className="px-6 py-4 font-medium">{row.feature}</td>
                      <td className="px-6 py-4 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <X className="h-4 w-4 text-destructive" />
                          {row.traditional}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-muted-foreground">
                        {row.competitors}
                      </td>
                      <td className="px-6 py-4 text-center font-semibold bg-primary/5">
                        <div className="flex items-center justify-center gap-2 text-primary">
                          <CheckCircle className="h-5 w-5" />
                          {row.medicareX}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gradient-to-b from-secondary/30 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">Built for Healthcare Professionals</h2>
              <p className="text-xl text-muted-foreground">Join thousands of practices already using MedicareX</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">99.9%</div>
                <div className="text-muted-foreground">Uptime Guarantee</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">5,000+</div>
                <div className="text-muted-foreground">Active Practices</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">24/7</div>
                <div className="text-muted-foreground">Support Available</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">Ready to Transform Your Practice?</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Start your free trial today. No credit card required. Setup in minutes.
            </p>
            <Button size="lg" className="text-lg px-12" onClick={() => navigate("/auth")}>
              Start Free Trial
            </Button>
            <p className="mt-6 text-sm text-muted-foreground">
              Join the modern healthcare revolution. Cancel anytime.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
