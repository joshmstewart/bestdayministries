import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import bdeLogo from "@/assets/bde-logo-no-subtitle.png";

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { label: "About", href: "#about" },
    { label: "Mission", href: "#mission" },
    { label: "Joy House Rocks", href: "#rocks" },
    { label: "Get Involved", href: "#donate" },
  ];

  return (
    <nav className="fixed top-0 w-full bg-card/80 backdrop-blur-xl z-50 border-b border-border/50 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={bdeLogo} 
              alt="Best Day Ever" 
              className="h-20 w-auto"
            />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-foreground hover:text-primary transition-colors font-semibold relative group"
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-warm transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
            <Button size="lg" onClick={() => window.location.href = "/auth"} className="shadow-warm hover:shadow-glow transition-all hover:scale-105 bg-gradient-to-r from-primary via-accent to-secondary border-0">
              Sign In
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-foreground p-2 hover:bg-muted rounded-lg transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 flex flex-col gap-4 animate-fade-in">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-foreground hover:text-primary transition-colors font-semibold py-2 px-4 hover:bg-muted rounded-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <Button size="lg" onClick={() => window.location.href = "/auth"} className="w-full shadow-warm bg-gradient-to-r from-primary via-accent to-secondary border-0">
              Sign In
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
