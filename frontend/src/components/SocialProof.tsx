import { Star, Quote } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const SocialProof = () => {
  const companies = [
    "TechCorp", "DataFlow", "ContentPro", "EduTech", "MediaSync", "TextLab"
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Content Manager",
      company: "TechCorp",
      image: "/api/placeholder/40/40",
      rating: 5,
      text: "TrueCheckIA has transformed how we verify content authenticity. The accuracy is incredible and the API integration was seamless.",
    },
    {
      name: "Michael Chen",
      role: "Editor-in-Chief",
      company: "MediaSync",
      image: "/api/placeholder/40/40",
      rating: 5,
      text: "As a publisher, content integrity is crucial. TrueCheckIA gives us the confidence we need with fast, reliable AI detection.",
    },
    {
      name: "Dr. Emily Rodriguez",
      role: "Academic Director",
      company: "EduTech",
      image: "/api/placeholder/40/40",
      rating: 5,
      text: "The detailed reports and multi-language support make this perfect for our international educational platform.",
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background to-muted/20" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Company Logos */}
        <div className="text-center mb-16">
          <p className="text-muted-foreground mb-8">Trusted by leading companies worldwide</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-60 hover:opacity-80 transition-opacity duration-300">
            {companies.map((company, index) => (
              <div
                key={company}
                className="text-lg font-semibold tracking-wider"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {company}
              </div>
            ))}
          </div>
        </div>

        {/* Rating Summary */}
        <div className="text-center mb-16">
          <div className="glass rounded-2xl p-8 max-w-md mx-auto">
            <div className="flex justify-center items-center space-x-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 fill-primary text-primary" />
              ))}
            </div>
            <div className="text-2xl font-bold mb-1">4.9/5 rating</div>
            <div className="text-muted-foreground">from 200+ reviews</div>
          </div>
        </div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.name}
              className="glass rounded-xl p-6 space-y-4 elevated hover:scale-105 transition-transform duration-300"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center space-x-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                ))}
              </div>

              <div className="relative">
                <Quote className="absolute -top-2 -left-2 w-8 h-8 text-primary/20" />
                <p className="text-muted-foreground italic pl-6">
                  "{testimonial.text}"
                </p>
              </div>

              <div className="flex items-center space-x-3 pt-4 border-t border-border/50">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={testimonial.image} alt={testimonial.name} />
                  <AvatarFallback>
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold text-sm">{testimonial.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {testimonial.role} at {testimonial.company}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProof;