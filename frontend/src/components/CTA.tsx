import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Mail, Shield, Zap, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { subscriptionService } from "@/services/subscription.service";
import { usePostLogin } from "@/hooks/usePostLogin";
import { toast } from "sonner";

const CTA = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { storeSignupEmail, storeIntendedPlan } = usePostLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isAuthenticated) {
      // User is logged in, redirect to dashboard
      navigate('/dashboard');
    } else {
      // Store email for post-registration and redirect to register
      if (email) {
        storeSignupEmail(email);
      }
      navigate('/register');
    }
  };

  const handleStartPro = async () => {
    if (!isAuthenticated) {
      // Store intention to upgrade and redirect to login
      storeIntendedPlan('PRO', 'monthly');
      navigate('/login');
      return;
    }

    try {
      setIsLoading(true);
      await subscriptionService.startCheckout('monthly');
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Gradient mesh background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/10 to-background" />
      <div className="absolute inset-0 bg-gradient-to-tr from-background via-transparent to-primary/10" />
      
      {/* Animated elements */}
      <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
              Start Detecting{" "}
              <span className="gradient-text">AI Content Today</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join thousands of professionals ensuring content authenticity with the most accurate AI detection technology
            </p>
          </div>

          {/* Email signup form */}
          <div className="max-w-md mx-auto space-y-4">
            {/* Primary CTA Form */}
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
              {!isAuthenticated && (
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 bg-background/80 border-border/50"
                  />
                </div>
              )}
              <Button type="submit" variant="hero" size="lg" className="h-12 px-8" disabled={isLoading}>
                {isAuthenticated ? 'Go to Dashboard' : 'Get Started Free'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </form>
            
            {/* Pro Plan CTA for authenticated users */}
            {isAuthenticated && user?.plan !== 'pro' && user?.plan !== 'premium' && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  Ready for unlimited analyses?
                </p>
                <Button 
                  onClick={handleStartPro} 
                  variant="outline" 
                  size="lg" 
                  disabled={isLoading}
                  className="h-12 px-8"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Starting...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-5 w-5" />
                      Upgrade to Pro - $19/mo
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {!isAuthenticated && (
              <div className="mt-4 flex items-center justify-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Shield className="h-4 w-4" />
                  <span>No credit card required</span>
                </div>
                <span>•</span>
                <div className="flex items-center space-x-1">
                  <Zap className="h-4 w-4" />
                  <span>10 free analyses</span>
                </div>
              </div>
            )}
          </div>

          {/* Feature highlights */}
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Instant Results</h3>
              <p className="text-sm text-muted-foreground">
                Get detection results in under 2 seconds
              </p>
            </div>
            
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-secondary/20 rounded-full flex items-center justify-center mx-auto">
                <Shield className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="font-semibold">95% Accuracy</h3>
              <p className="text-sm text-muted-foreground">
                Industry-leading detection precision
              </p>
            </div>
            
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-success/20 rounded-full flex items-center justify-center mx-auto">
                <Mail className="h-6 w-6 text-success" />
              </div>
              <h3 className="font-semibold">API Ready</h3>
              <p className="text-sm text-muted-foreground">
                Easy integration with comprehensive docs
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;