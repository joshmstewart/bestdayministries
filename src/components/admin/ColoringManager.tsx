import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Palette } from "lucide-react";
import { ColoringBooksManager } from "./ColoringBooksManager";
import { ColoringPagesManager } from "./ColoringPagesManager";

export function ColoringManager() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="books" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="books" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Books
          </TabsTrigger>
          <TabsTrigger value="pages" className="gap-2">
            <Palette className="w-4 h-4" />
            Pages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="books" className="mt-4">
          <ColoringBooksManager />
        </TabsContent>

        <TabsContent value="pages" className="mt-4">
          <ColoringPagesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
