import { Heart } from "lucide-react";

const Footer = () => {
  const footerLinks = [
    {
      title: "About",
      links: [
        { label: "Our Story", href: "#about" },
        { label: "Meet the Besties", href: "#" },
        { label: "Joy Team", href: "#" },
        { label: "Blog", href: "#" },
      ],
    },
    {
      title: "Get Involved",
      links: [
        { label: "Donate", href: "#donate" },
        { label: "Shop", href: "#" },
        { label: "Events Calendar", href: "#" },
        { label: "Locations", href: "#" },
      ],
    },
    {
      title: "Connect",
      links: [
        { label: "Contact Us", href: "#" },
        { label: "Newsletter", href: "#" },
        { label: "Partners", href: "#" },
        { label: "Best Day Ever Cafe", href: "#" },
      ],
    },
  ];

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-4">
            <div className="text-3xl font-bold">
              <span className="text-foreground">Joy</span>
              <span className="text-primary">House</span>
            </div>
            <p className="text-muted-foreground">
              Spreading joy through the unique gifts and talents of the special needs community.
            </p>
          </div>

          {footerLinks.map((section) => (
            <div key={section.title} className="space-y-4">
              <h3 className="font-semibold text-foreground">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-border text-center text-muted-foreground">
          <p className="flex items-center justify-center gap-2">
            Made with <Heart className="w-4 h-4 text-primary fill-primary" /> by Joy House Community
          </p>
          <p className="mt-2 text-sm">
            © {new Date().getFullYear()} Joy House Community. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
