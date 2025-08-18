import { useEffect, useState } from "react";
import { BarChart3, Users, Zap, Clock } from "lucide-react";

const Stats = () => {
  const [counts, setCounts] = useState({
    analyses: 0,
    accuracy: 0,
    users: 0,
    responseTime: 0,
  });

  const finalCounts = {
    analyses: 500000,
    accuracy: 95,
    users: 10000,
    responseTime: 2,
  };

  useEffect(() => {
    const duration = 2000; // 2 seconds
    const steps = 60;
    const stepDuration = duration / steps;

    let step = 0;
    const interval = setInterval(() => {
      step++;
      const progress = step / steps;
      
      setCounts({
        analyses: Math.floor(finalCounts.analyses * progress),
        accuracy: Math.floor(finalCounts.accuracy * progress),
        users: Math.floor(finalCounts.users * progress),
        responseTime: Math.floor(finalCounts.responseTime * progress),
      });

      if (step >= steps) {
        clearInterval(interval);
        setCounts(finalCounts);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, []);

  const stats = [
    {
      icon: BarChart3,
      label: "Texts Analyzed",
      value: `${counts.analyses.toLocaleString()}+`,
      suffix: "",
      gradient: "from-blue-400 to-purple-500",
    },
    {
      icon: Zap,
      label: "Detection Accuracy",
      value: `${counts.accuracy}%`,
      suffix: "",
      gradient: "from-green-400 to-blue-500",
    },
    {
      icon: Users,
      label: "Active Users",
      value: `${counts.users.toLocaleString()}+`,
      suffix: "",
      gradient: "from-purple-400 to-pink-500",
    },
    {
      icon: Clock,
      label: "Average Response",
      value: `${counts.responseTime} sec`,
      suffix: "",
      gradient: "from-orange-400 to-red-500",
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="text-center group"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              <div className="relative mb-4 mx-auto w-16 h-16">
                <div className={`absolute inset-0 bg-gradient-to-r ${stat.gradient} rounded-full opacity-20 group-hover:opacity-30 transition-opacity duration-300`} />
                <div className={`glass rounded-full p-4 group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className={`w-8 h-8 bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`} />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground font-medium">
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;