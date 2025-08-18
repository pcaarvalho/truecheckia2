import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, Zap, Globe, BarChart3, Code, Layers, Activity } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { subscriptionService } from "@/services/subscription.service";
import { toast } from "sonner";

const Hero = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setShowResult(false);
    setAnalysisProgress(0);

    // Simulate analysis progress
    const interval = setInterval(() => {
      setAnalysisProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsAnalyzing(false);
          setShowResult(true);
          return 100;
        }
        return prev + 20;
      });
    }, 200);
  };

  const trustBadges = [
    { icon: Activity, label: "10,000+ Analyses", value: "10,000+" },
    { icon: Zap, label: "95% Accuracy", value: "95%" },
    { icon: BarChart3, label: "2 Second Results", value: "2 sec" },
    { icon: Code, label: "API Available", value: "API" },
  ];

  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 grid-pattern opacity-20" />
      <div className="absolute top-1/4 -left-32 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />
      
      <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center relative z-10">
        {/* Left Content */}
        <div className="space-y-8 animate-fade-in">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Detect{" "}
              <span className="gradient-text">AI-Generated</span>{" "}
              Content in Seconds
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-xl">
              Advanced AI detection technology with 95% accuracy. Trusted by 10,000+ professionals worldwide.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              variant="hero" 
              size="lg" 
              className="text-lg px-8 group relative overflow-hidden"
              onClick={() => {
                if (isAuthenticated) {
                  navigate('/dashboard');
                } else {
                  navigate('/register?source=hero&message=Start your free AI detection journey');
                }
              }}
            >
              <div className="flex items-center justify-center">
                {isAuthenticated ? (
                  <>
                    <Activity className="w-5 h-5 mr-2" />
                    <span>Access Dashboard</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
                    <span>Start Free - No Card</span>
                  </>
                )}
              </div>
            </Button>
            <Button 
              variant="ghost" 
              size="lg" 
              className="group border-2 border-white/20 hover:border-white/40"
              onClick={() => {
                if (isAuthenticated) {
                  navigate('/analysis');
                } else {
                  // Scroll to pricing section first
                  document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              {isAuthenticated ? (
                <>
                  <span>New Analysis</span>
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </>
              ) : (
                <>
                  <span>See Plans</span>
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-8">
            {trustBadges.map((badge, index) => (
              <div 
                key={badge.label}
                className="glass rounded-lg p-4 text-center hover:scale-105 transition-transform duration-300"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <badge.icon className="h-6 w-6 text-primary mx-auto mb-2" />
                <div className="font-bold text-foreground">{badge.value}</div>
                <div className="text-xs text-muted-foreground">{badge.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Content - Interactive Demo */}
        <div className="relative animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <div className="glass rounded-2xl p-6 space-y-6 elevated">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">AI Content Detector</h3>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                <span className="text-sm text-muted-foreground">Live</span>
              </div>
            </div>

            <Textarea
              placeholder="Paste your text here to check if it's AI-generated..."
              className="min-h-32 bg-background/50 border-border/50 resize-none"
              defaultValue="The advancement of artificial intelligence has revolutionized numerous industries, creating unprecedented opportunities for innovation and efficiency improvements across diverse sectors."
            />

            <Button
              onClick={() => {
                if (isAuthenticated) {
                  navigate('/analysis');
                } else {
                  handleAnalyze();
                }
              }}
              disabled={isAnalyzing}
              className="w-full"
              variant="hero"
            >
              {isAuthenticated ? "Go to Full Analysis" : (isAnalyzing ? "Analyzing..." : "Test Analysis")}
            </Button>

            {/* Analysis Progress */}
            {isAnalyzing && (
              <div className="space-y-2 animate-scale-in">
                <div className="flex justify-between text-sm">
                  <span>Analyzing content...</span>
                  <span>{analysisProgress}%</span>
                </div>
                <Progress value={analysisProgress} className="h-2" />
              </div>
            )}

            {/* Results */}
            {showResult && (
              <div className="space-y-4 animate-scale-in p-4 bg-background/30 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between">
                  <span className="font-medium">AI Probability</span>
                  <span className="text-2xl font-bold text-primary">87%</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Confidence</span>
                    <span className="text-success">High</span>
                  </div>
                  <Progress value={87} className="h-3" />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Processing Time</div>
                    <div className="font-medium">1.2s</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Model Version</div>
                    <div className="font-medium">v2.1</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Floating particles */}
          <div className="absolute -top-4 -right-4 w-8 h-8 bg-primary/20 rounded-full blur-sm animate-float" />
          <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-secondary/20 rounded-full blur-sm animate-float" style={{ animationDelay: "2s" }} />
        </div>
      </div>
    </section>
  );
};

export default Hero;