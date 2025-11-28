import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";

const AmbassadorPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <UnifiedHeader />
      <main className="flex-1 pt-24">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <div className="text-center space-y-6 mb-12 animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-black">
              Meet Our <span className="text-primary">Ambassador</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Home of Best Day Ever Coffee and Crepes, Best Church Ever and Joy House
            </p>
          </div>

          <div className="space-y-12">
            <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-black text-center">
                Mr. Jerry Schemmel
              </h2>
              
              <div className="space-y-4 text-lg leading-relaxed">
                <p>
                  <span className="font-semibold">As ambassador for BEST DAY MINISTRIES,</span>{" "}
                  Jerry brings his voice, story and heart to a ministry devoted to empowerment, 
                  inclusion and hope. Jerry spent 18 seasons broadcasting the Denver Nuggets and 14 
                  seasons calling Colorado Rockies games. He is a plane crash survivor, author of 3 
                  books and a record holding endurance cyclist.
                </p>
                
                <p>
                  His life experiences and his passion for our special community aligns powerfully 
                  with the ministry's message that every day can be the{" "}
                  <span className="font-semibold">BEST DAY EVER</span> when grounded in faith and purpose.
                </p>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-8 md:p-12 animate-fade-in">
              <p className="text-lg md:text-xl leading-relaxed text-center max-w-4xl mx-auto">
                Beyond his public profile, Schemmel is also a grandfather to a grandson named Henry, 
                who has Down Syndrome. Henry's presence in his life adds a deeply personal dimension 
                to Jerry's advocacy and understanding of purpose, belonging and the value of each person.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AmbassadorPage;
