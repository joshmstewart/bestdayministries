import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft, Store, DollarSign, Truck, CreditCard, Clock, ShieldCheck,
  HelpCircle, Package, Bell, BarChart3, Users, Palette, Image, Edit,
  CheckCircle, AlertTriangle, MapPin, Weight, RefreshCw, Mail,
  ChevronRight, Menu, X, BookOpen, ExternalLink
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { cn } from "@/lib/utils";

interface TOCItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  children?: { id: string; label: string }[];
}

const tocItems: TOCItem[] = [
  { id: "overview", label: "Overview", icon: <Store className="h-4 w-4" /> },
  { id: "getting-started", label: "Getting Started", icon: <CheckCircle className="h-4 w-4" />, children: [
    { id: "applying", label: "Applying" },
    { id: "approval-process", label: "Approval Process" },
    { id: "stripe-onboarding", label: "Stripe Connect Setup" },
    { id: "startup-guide", label: "Startup Guide Checklist" },
  ]},
  { id: "dashboard", label: "Your Dashboard", icon: <BarChart3 className="h-4 w-4" />, children: [
    { id: "dashboard-tabs", label: "Dashboard Tabs" },
    { id: "homepage-setting", label: "Set as Homepage" },
    { id: "multiple-vendors", label: "Multiple Vendor Accounts" },
  ]},
  { id: "products", label: "Managing Products", icon: <Package className="h-4 w-4" />, children: [
    { id: "adding-products", label: "Adding Products" },
    { id: "product-images", label: "Photos & Images" },
    { id: "product-variants", label: "Variants (Size, Color)" },
    { id: "product-weight", label: "Weight & Dimensions" },
    { id: "inventory", label: "Inventory Management" },
    { id: "product-visibility", label: "Active / Inactive" },
  ]},
  { id: "orders", label: "Orders & Fulfillment", icon: <Truck className="h-4 w-4" />, children: [
    { id: "order-notifications", label: "Order Notifications" },
    { id: "viewing-orders", label: "Viewing Orders" },
    { id: "fulfilling-orders", label: "Fulfilling & Shipping" },
    { id: "tracking-numbers", label: "Tracking Numbers" },
    { id: "order-statuses", label: "Order Statuses" },
  ]},
  { id: "shipping", label: "Shipping Setup", icon: <MapPin className="h-4 w-4" />, children: [
    { id: "shipping-modes", label: "Flat Rate vs Calculated" },
    { id: "origin-address", label: "Origin Address" },
    { id: "free-shipping", label: "Free Shipping Threshold" },
    { id: "shipping-reimbursement", label: "Shipping Reimbursement" },
  ]},
  { id: "payments", label: "Payments & Earnings", icon: <DollarSign className="h-4 w-4" />, children: [
    { id: "commission", label: "Commission Structure" },
    { id: "payouts", label: "Payout Schedule" },
    { id: "payout-triggers", label: "When Payouts Happen" },
    { id: "earnings-dashboard", label: "Earnings Dashboard" },
    { id: "payout-emails", label: "Payout Email Notifications" },
  ]},
  { id: "store-profile", label: "Store Profile & Branding", icon: <Palette className="h-4 w-4" />, children: [
    { id: "business-info", label: "Business Info" },
    { id: "logo-banner", label: "Logo & Banner" },
    { id: "theme-color", label: "Theme Color" },
    { id: "vendor-story", label: "Vendor Story & Media" },
    { id: "social-links", label: "Social Links" },
    { id: "public-profile", label: "Your Public Vendor Page" },
  ]},
  { id: "bestie-program", label: "Bestie Program", icon: <Users className="h-4 w-4" />, children: [
    { id: "linking-besties", label: "Linking to a Bestie" },
    { id: "bestie-assets", label: "Using Bestie Content" },
    { id: "guardian-approval", label: "Guardian Approval" },
  ]},
  { id: "team", label: "Team Members", icon: <Users className="h-4 w-4" /> },
  { id: "emails", label: "Email Notifications", icon: <Mail className="h-4 w-4" />, children: [
    { id: "email-approval", label: "Approval / Rejection" },
    { id: "email-orders", label: "New Order Alerts" },
    { id: "email-shipped", label: "Shipped Confirmation" },
    { id: "email-payout", label: "Payout Completed" },
  ]},
  { id: "policies", label: "Policies & Responsibilities", icon: <ShieldCheck className="h-4 w-4" />, children: [
    { id: "vendor-responsibilities", label: "Your Responsibilities" },
    { id: "prohibited-items", label: "Prohibited Items" },
    { id: "suspension", label: "Account Suspension" },
  ]},
  { id: "faq", label: "Frequently Asked Questions", icon: <HelpCircle className="h-4 w-4" /> },
];

const VendorGuide = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState("overview");
  const [tocOpen, setTocOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll to section from URL hash
  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (hash) {
      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          setActiveSection(hash);
        }
      }, 100);
    }
  }, [location.hash]);

  // Track active section on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 }
    );
    const sections = document.querySelectorAll("[data-section]");
    sections.forEach(s => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(id);
      setTocOpen(false);
    }
  };

  const isActive = (id: string) => activeSection === id;
  const isParentActive = (item: TOCItem) =>
    isActive(item.id) || item.children?.some(c => isActive(c.id));

  return (
    <>
      <SEOHead
        title="Vendor Guide | Joy House Online Store"
        description="Complete guide for vendors on the Joy House Online Store. Everything you need to know about selling, shipping, payouts, and managing your store."
      />
      <div className="min-h-screen flex flex-col">
        <UnifiedHeader />
        <main className="flex-1 bg-background pt-24 pb-16">
          <div className="container max-w-7xl mx-auto px-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setTocOpen(!tocOpen)}
              >
                {tocOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                <span className="ml-1">Sections</span>
              </Button>
            </div>

            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">Vendor Guide</h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Everything you need to know about selling on the Joy House Online Store
              </p>
            </div>

            <div className="flex gap-8 relative">
              {/* Sidebar TOC - Desktop */}
              <aside className="hidden lg:block w-64 shrink-0">
                <div className="sticky top-28">
                  <ScrollArea className="h-[calc(100vh-160px)]">
                    <nav className="space-y-1 pr-4">
                      {tocItems.map(item => (
                        <div key={item.id}>
                          <button
                            onClick={() => scrollTo(item.id)}
                            className={cn(
                              "flex items-center gap-2 w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                              isParentActive(item)
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                          >
                            {item.icon}
                            {item.label}
                          </button>
                          {item.children && isParentActive(item) && (
                            <div className="ml-6 mt-1 space-y-0.5 border-l-2 border-primary/20 pl-3">
                              {item.children.map(child => (
                                <button
                                  key={child.id}
                                  onClick={() => scrollTo(child.id)}
                                  className={cn(
                                    "block w-full text-left px-2 py-1 rounded text-xs transition-colors",
                                    isActive(child.id)
                                      ? "text-primary font-medium"
                                      : "text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  {child.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </nav>
                  </ScrollArea>
                </div>
              </aside>

              {/* Mobile TOC Overlay */}
              {tocOpen && (
                <div className="fixed inset-0 z-50 bg-background/95 lg:hidden pt-24 px-4 overflow-auto">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="font-semibold text-lg">Sections</h2>
                    <Button variant="ghost" size="icon" onClick={() => setTocOpen(false)}>
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  <nav className="space-y-1 pb-8">
                    {tocItems.map(item => (
                      <div key={item.id}>
                        <button
                          onClick={() => scrollTo(item.id)}
                          className="flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-md text-sm hover:bg-muted/50"
                        >
                          {item.icon}
                          {item.label}
                          <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground" />
                        </button>
                        {item.children && (
                          <div className="ml-8 space-y-0.5">
                            {item.children.map(child => (
                              <button
                                key={child.id}
                                onClick={() => scrollTo(child.id)}
                                className="block w-full text-left px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                              >
                                {child.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </nav>
                </div>
              )}

              {/* Main Content */}
              <div ref={contentRef} className="flex-1 min-w-0 space-y-12">

                {/* OVERVIEW */}
                <section id="overview" data-section className="scroll-mt-28">
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Store className="h-6 w-6 text-primary" /> Overview
                      </h2>
                      <p className="text-muted-foreground">
                        The Joy House Online Store is a community-first marketplace — like Etsy, but built for businesses owned by or supporting people with disabilities. As a vendor, you list your products, fulfill orders yourself (dropship model), and receive payouts directly to your bank account via Stripe.
                      </p>
                      <p className="text-muted-foreground">
                        You never need to send inventory to us. You manage everything from your own location and ship directly to customers when orders come in.
                      </p>
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                        <p className="text-sm font-medium text-primary">Quick Summary</p>
                        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                          <li>• <strong>You keep 80%</strong> of every sale (20% platform commission)</li>
                          <li>• <strong>Shipping fees are reimbursed</strong> to you in full</li>
                          <li>• <strong>Payouts</strong> happen automatically after you ship & provide tracking</li>
                          <li>• <strong>You get email notifications</strong> for new orders, payouts, and more</li>
                          <li>• <strong>You choose your shipping method</strong> — flat rate or real-time carrier rates</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </section>

                {/* GETTING STARTED */}
                <section id="getting-started" data-section className="scroll-mt-28 space-y-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <CheckCircle className="h-6 w-6 text-primary" /> Getting Started
                  </h2>

                  <Card id="applying" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Applying to Become a Vendor</h3>
                      <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                        <li>Go to the <strong>Vendor Application</strong> page (<code>/vendor-auth</code>)</li>
                        <li>If you're a new user, create an account and fill out the application at the same time</li>
                        <li>If you already have an account, log in first, then visit the application page or click <strong>"Become a Vendor"</strong> from the Marketplace</li>
                        <li>Provide your <strong>business name</strong>, <strong>description</strong>, and optional <strong>application notes</strong></li>
                        <li>Agree to the vendor terms and submit</li>
                      </ol>
                      <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                        <strong>Note:</strong> Vendor is a <em>status</em>, not a separate role. You keep your existing account role (supporter, bestie, caregiver) and gain vendor capabilities on top.
                      </p>
                    </CardContent>
                  </Card>

                  <Card id="approval-process" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Approval Process</h3>
                      <p className="text-muted-foreground">After submitting your application:</p>
                      <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                        <li>Your application status is set to <strong>Pending</strong></li>
                        <li>Our admin team reviews your application (typically <strong>1–3 business days</strong>)</li>
                        <li>You'll receive an <strong>email notification</strong> when your application is approved or rejected</li>
                        <li>While pending, you can visit your Vendor Dashboard but you won't be able to add products yet</li>
                      </ul>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="inline-flex items-center gap-1 text-xs bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 rounded-full px-3 py-1"><Clock className="h-3 w-3" /> Pending</span>
                        <span className="inline-flex items-center gap-1 text-xs bg-green-500/10 text-green-600 border border-green-500/20 rounded-full px-3 py-1"><CheckCircle className="h-3 w-3" /> Approved</span>
                        <span className="inline-flex items-center gap-1 text-xs bg-red-500/10 text-red-600 border border-red-500/20 rounded-full px-3 py-1"><X className="h-3 w-3" /> Rejected</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card id="stripe-onboarding" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Stripe Connect Setup</h3>
                      <p className="text-muted-foreground">
                        To receive payouts, you must connect a Stripe account. This is done through <strong>Stripe Connect Express</strong>:
                      </p>
                      <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                        <li>From your Vendor Dashboard, click <strong>"Set Up Payments"</strong> or go to the <strong>Payments</strong> tab</li>
                        <li>You'll be redirected to Stripe's onboarding flow</li>
                        <li>Provide your business details, bank account, and identity verification</li>
                        <li>Once complete, your dashboard will show <strong>"Payments Connected"</strong></li>
                      </ol>
                      <p className="text-sm text-muted-foreground">
                        <strong>⚠️ Important:</strong> You cannot receive payouts until Stripe onboarding is complete. Orders will still come in, but payouts will be held until your Stripe account is active.
                      </p>
                    </CardContent>
                  </Card>

                  <Card id="startup-guide" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Startup Guide Checklist</h3>
                      <p className="text-muted-foreground">
                        When you first access your dashboard, you'll see an interactive <strong>Startup Guide</strong> at the top. It tracks your progress on required setup steps:
                      </p>
                      <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                        <li>✅ Set up your <strong>store profile</strong> (business name, description)</li>
                        <li>✅ Add your first <strong>product</strong></li>
                        <li>✅ Configure <strong>shipping</strong> settings</li>
                        <li>✅ Connect <strong>Stripe</strong> for payments</li>
                        <li>✅ Upload a <strong>logo</strong></li>
                      </ul>
                      <p className="text-sm text-muted-foreground">
                        Some steps are auto-detected (e.g., Stripe connection). You can dismiss the guide once all required steps are complete.
                      </p>
                    </CardContent>
                  </Card>
                </section>

                {/* DASHBOARD */}
                <section id="dashboard" data-section className="scroll-mt-28 space-y-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <BarChart3 className="h-6 w-6 text-primary" /> Your Dashboard
                  </h2>

                  <Card id="dashboard-tabs" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Dashboard Tabs</h3>
                      <p className="text-muted-foreground">Your vendor dashboard is organized into tabs:</p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {[
                          { name: "Products", desc: "Add, edit, and manage your product listings" },
                          { name: "Orders", desc: "View incoming orders, fulfill them, and add tracking" },
                          { name: "Earnings", desc: "See your sales totals, commission breakdown, and payout history" },
                          { name: "Payments", desc: "Manage your Stripe Connect account and payout status" },
                          { name: "Shipping", desc: "Configure shipping mode, origin address, and free shipping rules" },
                          { name: "Settings", desc: "Update your store profile, logo, banner, theme, and social links" },
                        ].map(tab => (
                          <div key={tab.name} className="bg-muted/50 rounded-lg p-3">
                            <p className="font-medium text-sm">{tab.name}</p>
                            <p className="text-xs text-muted-foreground">{tab.desc}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        You'll also see <strong>Cart Insights</strong> showing how many customers currently have your items in their shopping carts.
                      </p>
                    </CardContent>
                  </Card>

                  <Card id="homepage-setting" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Set as Your Homepage</h3>
                      <p className="text-muted-foreground">
                        If you primarily use the platform as a vendor, you can set the Vendor Dashboard as your <strong>default landing page</strong> when you log in. Look for the <strong>"Make Homepage"</strong> button at the top of your dashboard. Click <strong>"Reset Homepage"</strong> to go back to the default community page.
                      </p>
                    </CardContent>
                  </Card>

                  <Card id="multiple-vendors" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Multiple Vendor Accounts</h3>
                      <p className="text-muted-foreground">
                        You can operate <strong>multiple vendor stores</strong> under one user account. Use the <strong>"Add Another Vendor"</strong> button and switch between them using the vendor selector dropdown at the top of your dashboard. Each vendor has its own products, orders, earnings, and settings.
                      </p>
                    </CardContent>
                  </Card>
                </section>

                {/* PRODUCTS */}
                <section id="products" data-section className="scroll-mt-28 space-y-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Package className="h-6 w-6 text-primary" /> Managing Products
                  </h2>

                  <Card id="adding-products" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Adding Products</h3>
                      <p className="text-muted-foreground">From the <strong>Products</strong> tab, click <strong>"Add Product"</strong> and fill in:</p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li><strong>Name</strong> — The product title customers will see</li>
                        <li><strong>Description</strong> — A detailed description of what you're selling</li>
                        <li><strong>Price</strong> — Your selling price (the platform adds commission on top)</li>
                        <li><strong>Inventory Count</strong> — How many you have in stock (set to 0 to show "Out of Stock")</li>
                        <li><strong>Category</strong> — Help customers find your products</li>
                        <li><strong>Images</strong> — Upload product photos (first image is the main/default)</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card id="product-images" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Photos & Images</h3>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>Upload multiple images per product</li>
                        <li>The <strong>first image</strong> (or the one you set as default) shows as the product thumbnail</li>
                        <li>Images are automatically compressed for fast loading</li>
                        <li>Use well-lit, clear photos on a simple background for best results</li>
                        <li>Recommended: at least 2–3 photos showing different angles</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card id="product-variants" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Variants (Size, Color)</h3>
                      <p className="text-muted-foreground">
                        If your products come in different sizes or colors, you can add <strong>variants</strong>. Each variant can have its own price and inventory count. Customers will see dropdown selectors on the product page.
                      </p>
                    </CardContent>
                  </Card>

                  <Card id="product-weight" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Weight & Dimensions</h3>
                      <p className="text-muted-foreground">
                        If you use <strong>Calculated Shipping</strong> (real-time carrier rates), adding product weight improves rate accuracy. If no weight is set, the system defaults to <strong>1 lb</strong> per item for rate calculation.
                      </p>
                      <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                        <strong>Tip:</strong> Even a rough weight estimate is better than the default. Weigh your packaged product (including packaging materials) for the most accurate shipping quotes.
                      </p>
                    </CardContent>
                  </Card>

                  <Card id="inventory" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Inventory Management</h3>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>Set your available quantity for each product</li>
                        <li>Inventory is <strong>not automatically decremented</strong> when orders are placed — you manage it manually</li>
                        <li>Set inventory to <strong>0</strong> to show "Out of Stock" on the storefront</li>
                        <li>You can also mark a product as <strong>Inactive</strong> to hide it completely</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card id="product-visibility" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Active / Inactive</h3>
                      <p className="text-muted-foreground">
                        Toggle a product's <strong>Active</strong> status to control whether it appears on the storefront. Inactive products are hidden from customers but preserved in your dashboard. This is useful for seasonal items or products you're temporarily out of stock on.
                      </p>
                    </CardContent>
                  </Card>
                </section>

                {/* ORDERS */}
                <section id="orders" data-section className="scroll-mt-28 space-y-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Truck className="h-6 w-6 text-primary" /> Orders & Fulfillment
                  </h2>

                  <Card id="order-notifications" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Order Notifications</h3>
                      <p className="text-muted-foreground">
                        When a customer places an order containing your products, you'll receive:
                      </p>
                      <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                        <li><strong>📧 Email notification</strong> — Sent to the email on your vendor profile with order details, items ordered, quantities, customer shipping address, and the amount you'll be paid</li>
                        <li><strong>🔔 In-app notification</strong> — A notification in your notification bell</li>
                      </ul>
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
                        <strong>What's in the order email:</strong>
                        <ul className="mt-1 space-y-1 text-muted-foreground">
                          <li>• Order number and date</li>
                          <li>• Each item name, quantity, and your payout amount</li>
                          <li>• Customer's full shipping address</li>
                          <li>• Total vendor payout amount</li>
                          <li>• Link to your dashboard to manage the order</li>
                        </ul>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        <strong>Team members</strong> with access to your vendor account will also receive order notification emails.
                      </p>
                    </CardContent>
                  </Card>

                  <Card id="viewing-orders" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Viewing Orders</h3>
                      <p className="text-muted-foreground">
                        The <strong>Orders</strong> tab shows all orders containing your products. By default, it filters to <strong>Active</strong> orders (hiding cancelled). You can filter by status: All, Pending, Processing, Shipped, Completed, or Cancelled.
                      </p>
                      <p className="text-muted-foreground">
                        Click any order to see full details including customer info, items, shipping address, and payout status.
                      </p>
                    </CardContent>
                  </Card>

                  <Card id="fulfilling-orders" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Fulfilling & Shipping</h3>
                      <p className="text-muted-foreground">
                        <strong>You are responsible for fulfilling and shipping all orders.</strong> Here's the process:
                      </p>
                      <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                        <li>Receive order notification (email + in-app)</li>
                        <li>Go to your <strong>Orders</strong> tab and click the order</li>
                        <li>Review the customer's shipping address and items ordered</li>
                        <li>Pack the order and ship it using your own shipping account/labels</li>
                        <li>Enter the <strong>tracking number</strong> and <strong>carrier</strong> in the order details</li>
                        <li>Click <strong>"Submit Tracking"</strong> — this triggers your payout and notifies the customer</li>
                      </ol>
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-sm">
                        <strong>⚠️ Important:</strong> Payouts are only initiated <strong>after you submit a tracking number</strong>. Without tracking, no payout will be processed.
                      </div>
                    </CardContent>
                  </Card>

                  <Card id="tracking-numbers" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Tracking Numbers</h3>
                      <p className="text-muted-foreground">
                        When you enter a tracking number:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>Select the <strong>carrier</strong> (USPS, UPS, FedEx, or other)</li>
                        <li>Enter the tracking number</li>
                        <li>The system automatically generates a <strong>tracking URL</strong> for the customer</li>
                        <li>The customer receives a <strong>"Your order has shipped"</strong> email with the tracking link</li>
                        <li>Your <strong>payout is initiated</strong> via Stripe transfer</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card id="order-statuses" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Order Statuses</h3>
                      <div className="space-y-2">
                        {[
                          { status: "Pending", color: "bg-yellow-500/10 text-yellow-600", desc: "Order placed, awaiting fulfillment" },
                          { status: "Processing", color: "bg-blue-500/10 text-blue-600", desc: "Order is being prepared" },
                          { status: "Shipped", color: "bg-purple-500/10 text-purple-600", desc: "Tracking submitted, in transit" },
                          { status: "Delivered", color: "bg-green-500/10 text-green-600", desc: "Package delivered to customer" },
                          { status: "Completed", color: "bg-green-500/10 text-green-600", desc: "Order fulfilled and finalized" },
                          { status: "Cancelled", color: "bg-red-500/10 text-red-600", desc: "Order was cancelled" },
                        ].map(s => (
                          <div key={s.status} className="flex items-center gap-3">
                            <span className={cn("text-xs font-medium rounded-full px-3 py-1 border", s.color)}>{s.status}</span>
                            <span className="text-sm text-muted-foreground">{s.desc}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </section>

                {/* SHIPPING */}
                <section id="shipping" data-section className="scroll-mt-28 space-y-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <MapPin className="h-6 w-6 text-primary" /> Shipping Setup
                  </h2>

                  <Card id="shipping-modes" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-4">
                      <h3 className="text-lg font-semibold">Flat Rate vs Calculated Shipping</h3>
                      <p className="text-muted-foreground">You choose your shipping method in the <strong>Shipping</strong> tab:</p>

                      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <p className="font-medium">Option 1: Flat Rate Shipping</p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Default: <strong>$6.99 flat rate</strong> per vendor per order</li>
                          <li>You can customize the flat rate amount</li>
                          <li>Optionally offer <strong>free shipping</strong> above a threshold (e.g., $35+)</li>
                          <li>Simple and predictable for both you and customers</li>
                        </ul>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <p className="font-medium">Option 2: Calculated Shipping (Default for New Vendors)</p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Real-time rates calculated at checkout based on origin ZIP, destination ZIP, and package weight</li>
                          <li>Rates from <strong>USPS</strong>, <strong>UPS</strong>, and <strong>FedEx</strong></li>
                          <li>Customers see multiple carrier options and choose the one they prefer</li>
                          <li>Most accurate — you won't over- or under-charge for shipping</li>
                          <li>Requires your <strong>origin ZIP code</strong> (and ideally product weights)</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>

                  <Card id="origin-address" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Origin Address</h3>
                      <p className="text-muted-foreground">
                        Set your <strong>ship-from ZIP code</strong>, city, and state in the Shipping tab. This is used to calculate shipping rates for calculated shipping. Even if you use flat rate, it's good practice to fill this in.
                      </p>
                    </CardContent>
                  </Card>

                  <Card id="free-shipping" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Free Shipping Threshold</h3>
                      <p className="text-muted-foreground">
                        By default, <strong>free shipping is disabled</strong> for new vendors. You can enable it and set a minimum order threshold (e.g., free shipping on orders $35+). This applies per-vendor — each vendor's free shipping threshold is calculated independently.
                      </p>
                    </CardContent>
                  </Card>

                  <Card id="shipping-reimbursement" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Shipping Reimbursement</h3>
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                        <p className="font-medium text-primary text-sm">💰 Shipping fees are 100% passed to you</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Whatever shipping amount is collected from the customer at checkout is included in your payout. The 20% platform commission is only applied to the <strong>product subtotal</strong>, not shipping. You are reimbursed for your shipping costs in full.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </section>

                {/* PAYMENTS */}
                <section id="payments" data-section className="scroll-mt-28 space-y-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <DollarSign className="h-6 w-6 text-primary" /> Payments & Earnings
                  </h2>

                  <Card id="commission" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Commission Structure</h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="bg-primary/5 rounded-lg p-4 text-center">
                          <p className="text-3xl font-bold text-primary">80%</p>
                          <p className="text-sm text-muted-foreground">You keep</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-4 text-center">
                          <p className="text-3xl font-bold">20%</p>
                          <p className="text-sm text-muted-foreground">Platform commission</p>
                        </div>
                      </div>
                      <p className="text-muted-foreground">
                        The 20% platform commission is calculated on the <strong>product subtotal only</strong> (not including shipping). This commission supports Best Day Ministries' mission and covers marketplace operations, payment processing infrastructure, and customer support.
                      </p>
                      <div className="bg-muted/50 rounded-lg p-4 text-sm">
                        <p className="font-medium mb-2">Example:</p>
                        <ul className="space-y-1 text-muted-foreground">
                          <li>Product price: <strong>$25.00</strong></li>
                          <li>Shipping collected: <strong>$6.99</strong></li>
                          <li>Platform commission (20% of $25.00): <strong>$5.00</strong></li>
                          <li>Your payout: <strong>$20.00 + $6.99 = $26.99</strong></li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>

                  <Card id="payouts" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Payout Schedule</h3>
                      <p className="text-muted-foreground">
                        Payouts are processed via <strong>Stripe Connect</strong> directly to your bank account. Stripe typically deposits funds <strong>within 2–7 business days</strong> after the transfer is initiated.
                      </p>
                    </CardContent>
                  </Card>

                  <Card id="payout-triggers" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">When Payouts Happen</h3>
                      <p className="text-muted-foreground">
                        Payouts are triggered <strong>when you submit a tracking number</strong> for an order item. This is the confirmation that you've shipped the item. The system:
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>Calculates your payout (product amount minus commission + shipping reimbursement)</li>
                        <li>Initiates a Stripe transfer to your connected account</li>
                        <li>Sends you a <strong>payout confirmation email</strong></li>
                      </ol>
                      <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                        <strong>Retry System:</strong> If a transfer fails (e.g., insufficient platform balance), the system automatically <strong>retries hourly</strong> until successful. You'll see the transfer status in your Earnings tab.
                      </p>
                    </CardContent>
                  </Card>

                  <Card id="earnings-dashboard" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Earnings Dashboard</h3>
                      <p className="text-muted-foreground">
                        The <strong>Earnings</strong> tab shows your complete financial picture:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>Total sales amount</li>
                        <li>Commission paid to the platform</li>
                        <li>Net earnings (what you received)</li>
                        <li>Pending payouts</li>
                        <li>Per-order breakdown with payout status</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card id="payout-emails" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Payout Email Notifications</h3>
                      <p className="text-muted-foreground">
                        When a payout to your Stripe account is successfully completed, you'll receive a <strong>branded email notification</strong> with the amount and associated order details.
                      </p>
                    </CardContent>
                  </Card>
                </section>

                {/* STORE PROFILE */}
                <section id="store-profile" data-section className="scroll-mt-28 space-y-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Palette className="h-6 w-6 text-primary" /> Store Profile & Branding
                  </h2>

                  <Card id="business-info" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Business Info</h3>
                      <p className="text-muted-foreground">
                        In the <strong>Settings</strong> tab, update your:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li><strong>Business Name</strong> — Shown on your storefront and product cards</li>
                        <li><strong>Description</strong> — Tell customers about your business</li>
                        <li><strong>Contact Email</strong> — For customer communication</li>
                        <li><strong>Processing Time</strong> — How long to prepare an order before shipping (1–2 days to 2–3 weeks)</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card id="logo-banner" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Logo & Banner</h3>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li><strong>Logo</strong> — Displayed on your vendor page and product cards. Keep it square.</li>
                        <li><strong>Banner</strong> — A wide header image for your vendor profile page. Recommended: 1200×400 or similar wide aspect ratio.</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card id="theme-color" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Theme Color</h3>
                      <p className="text-muted-foreground">
                        Choose a <strong>theme color</strong> for your vendor dashboard and profile page. This adds a personalized touch with accent colors applied to cards, buttons, and highlights throughout your vendor experience.
                      </p>
                    </CardContent>
                  </Card>

                  <Card id="vendor-story" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Vendor Story & Media</h3>
                      <p className="text-muted-foreground">
                        Share your story! Upload photos and media that tell customers about you and your craft. This content appears on your public vendor profile page and helps build trust and connection with potential buyers.
                      </p>
                    </CardContent>
                  </Card>

                  <Card id="social-links" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Social Links</h3>
                      <p className="text-muted-foreground">
                        Add links to your <strong>website</strong>, <strong>Instagram</strong>, and <strong>Facebook</strong>. These appear on your public vendor profile for customers who want to follow you.
                      </p>
                    </CardContent>
                  </Card>

                  <Card id="public-profile" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Your Public Vendor Page</h3>
                      <p className="text-muted-foreground">
                        Every vendor gets a <strong>public profile page</strong> at <code>/vendors/[your-id]</code>. This page showcases your banner, logo, description, story media, social links, and all your active products. Customers can browse your full catalog from here.
                      </p>
                    </CardContent>
                  </Card>
                </section>

                {/* BESTIE PROGRAM */}
                <section id="bestie-program" data-section className="scroll-mt-28 space-y-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Users className="h-6 w-6 text-primary" /> Bestie Program
                  </h2>

                  <Card id="linking-besties" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Linking to a Bestie</h3>
                      <p className="text-muted-foreground">
                        You can link your vendor store to a <strong>Bestie</strong> (a community member with disabilities). This allows you to feature their content on your vendor profile, creating a more personal connection with customers.
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>Go to the <strong>Besties</strong> section in your dashboard</li>
                        <li>Submit a <strong>link request</strong> to a specific Bestie</li>
                        <li>The Bestie's <strong>guardian</strong> reviews and approves the request</li>
                        <li>Once approved, you can use approved Bestie content on your store</li>
                      </ol>
                    </CardContent>
                  </Card>

                  <Card id="bestie-assets" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Using Bestie Content</h3>
                      <p className="text-muted-foreground">
                        After linking to a Bestie, you can select from <strong>approved assets</strong> (photos, voice notes) to display on your vendor profile. You can also submit your own assets (like product photos featuring the Bestie) that require <strong>guardian approval</strong> before they go live.
                      </p>
                    </CardContent>
                  </Card>

                  <Card id="guardian-approval" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Guardian Approval</h3>
                      <p className="text-muted-foreground">
                        All vendor-Bestie interactions go through a guardian. Guardians can configure whether <strong>vendor asset submissions require approval</strong>. This keeps the Bestie safe while allowing vendors to feature their connection.
                      </p>
                    </CardContent>
                  </Card>
                </section>

                {/* TEAM */}
                <section id="team" data-section className="scroll-mt-28">
                  <Card>
                    <CardContent className="pt-6 space-y-3">
                      <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Users className="h-6 w-6 text-primary" /> Team Members
                      </h2>
                      <p className="text-muted-foreground">
                        You can invite <strong>team members</strong> to help manage your vendor store. Team members with accepted invitations get access to vendor features and receive order notification emails. Manage team members from the <strong>Settings</strong> area of your dashboard.
                      </p>
                    </CardContent>
                  </Card>
                </section>

                {/* EMAIL NOTIFICATIONS */}
                <section id="emails" data-section className="scroll-mt-28 space-y-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Mail className="h-6 w-6 text-primary" /> Email Notifications
                  </h2>
                  <p className="text-muted-foreground">Here are all the automated emails you'll receive as a vendor:</p>

                  <Card id="email-approval" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-2">
                      <h3 className="text-lg font-semibold">✅ Application Approved / ❌ Rejected</h3>
                      <p className="text-muted-foreground">
                        When your vendor application is reviewed, you receive an email notifying you of the decision. If approved, the email includes a link to your vendor dashboard.
                      </p>
                    </CardContent>
                  </Card>

                  <Card id="email-orders" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-2">
                      <h3 className="text-lg font-semibold">📦 New Order Alert</h3>
                      <p className="text-muted-foreground">
                        Sent when a customer places an order with your products. Includes: order number, items ordered (names, quantities, amounts), customer shipping address, and your total payout amount. Team members also receive this email.
                      </p>
                    </CardContent>
                  </Card>

                  <Card id="email-shipped" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-2">
                      <h3 className="text-lg font-semibold">🚚 Order Shipped (to Customer)</h3>
                      <p className="text-muted-foreground">
                        When you submit a tracking number, the <strong>customer</strong> receives a "Your order has shipped" email with the tracking number and a link to track their package.
                      </p>
                    </CardContent>
                  </Card>

                  <Card id="email-payout" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-2">
                      <h3 className="text-lg font-semibold">💰 Payout Completed</h3>
                      <p className="text-muted-foreground">
                        When a payout to your Stripe account is successfully processed, you receive an email with the amount and the associated order details.
                      </p>
                    </CardContent>
                  </Card>
                </section>

                {/* POLICIES */}
                <section id="policies" data-section className="scroll-mt-28 space-y-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <ShieldCheck className="h-6 w-6 text-primary" /> Policies & Responsibilities
                  </h2>

                  <Card id="vendor-responsibilities" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Your Responsibilities</h3>
                      <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                        <li><strong>Accurate product listings</strong> — Honest descriptions, clear photos, correct pricing</li>
                        <li><strong>Timely fulfillment</strong> — Ship orders within your stated processing time</li>
                        <li><strong>Tracking submission</strong> — Always provide tracking numbers so customers can follow their shipments and you can get paid</li>
                        <li><strong>Inventory management</strong> — Keep inventory counts accurate to avoid overselling</li>
                        <li><strong>Customer quality</strong> — Ensure products match descriptions and arrive safely</li>
                        <li><strong>Communication</strong> — Respond to any issues promptly</li>
                        <li><strong>Shipping supplies</strong> — Provide your own boxes, packaging materials, labels, and carrier accounts</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card id="prohibited-items" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Prohibited Items</h3>
                      <p className="text-muted-foreground">
                        The Joy House Store is a family-friendly, community-focused marketplace. The following are not permitted:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>Illegal items or substances</li>
                        <li>Weapons or dangerous goods</li>
                        <li>Adult or explicit content</li>
                        <li>Counterfeit or trademark-infringing products</li>
                        <li>Products that misrepresent their origin or quality</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card id="suspension" data-section className="scroll-mt-28">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="text-lg font-semibold">Account Suspension</h3>
                      <p className="text-muted-foreground">
                        Vendor accounts may be <strong>suspended</strong> by the admin team for policy violations, inactivity, or quality issues. When suspended:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>Your products are <strong>hidden</strong> from the storefront</li>
                        <li>You cannot add or edit products</li>
                        <li>Existing orders still need to be fulfilled</li>
                        <li>You can contact the admin team to resolve the issue</li>
                      </ul>
                    </CardContent>
                  </Card>
                </section>

                {/* FAQ */}
                <section id="faq" data-section className="scroll-mt-28 space-y-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <HelpCircle className="h-6 w-6 text-primary" /> Frequently Asked Questions
                  </h2>

                  {[
                    { q: "How long does approval take?", a: "Typically 1–3 business days. You'll receive an email notification when your application is reviewed." },
                    { q: "Can I change my prices after listing a product?", a: "Yes, you can edit prices at any time from your Products tab. Changes take effect immediately." },
                    { q: "What if a customer wants a refund?", a: "Contact the admin team through the platform. Refund handling is coordinated through the platform to ensure proper accounting." },
                    { q: "Do I need my own shipping labels?", a: "Yes, you use your own shipping accounts (USPS, UPS, FedEx, etc.) and purchase your own labels. The shipping fee collected from the customer is reimbursed to you." },
                    { q: "How do I know when someone orders?", a: "You'll receive both an email and an in-app notification with full order details including the customer's shipping address." },
                    { q: "When do I get paid?", a: "Payouts are initiated when you submit a tracking number for an order. The funds are transferred to your Stripe-connected bank account, typically within 2–7 business days." },
                    { q: "Can I have multiple vendor stores?", a: "Yes! Click 'Add Another Vendor' from your dashboard to create additional stores under the same account." },
                    { q: "What happens if a payout fails?", a: "The system automatically retries failed payouts every hour until successful. You can check the status in your Earnings tab." },
                    { q: "Do I need to decrement inventory manually?", a: "Yes, inventory is managed manually. Update your stock counts as you fulfill orders to avoid overselling." },
                    { q: "Can team members access my dashboard?", a: "Yes, invited and accepted team members can access vendor features and receive order notification emails." },
                  ].map((faq, i) => (
                    <Card key={i}>
                      <CardContent className="pt-6 space-y-2">
                        <h3 className="font-semibold">{faq.q}</h3>
                        <p className="text-sm text-muted-foreground">{faq.a}</p>
                      </CardContent>
                    </Card>
                  ))}
                </section>

                {/* CTA */}
                <div className="text-center pt-8 pb-4 space-y-4">
                  <Separator className="mb-8" />
                  <p className="text-muted-foreground">Ready to start selling?</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <Button size="lg" onClick={() => navigate("/vendor-auth")}>
                      <Store className="h-5 w-5 mr-2" /> Apply to Become a Vendor
                    </Button>
                    <Button size="lg" variant="outline" onClick={() => navigate("/vendor-dashboard")}>
                      Go to Dashboard
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Questions? <button onClick={() => navigate("/help")} className="text-primary hover:underline">Visit our Help Center</button> or use the contact form at the bottom of the page.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default VendorGuide;
