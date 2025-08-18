import { Zap, BarChart3, Globe, Code, Layers, TrendingUp } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Zap,
      title: "Real-time Analysis",
      description: "Process text instantly with our lightning-fast AI detection engine",
      gradient: "from-yellow-400 to-orange-500",
    },
    {
      icon: BarChart3,
      title: "Detailed Reports",
      description: "Comprehensive breakdown with confidence scores and analysis metrics",
      gradient: "from-purple-400 to-pink-500",
    },
    {
      icon: Globe,
      title: "Multi-language",
      description: "Support for 15+ languages with native detection accuracy",
      gradient: "from-green-400 to-blue-500",
    },
    {
      icon: Code,
      title: "API Access",
      description: "Integrate anywhere with our developer-friendly REST API",
      gradient: "from-blue-400 to-purple-500",
    },
    {
      icon: Layers,
      title: "Bulk Processing",
      description: "Analyze multiple texts simultaneously for efficient workflows",
      gradient: "from-red-400 to-pink-500",
    },
    {
      icon: TrendingUp,
      title: "History & Analytics",
      description: "Track all analyses with detailed usage statistics and trends",
      gradient: "from-indigo-400 to-purple-500",
    },
  ];

  return (
    <section id="features" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-10" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
            Powerful{" "}
            <span className="gradient-text">Detection Technology</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to identify AI content with precision and confidence
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group glass rounded-xl p-6 hover:scale-105 transition-all duration-300 elevated"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="relative mb-4">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${feature.gradient} p-3 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <div className={`absolute inset-0 w-12 h-12 rounded-lg bg-gradient-to-r ${feature.gradient} opacity-20 blur-lg group-hover:opacity-40 transition-opacity duration-300`} />
              </div>
              
              <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors duration-300">
                {feature.title}
              </h3>
              <p className="text-muted-foreground group-hover:text-muted-foreground/80 transition-colors duration-300">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;