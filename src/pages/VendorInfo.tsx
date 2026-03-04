import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Store, DollarSign, Truck, CreditCard, Clock, ShieldCheck, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";

const VendorInfo = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEOHead
        title="Become a Vendor | Joy House Online Store"
        description="Learn about selling your products on the Joy House Online Store. Commission rates, shipping, payouts, and how to get started."
      />
      <div className="min-h-screen flex flex-col">
        <UnifiedHeader />
        <main className="flex-1 bg-background pt-24 pb-16">
          <div className="container max-w-3xl mx-auto px-4">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>

            {/* Hero */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Store className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-3">Sell on the Joy House Online Store</h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Our marketplace is a community-first space — like Etsy, but built for businesses owned by or supporting people with disabilities.
              </p>
            </div>

            <div className="space-y-8">
              {/* How It Works */}
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-primary" /> How It Works
                  </h2>
                  <p className="text-muted-foreground">
                    You list your products on our store. When a customer places an order, <strong>you fulfill and ship it directly to them</strong> (dropship model). You never need to send inventory to us — you manage everything from your own location.
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    <li><strong>Apply</strong> — Create an account and submit a vendor application.</li>
                    <li><strong>Get approved</strong> — Our team reviews your application.</li>
                    <li><strong>Set up your store</strong> — Add products, descriptions, photos, and pricing from your vendor dashboard.</li>
                    <li><strong>Connect payments</strong> — Link your Stripe account so you can receive payouts.</li>
                    <li><strong>Sell & ship</strong> — When orders come in, you ship directly to the customer.</li>
                  </ol>
                </CardContent>
              </Card>

              {/* Commission & Payouts */}
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" /> Commission & Payouts
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-primary">80%</p>
                      <p className="text-sm text-muted-foreground">You keep</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold">20%</p>
                      <p className="text-sm text-muted-foreground">Platform commission</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground">
                    The 20% platform commission supports Best Day Ministries' mission and covers marketplace operations, payment processing infrastructure, and customer support.
                  </p>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Payouts via Stripe</p>
                      <p className="text-sm text-muted-foreground">
                        Payouts are processed weekly (every Monday) directly to your connected Stripe account. You'll need to complete Stripe's onboarding during setup — it takes just a few minutes.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Shipping */}
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" /> Shipping
                  </h2>
                  <div className="space-y-3 text-muted-foreground">
                    <p>
                      <strong>You handle shipping.</strong> When an order is placed, you receive a notification with the customer's shipping address and order details. You pack and ship from your own location.
                    </p>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                      <p className="font-medium text-foreground">How Shipping Rates Work:</p>
                      <p className="text-sm">
                        Shipping costs are <strong>dynamically calculated at checkout</strong> based on the customer's ZIP code, your origin ZIP, and the weight/dimensions of the items. We pull real-time rates from top carriers including:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li><strong>USPS</strong> — Priority Mail, Ground Advantage, and more</li>
                        <li><strong>UPS</strong> — Ground, 3-Day Select, 2nd Day Air, etc.</li>
                        <li><strong>FedEx</strong> — Ground, Express, Home Delivery</li>
                      </ul>
                      <p className="text-sm">
                        Customers see the best available rates at checkout and choose the option that works for them. If product weight/dimensions aren't set, a <strong>$6.99 flat rate</strong> is used as a fallback (free shipping on orders $35+ per vendor).
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <p className="font-medium text-foreground">What You'll Need for Shipping:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Set your <strong>origin ZIP code</strong> in your vendor dashboard settings</li>
                        <li>Enter <strong>weight and dimensions</strong> for each product for accurate rate calculation</li>
                        <li>Use your own shipping accounts and labels to ship orders</li>
                        <li>Enter <strong>tracking numbers</strong> through your vendor dashboard once an order ships</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* What You Need */}
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" /> What You'll Need
                  </h2>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">✓</span>
                      Product photos and descriptions
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">✓</span>
                      Ability to fulfill and ship orders yourself
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">✓</span>
                      A bank account for Stripe payouts
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">✓</span>
                      Your own shipping supplies and carrier accounts
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" /> Timeline
                  </h2>
                  <div className="space-y-3 text-muted-foreground">
                    <div className="flex items-start gap-3">
                      <span className="bg-primary/10 text-primary font-bold rounded-full w-7 h-7 flex items-center justify-center shrink-0 text-sm">1</span>
                      <div>
                        <p className="font-medium text-foreground">Apply (5 minutes)</p>
                        <p className="text-sm">Create an account and fill out the vendor application.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="bg-primary/10 text-primary font-bold rounded-full w-7 h-7 flex items-center justify-center shrink-0 text-sm">2</span>
                      <div>
                        <p className="font-medium text-foreground">Approval (1–3 business days)</p>
                        <p className="text-sm">Our team reviews your application and notifies you.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="bg-primary/10 text-primary font-bold rounded-full w-7 h-7 flex items-center justify-center shrink-0 text-sm">3</span>
                      <div>
                        <p className="font-medium text-foreground">Set up & start selling</p>
                        <p className="text-sm">Add products, connect Stripe, and you're live!</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* CTA */}
              <div className="text-center pt-4 space-y-4">
                <Button size="lg" onClick={() => navigate("/vendor-auth")} className="text-lg px-8">
                  <Store className="h-5 w-5 mr-2" /> Apply to Become a Vendor
                </Button>
                <p className="text-sm text-muted-foreground">
                  Questions? Contact us using the form below on our{" "}
                  <button onClick={() => navigate("/support")} className="text-primary hover:underline">
                    Contact page
                  </button>.
                </p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default VendorInfo;
