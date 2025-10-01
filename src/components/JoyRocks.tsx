import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import joyRocksImage from "@/assets/joy-rocks.jpg";

const JoyRocks = () => {
  return (
    <section id="rocks" className="py-24 bg-accent/5">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-block px-4 py-2 bg-accent/10 rounded-full">
              <span className="text-accent font-semibold">Joy House Rocks</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-foreground">
              Planting Seeds of Love Globally
            </h2>
            
            <div className="space-y-4 text-lg text-muted-foreground">
              <p>
                Inspired by Bill Stewart's love for the Joy House mission, <strong>Joy House Rocks</strong> creates a fun and engaging activity that brings people together to promote positivity and joy.
              </p>
              <p>
                Through rock painting, we provide a creative outlet for all! Once decorated, rocks can be gifted or placed in public areas for others to find. The new owner can keep it as a reminder of kindness, or hide it for someone else to discover.
              </p>
              <p className="font-semibold text-foreground">
                Each rock's journey spreads our mission of empowering adults with special needs—one colorful rock at a time!
              </p>
            </div>

            <Button size="lg" className="shadow-warm">
              Learn More About Joy Rocks
              <ArrowRight className="ml-2" />
            </Button>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-2xl" />
            <img
              src={joyRocksImage}
              alt="Joy House Rocks - Painted rocks with positive messages"
              className="relative rounded-2xl shadow-2xl w-full h-auto object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default JoyRocks;
