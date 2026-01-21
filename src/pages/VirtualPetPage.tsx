import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { VirtualPet } from "@/components/VirtualPet";
import { PetAdoption } from "@/components/PetAdoption";
import { usePet } from "@/hooks/usePet";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SectionLoadingState } from "@/components/common";

export default function VirtualPetPage() {
  const { pet, petTypes, loading, adoptPet } = usePet();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      
      <main className="flex-1 pt-24">
        <div className="container mx-auto px-4 py-8">
          <Button 
            onClick={() => navigate(-1)}
            variant="outline"
            size="sm"
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {loading ? (
            <SectionLoadingState message="Loading your pet..." />
          ) : pet ? (
            <VirtualPet />
          ) : (
            <PetAdoption petTypes={petTypes} adoptPet={adoptPet} />
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
