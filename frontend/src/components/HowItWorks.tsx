import { Upload, Brain, CheckCircle } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      icon: Upload,
      title: "Paste Your Text",
      description: "Simply copy and paste the content you want to analyze into our secure interface",
      number: "01",
    },
    {
      icon: Brain,
      title: "AI Analysis",
      description: "Our advanced algorithms analyze the text using machine learning models trained on billions of samples",
      number: "02",
    },
    {
      icon: CheckCircle,
      title: "Get Results",
      description: "Receive detailed results with confidence scores and probability percentages in seconds",
      number: "03",
    },
  ];

  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
            Three <span className="gradient-text">Simple Steps</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get accurate AI detection results in just a few clicks
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, index) => (
            <div key={step.title} className="relative group">
              {/* Connecting line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-20 left-full w-full h-0.5 bg-gradient-to-r from-primary/50 to-secondary/50 z-0" />
              )}
              
              <div className="relative z-10 text-center space-y-6">
                {/* Step number */}
                <div className="relative mx-auto w-16 h-16">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full opacity-20 animate-pulse" />
                  <div className="flex items-center justify-center w-full h-full bg-background border-2 border-primary rounded-full font-bold text-lg">
                    {step.number}
                  </div>
                </div>

                {/* Icon */}
                <div className="relative mx-auto w-20 h-20">
                  <div className="glass rounded-xl p-4 group-hover:scale-110 transition-transform duration-300">
                    <step.icon className="w-12 h-12 text-primary mx-auto" />
                  </div>
                  {index === 1 && (
                    <div className="absolute inset-0 w-20 h-20 rounded-xl bg-primary/20 animate-pulse-glow" />
                  )}
                </div>

                {/* Content */}
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">{step.title}</h3>
                  <p className="text-muted-foreground max-w-xs mx-auto">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mockup Screenshot */}
        <div className="mt-20 text-center">
          <div className="relative glass rounded-2xl p-8 max-w-4xl mx-auto elevated">
            <div className="bg-background/50 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold">Analysis Results</h4>
                <div className="flex items-center space-x-2 text-sm text-success">
                  <CheckCircle className="w-4 h-4" />
                  <span>Analysis Complete</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center p-4 bg-primary/10 rounded-lg">
                  <div className="text-2xl font-bold text-primary">87%</div>
                  <div className="text-muted-foreground">AI Probability</div>
                </div>
                <div className="text-center p-4 bg-secondary/10 rounded-lg">
                  <div className="text-2xl font-bold text-secondary">1.2s</div>
                  <div className="text-muted-foreground">Processing Time</div>
                </div>
                <div className="text-center p-4 bg-success/10 rounded-lg">
                  <div className="text-2xl font-bold text-success">High</div>
                  <div className="text-muted-foreground">Confidence</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;