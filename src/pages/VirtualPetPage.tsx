import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { VirtualPet } from "@/components/VirtualPet";
import { PetAdoption } from "@/components/PetAdoption";
import { usePet } from "@/hooks/usePet";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function VirtualPetPage() {
  const { pet, loading } = usePet();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      
      <main className="flex-1 pt-24">
        <div className="container mx-auto px-4 py-8">
          <Button 
            onClick={() => navigate("/community")}
            variant="outline"
            size="sm"
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Community
          </Button>

          {loading ? (
            <div className="max-w-md mx-auto space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : pet ? (
            <VirtualPet />
          ) : (
            <PetAdoption />
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
