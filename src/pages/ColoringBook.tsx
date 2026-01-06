import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Palette, Image, BookOpen, Lock, Coins, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ColoringCanvas } from "@/components/coloring-book/ColoringCanvas";
import { ColoringGallery } from "@/components/coloring-book/ColoringGallery";
import { useCoins } from "@/hooks/useCoins";
import { toast } from "sonner";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ColoringBook {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string;
  coin_price: number;
  is_free: boolean;
}

export default function ColoringBook() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, loading } = useAuth();
  const { coins, refetch: refetchCoins } = useCoins();
  const [selectedPage, setSelectedPage] = useState<any>(null);
  const [selectedBook, setSelectedBook] = useState<ColoringBook | null>(null);
  const [activeTab, setActiveTab] = useState("books");
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [bookToPurchase, setBookToPurchase] = useState<ColoringBook | null>(null);

  // Fetch all books with page count
  const { data: coloringBooks, isLoading: booksLoading } = useQuery({
    queryKey: ["coloring-books"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coloring_books")
        .select(`
          *,
          coloring_pages(count)
        `)
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as (ColoringBook & { coloring_pages: { count: number }[] })[];
    },
  });

  // Fetch user's purchased books
  const { data: purchasedBooks } = useQuery({
    queryKey: ["user-coloring-books", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("user_coloring_books")
        .select("book_id")
        .eq("user_id", user.id);
      if (error) throw error;
      return data.map(p => p.book_id);
    },
    enabled: !!user?.id,
  });

  // Fetch pages for selected book
  const { data: bookPages, isLoading: pagesLoading } = useQuery({
    queryKey: ["coloring-pages", selectedBook?.id],
    queryFn: async () => {
      if (!selectedBook?.id) return [];
      const { data, error } = await supabase
        .from("coloring_pages")
        .select("*")
        .eq("book_id", selectedBook.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedBook?.id,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (book: ColoringBook) => {
      if (!user?.id) throw new Error("Must be logged in");
      if ((coins || 0) < book.coin_price) throw new Error("Not enough coins");
      
      // Deduct coins via transaction
      const { error: txError } = await supabase
        .from("coin_transactions")
        .insert({
          user_id: user.id,
          amount: -book.coin_price,
          transaction_type: "purchase",
          description: `Purchased coloring book: ${book.title}`,
        });
      if (txError) throw txError;
      
      // Record purchase
      const { error } = await supabase
        .from("user_coloring_books")
        .insert({
          user_id: user.id,
          book_id: book.id,
          coins_spent: book.coin_price,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-coloring-books"] });
      refetchCoins();
      toast.success("Book purchased! You can now color all the pages.");
      setPurchaseDialogOpen(false);
      if (bookToPurchase) {
        setSelectedBook(bookToPurchase);
      }
    },
    onError: (error) => {
      toast.error((error as Error).message);
    },
  });

  const hasAccessToBook = (book: ColoringBook) => {
    if (book.is_free) return true;
    return purchasedBooks?.includes(book.id) || false;
  };

  const handleBookClick = (book: ColoringBook) => {
    if (hasAccessToBook(book)) {
      setSelectedBook(book);
    } else if (isAuthenticated) {
      setBookToPurchase(book);
      setPurchaseDialogOpen(true);
    } else {
      toast.error("Please sign in to purchase books");
    }
  };

  if (selectedPage) {
    return (
      <ColoringCanvas
        page={selectedPage}
        onBack={() => setSelectedPage(null)}
      />
    );
  }

  // Show pages within a book
  if (selectedBook) {
    return (
      <div className="min-h-screen flex flex-col">
        <UnifiedHeader />
        <main className="flex-1 pt-24 pb-12">
          <div className="container max-w-6xl mx-auto px-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedBook(null)}
              className="mb-6"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Books
            </Button>

            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
                <BookOpen className="w-8 h-8" />
                {selectedBook.title}
              </h1>
              {selectedBook.description && (
                <p className="text-muted-foreground mt-2">{selectedBook.description}</p>
              )}
            </div>

            {pagesLoading ? (
              <div className="text-center py-12">Loading pages...</div>
            ) : !bookPages?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                No pages in this book yet. Check back soon!
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {bookPages.map((page) => (
                  <Card
                    key={page.id}
                    className="cursor-pointer hover:ring-2 hover:ring-primary transition-all overflow-hidden"
                    onClick={() => setSelectedPage(page)}
                  >
                    <CardContent className="p-0">
                      <img
                        src={page.image_url}
                        alt={page.title}
                        className="w-full aspect-square object-cover bg-white"
                      />
                      <div className="p-3">
                        <h3 className="font-medium text-sm truncate">{page.title}</h3>
                        <p className="text-xs text-muted-foreground capitalize">
                          {page.difficulty}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      <main className="flex-1 pt-24 pb-12">
      <div className="container max-w-6xl mx-auto px-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/community")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Community
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
            <Palette className="w-8 h-8" />
            Coloring Book
          </h1>
          <p className="text-muted-foreground mt-2">
            Pick a book and bring the pictures to life with colors!
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
            <TabsTrigger value="books" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Coloring Books
            </TabsTrigger>
            <TabsTrigger value="gallery" className="gap-2" disabled={loading || !isAuthenticated}>
              <Image className="w-4 h-4" />
              My Gallery
            </TabsTrigger>
          </TabsList>

          <TabsContent value="books">
            {booksLoading ? (
              <div className="text-center py-12">Loading books...</div>
            ) : !coloringBooks?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                No coloring books available yet. Check back soon!
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {coloringBooks.map((book) => {
                  const hasAccess = hasAccessToBook(book);
                  return (
                    <Card
                      key={book.id}
                      className="cursor-pointer hover:ring-2 hover:ring-primary transition-all overflow-hidden relative group"
                      onClick={() => handleBookClick(book)}
                    >
                      <CardContent className="p-0">
                        <div className="relative">
                          <img
                            src={book.cover_image_url}
                            alt={book.title}
                            className={`w-full h-auto ${!hasAccess ? 'opacity-70' : ''}`}
                          />
                          {!book.is_free && !hasAccess && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <div className="bg-primary text-primary-foreground px-3 py-2 rounded-full flex items-center gap-2">
                                <Lock className="w-4 h-4" />
                                <Coins className="w-4 h-4" />
                                <span className="font-bold">{book.coin_price}</span>
                              </div>
                            </div>
                          )}
                          {book.is_free && (
                            <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                              FREE
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <h3 className="font-medium text-sm truncate">{book.title}</h3>
                          <p className="text-xs text-muted-foreground">
                            {(book.coloring_pages?.[0]?.count || 0)} {(book.coloring_pages?.[0]?.count || 0) === 1 ? 'page' : 'pages'}
                          </p>
                          {book.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {book.description}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="gallery">
            <ColoringGallery onSelectColoring={setSelectedPage} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Purchase Dialog */}
      <AlertDialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Purchase Coloring Book</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Would you like to purchase "{bookToPurchase?.title}"?</p>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span>Price:</span>
                <span className="flex items-center gap-1 font-bold">
                  <Coins className="w-4 h-4 text-yellow-500" />
                  {bookToPurchase?.coin_price} coins
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span>Your balance:</span>
                <span className="flex items-center gap-1 font-bold">
                  <Coins className="w-4 h-4 text-yellow-500" />
                  {coins} coins
                </span>
              </div>
              {(coins || 0) < (bookToPurchase?.coin_price || 0) && (
                <p className="text-destructive text-sm">
                  You don't have enough coins. Earn more by completing activities!
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bookToPurchase && purchaseMutation.mutate(bookToPurchase)}
              disabled={(coins || 0) < (bookToPurchase?.coin_price || 0) || purchaseMutation.isPending}
            >
              {purchaseMutation.isPending ? "Purchasing..." : "Purchase"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </main>
      <Footer />
    </div>
  );
}