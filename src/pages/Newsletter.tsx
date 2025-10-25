import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { SEOHead } from "@/components/SEOHead";

const Newsletter = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead 
        title="Subscribe to Our Newsletter"
        description="Stay connected with Best Day Ministries. Get monthly updates, inspiring stories, and event invitations delivered to your inbox."
      />
      <UnifiedHeader />
      
      <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
        <NewsletterSignup redirectOnSuccess={true} />
      </main>

      <Footer />
    </div>
  );
};

export default Newsletter;