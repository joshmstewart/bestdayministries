import { UnifiedHeader } from "@/components/UnifiedHeader";
import { StickerAlbum } from "@/components/StickerAlbum";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const StickerAlbumPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <UnifiedHeader />
      <main className="pt-24">
        <div className="container mx-auto px-4 py-8">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/community')}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Community
          </Button>
          <StickerAlbum />
        </div>
      </main>
    </div>
  );
};

export default StickerAlbumPage;
