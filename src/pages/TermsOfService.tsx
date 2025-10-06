import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const TermsOfService = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      
      <main className="flex-1 pt-6 pb-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-4xl font-black">Terms of Service</CardTitle>
              <p className="text-sm text-muted-foreground">Last Updated: January 6, 2025</p>
            </CardHeader>
            <CardContent className="space-y-6 text-sm">
              <section>
                <h2 className="text-2xl font-bold mb-3">1. Agreement to Terms</h2>
                <p className="text-muted-foreground leading-relaxed">
                  By accessing or using Best Day Ministries' website and services ("Service"), you agree to be bound by these Terms of Service. 
                  If you do not agree to these terms, you may not use the Service.
                </p>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">2. Description of Service</h2>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  Best Day Ministries provides a platform for supporters to sponsor individuals with special needs ("Besties") through one-time or recurring monthly donations.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  The Service includes community features, event management, and marketplace functionality to support our mission.
                </p>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">3. Sponsorship Terms</h2>
                <div className="space-y-3 text-muted-foreground">
                  <p className="leading-relaxed">
                    <strong>3.1 Sponsorship Commitments:</strong> When you sponsor a Bestie, you agree to make a financial contribution as specified (one-time or monthly).
                  </p>
                  <p className="leading-relaxed">
                    <strong>3.2 Payment Processing:</strong> All payments are processed securely through Stripe. By making a sponsorship, you authorize us to charge your payment method.
                  </p>
                  <p className="leading-relaxed">
                    <strong>3.3 Monthly Subscriptions:</strong> Monthly sponsorships will automatically renew until cancelled. You may cancel at any time through your account settings or the Stripe customer portal.
                  </p>
                  <p className="leading-relaxed">
                    <strong>3.4 Use of Funds:</strong> Sponsorship funds directly support the sponsored Bestie's participation in programs, activities, and community engagement opportunities provided by Best Day Ministries.
                  </p>
                </div>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">4. Refund Policy</h2>
                <div className="space-y-3 text-muted-foreground">
                  <p className="leading-relaxed">
                    <strong>4.1 One-Time Sponsorships:</strong> One-time sponsorships are generally non-refundable once processed. However, we will consider refund requests on a case-by-case basis within 30 days of the donation.
                  </p>
                  <p className="leading-relaxed">
                    <strong>4.2 Monthly Subscriptions:</strong> You may cancel your monthly subscription at any time. Cancellation will take effect at the end of the current billing period. No refunds will be provided for partial months.
                  </p>
                  <p className="leading-relaxed">
                    <strong>4.3 Disputed Charges:</strong> If you believe a charge was made in error, please contact us immediately at contact@bestdayministries.org. We will investigate and resolve disputes promptly.
                  </p>
                  <p className="leading-relaxed">
                    <strong>4.4 Tax Deductibility:</strong> Best Day Ministries is a 501(c)(3) tax-exempt organization. Sponsorships may be tax-deductible to the extent allowed by law. You will receive a receipt for your records and an annual summary for tax purposes.
                  </p>
                </div>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">5. User Accounts</h2>
                <div className="space-y-3 text-muted-foreground">
                  <p className="leading-relaxed">
                    <strong>5.1 Account Creation:</strong> You may create an account to manage your sponsorships and engage with the community. You are responsible for maintaining the confidentiality of your account credentials.
                  </p>
                  <p className="leading-relaxed">
                    <strong>5.2 Guest Sponsorships:</strong> You may sponsor a Bestie without creating an account. Guest sponsorships will automatically link to your account if you later register using the same email address.
                  </p>
                  <p className="leading-relaxed">
                    <strong>5.3 Account Security:</strong> You are responsible for all activities under your account. Notify us immediately of any unauthorized access.
                  </p>
                </div>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">6. User Conduct</h2>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  Users agree to use the Service in a manner consistent with our mission and values. Prohibited activities include:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>Harassment, abuse, or threatening behavior toward any user</li>
                  <li>Posting inappropriate, offensive, or illegal content</li>
                  <li>Attempting to defraud or deceive other users</li>
                  <li>Violating the privacy rights of others</li>
                  <li>Using the Service for any unlawful purpose</li>
                </ul>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">7. Content and Intellectual Property</h2>
                <div className="space-y-3 text-muted-foreground">
                  <p className="leading-relaxed">
                    <strong>7.1 Our Content:</strong> All content on the Service, including text, images, logos, and designs, is the property of Best Day Ministries and protected by copyright laws.
                  </p>
                  <p className="leading-relaxed">
                    <strong>7.2 User Content:</strong> By posting content to the Service, you grant us a non-exclusive license to use, display, and distribute your content in connection with operating the Service.
                  </p>
                  <p className="leading-relaxed">
                    <strong>7.3 Guardian Controls:</strong> Guardians have the right to review and approve content posted by or about their linked Besties.
                  </p>
                </div>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">8. Marketplace and Vendor Terms</h2>
                <div className="space-y-3 text-muted-foreground">
                  <p className="leading-relaxed">
                    <strong>8.1 Product Sales:</strong> Products sold through our marketplace are offered by approved vendors. Best Day Ministries is not responsible for product quality, shipping, or vendor disputes.
                  </p>
                  <p className="leading-relaxed">
                    <strong>8.2 Vendor Obligations:</strong> Vendors must fulfill orders promptly and maintain product quality standards.
                  </p>
                  <p className="leading-relaxed">
                    <strong>8.3 Returns and Disputes:</strong> Product returns and disputes should be directed to the vendor. Contact us if you need assistance resolving an issue.
                  </p>
                </div>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">9. Limitation of Liability</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Best Day Ministries is not liable for any indirect, incidental, or consequential damages arising from your use of the Service. 
                  Our total liability to you for any claim arising from these Terms or your use of the Service shall not exceed the amount you paid us in the past 12 months.
                </p>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">10. Indemnification</h2>
                <p className="text-muted-foreground leading-relaxed">
                  You agree to indemnify and hold harmless Best Day Ministries from any claims, damages, or expenses arising from your use of the Service or violation of these Terms.
                </p>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">11. Changes to Terms</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to modify these Terms at any time. Changes will be posted on this page with an updated "Last Updated" date. 
                  Your continued use of the Service after changes are posted constitutes acceptance of the modified Terms.
                </p>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">12. Termination</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may suspend or terminate your access to the Service at any time for violation of these Terms or for any other reason. 
                  Upon termination, you remain responsible for any outstanding sponsorship commitments.
                </p>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">13. Governing Law</h2>
                <p className="text-muted-foreground leading-relaxed">
                  These Terms are governed by the laws of the state where Best Day Ministries is organized, without regard to conflict of law principles.
                </p>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">14. Contact Information</h2>
                <p className="text-muted-foreground leading-relaxed">
                  For questions about these Terms, please contact us at:
                </p>
                <div className="mt-3 p-4 bg-muted/50 rounded-lg">
                  <p className="font-medium">Best Day Ministries</p>
                  <p className="text-muted-foreground">Email: contact@bestdayministries.org</p>
                </div>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">15. Entire Agreement</h2>
                <p className="text-muted-foreground leading-relaxed">
                  These Terms, together with our Privacy Policy, constitute the entire agreement between you and Best Day Ministries regarding use of the Service.
                </p>
              </section>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default TermsOfService;
