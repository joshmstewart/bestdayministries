import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, Image, BookOpen, Users, Eye, ArrowLeft } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ColoringCanvas } from "@/components/coloring-book/ColoringCanvas";
import { ColoringGallery } from "@/components/coloring-book/ColoringGallery";
import { ColoringCommunityGallery } from "@/components/coloring-book/ColoringCommunityGallery";
import { useCoins } from "@/hooks/useCoins";
import { toast } from "sonner";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { PriceRibbon } from "@/components/ui/price-ribbon";
import { CoinIcon } from "@/components/CoinIcon";
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
import { supabase } from "@/integrations/supabase/client";

interface ColoringBook {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string;
  coin_price: number;
  is_free: boolean;
}

export default function ColoringBook() {
  const queryClient = useQueryClient();
  const { user, isAuthenticated, loading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { coins, refetch: refetchCoins } = useCoins();
  const [selectedPage, setSelectedPage] = useState<any>(null);
  const [selectedBook, setSelectedBook] = useState<ColoringBook | null>(null);

  const urlTab = searchParams.get("tab");
  const initialTab =
    urlTab === "books" || urlTab === "community" || urlTab === "gallery" ? urlTab : "books";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [bookToPurchase, setBookToPurchase] = useState<ColoringBook | null>(null);
  const [previewBook, setPreviewBook] = useState<ColoringBook | null>(null);

  // Single effect to handle tab <-> URL sync (avoids race condition between two effects)
  useEffect(() => {
    const urlTabValue = searchParams.get("tab");
    const normalizedUrlTab = urlTabValue === "books" || urlTabValue === "community" || urlTabValue === "gallery" 
      ? urlTabValue 
      : "books";
    
    // Only sync URL -> state if the URL was changed externally (back/forward navigation)
    // We detect this by checking if the URL tab doesn't match activeTab
    if (normalizedUrlTab !== activeTab) {
      // URL changed externally, sync state to URL
      setActiveTab(normalizedUrlTab);
    }
  }, [searchParams]); // Only depend on searchParams, not activeTab

  // Separate effect to update URL when tab changes via UI click
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    const next = new URLSearchParams(searchParams);
    if (newTab === "books") {
      next.delete("tab");
    } else {
      next.set("tab", newTab);
    }
    setSearchParams(next, { replace: true });
  };

  // Fetch pages for preview
  const { data: previewPages, isLoading: previewLoading } = useQuery({
    queryKey: ["coloring-pages-preview", previewBook?.id],
    queryFn: async () => {
      if (!previewBook?.id) return [];
      const { data, error } = await supabase
        .from("coloring_pages")
        .select("id, title, image_url")
        .eq("book_id", previewBook.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!previewBook?.id,
  });

  // Fetch all books with page count - cached for 30 seconds to prevent tab flickering
  const { data: coloringBooks, isLoading: booksLoading } = useQuery({
    queryKey: ["coloring-books"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coloring_books")
        .select(`
          id, title, description, cover_image_url, coin_price, is_free, display_order,
          coloring_pages(count)
        `)
        .eq("is_active", true)
        .order("is_free", { ascending: false })
        .order("coin_price", { ascending: true })
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as (ColoringBook & { coloring_pages: { count: number }[] })[];
    },
    staleTime: 30000, // Cache for 30 seconds to prevent refetch on tab switch
  });

  // Fetch user's purchased books - cached for 30 seconds
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
    staleTime: 30000,
  });

  // Fetch pages for selected book - exclude heavy fields, cached
  const { data: bookPages, isLoading: pagesLoading } = useQuery({
    queryKey: ["coloring-pages", selectedBook?.id],
    queryFn: async () => {
      if (!selectedBook?.id) return [];
      const { data, error } = await supabase
        .from("coloring_pages")
        .select("id, title, image_url, book_id, display_order, difficulty, description")
        .eq("book_id", selectedBook.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedBook?.id,
    staleTime: 30000,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (book: ColoringBook) => {
      if (!user?.id) throw new Error("Must be logged in");
      if ((coins || 0) < book.coin_price) throw new Error("Not enough coins");
      
      // Get current coins and deduct
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("coins")
        .eq("id", user.id)
        .single();
      
      if (profileError) throw profileError;
      
      const newBalance = (profile.coins || 0) - book.coin_price;
      
      // Update coins
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ coins: newBalance })
        .eq("id", user.id);
      
      if (updateError) throw updateError;
      
      // Record transaction
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


  const renderBookPages = () => (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedBook(null);
              setSelectedPage(null);
            }}
            className="px-2"
          >
            Books
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium text-foreground">{selectedBook?.title}</span>
        </div>
        {selectedBook?.description && (
          <p className="text-sm text-muted-foreground mt-2">{selectedBook.description}</p>
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );

  const renderCanvas = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedBook(null);
            setSelectedPage(null);
          }}
          className="px-2"
        >
          Books
        </Button>
        <span className="text-muted-foreground">/</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedPage(null)}
          className="px-2"
          disabled={!selectedBook}
          title={selectedBook ? "Back to pages" : undefined}
        >
          {selectedBook?.title || "Pages"}
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium text-foreground">{selectedPage?.title}</span>
      </div>

      <ColoringCanvas page={selectedPage} onClose={() => setSelectedPage(null)} />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      <main className="flex-1 pt-24 pb-12">
        <div className="container max-w-6xl mx-auto px-4">
          <BackButton />
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
            <Palette className="w-8 h-8" />
            Coloring Book
          </h1>
          <p className="text-muted-foreground mt-2">
            Pick a book and bring the pictures to life with colors!
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full max-w-lg mx-auto grid-cols-3 mb-6">
            <TabsTrigger value="books" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Books
            </TabsTrigger>
            <TabsTrigger value="community" className="gap-2" disabled={loading || !isAuthenticated}>
              <Users className="w-4 h-4" />
              Community
            </TabsTrigger>
            <TabsTrigger value="gallery" className="gap-2" disabled={loading || !isAuthenticated}>
              <Image className="w-4 h-4" />
              My Gallery
            </TabsTrigger>
          </TabsList>

          <TabsContent value="books">
            {selectedPage ? (
              renderCanvas()
            ) : selectedBook ? (
              renderBookPages()
            ) : booksLoading ? (
              <div className="text-center py-12">Loading books...</div>
            ) : !coloringBooks?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                No coloring books available yet. Check back soon!
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...coloringBooks]
                  .sort((a, b) => {
                    // Available items first (free or purchased), then purchasable
                    const aHasAccess = hasAccessToBook(a);
                    const bHasAccess = hasAccessToBook(b);
                    if (aHasAccess && !bHasAccess) return -1;
                    if (!aHasAccess && bHasAccess) return 1;
                    return 0; // Keep original display_order within groups
                  })
                  .map((book) => {
                  const hasAccess = hasAccessToBook(book);
                  return (
                    <Card
                      key={book.id}
                      className="cursor-pointer hover:ring-2 hover:ring-primary transition-all overflow-hidden relative group"
                      onClick={() => handleBookClick(book)}
                    >
                      <CardContent className="p-0">
                        <div className="relative overflow-hidden">
                          <img
                            src={book.cover_image_url}
                            alt={book.title}
                            className={`w-full h-auto ${!hasAccess ? "opacity-80 grayscale-[30%]" : ""}`}
                          />
                          {book.is_free ? (
                            <PriceRibbon isFree size="md" />
                          ) : !hasAccess && (
                            <PriceRibbon price={book.coin_price} size="md" />
                          )}
                          {/* Preview button for non-owned books */}
                          {!hasAccess && (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewBook(book);
                              }}
                            >
                              <Eye className="w-3 h-3" />
                              Preview
                            </Button>
                          )}
                        </div>
                        <div className="p-3">
                          <h3 className="font-medium text-sm truncate">{book.title}</h3>
                          <p className="text-xs text-muted-foreground">
                            {(book.coloring_pages?.[0]?.count || 0)}{" "}
                            {(book.coloring_pages?.[0]?.count || 0) === 1 ? "page" : "pages"}
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

          <TabsContent value="community">
            {user && (
              <ColoringCommunityGallery
                userId={user.id}
                onSelectColoring={(page) => {
                  setSelectedPage(page);
                  setActiveTab("books");
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="gallery">
            <ColoringGallery onSelectColoring={(page, _, book) => {
              setSelectedPage(page);
              if (book) {
                setSelectedBook(book);
              }
              setActiveTab("books"); // Switch to books tab to show the canvas
            }} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewBook} onOpenChange={(open) => !open && setPreviewBook(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Preview: {previewBook?.title}
            </DialogTitle>
            <DialogDescription>
              {previewBook?.description || "See what's inside this coloring book before you buy!"}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh]">
            {previewLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading preview...</div>
            ) : !previewPages?.length ? (
              <div className="text-center py-8 text-muted-foreground">No pages to preview yet.</div>
            ) : (
              <div className="grid grid-cols-3 gap-3 p-1">
                {previewPages.map((page) => (
                  <div key={page.id} className="space-y-1">
                    <div className="rounded-lg overflow-hidden border bg-white p-1">
                      <img
                        src={page.image_url}
                        alt={page.title}
                        className="w-full h-auto object-contain"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center truncate">{page.title}</p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2 text-sm">
              <span>Price:</span>
              <span className="flex items-center gap-1 font-bold text-primary">
                <CoinIcon size={14} />
                {previewBook?.coin_price}
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPreviewBook(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  if (previewBook) {
                    setPreviewBook(null);
                    setBookToPurchase(previewBook);
                    setPurchaseDialogOpen(true);
                  }
                }}
                disabled={!isAuthenticated}
              >
                Purchase Book
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                  <CoinIcon size={16} />
                  {bookToPurchase?.coin_price} coins
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span>Your balance:</span>
                <span className="flex items-center gap-1 font-bold">
                  <CoinIcon size={16} />
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