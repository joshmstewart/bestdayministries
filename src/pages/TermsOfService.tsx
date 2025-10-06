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
              <p className="text-sm text-muted-foreground">Last Updated: January 6, 2025 • Version 1.0</p>
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
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Best Day Ministries operates a comprehensive online platform that connects community members, guardians, supporters, and vendors. Our Service includes multiple features designed to foster community engagement and support:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4 mb-3">
                  <li><strong>Community Features:</strong> Discussion boards, posts, comments, and social interactions</li>
                  <li><strong>Event Management:</strong> Registration and attendance tracking for community events</li>
                  <li><strong>Photo Albums & Gallery:</strong> Shared memories and community celebrations</li>
                  <li><strong>Messaging:</strong> Communication between guardians, besties, and supporters</li>
                  <li><strong>Marketplace:</strong> Vendor products and official merchandise</li>
                  <li><strong>Sponsorship Program:</strong> Financial support for individuals with special needs ("Besties")</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed">
                  Each feature has its own terms and conditions outlined in the sections below.
                </p>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">3. Community Features</h2>
                <div className="space-y-3 text-muted-foreground">
                  <p className="leading-relaxed">
                    <strong>3.1 User-Generated Content:</strong> Users may create and share posts, comments, photos, and participate in discussions. All content must comply with our community guidelines.
                  </p>
                  <p className="leading-relaxed">
                    <strong>3.2 Event Participation:</strong> Users may register for and attend community events. Event-specific terms and requirements will be provided at registration.
                  </p>
                  <p className="leading-relaxed">
                    <strong>3.3 Guardian Controls:</strong> Guardians have approval rights over content posted by or about their linked Besties, including posts, comments, and featured content.
                  </p>
                  <p className="leading-relaxed">
                    <strong>3.4 Messaging:</strong> The platform enables communication between community members. Messages may be subject to guardian approval based on user settings.
                  </p>
                </div>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">4. Sponsorship Program</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  The Sponsorship Program is one of several services offered through our platform. This section governs financial contributions to support Besties.
                </p>
                <div className="space-y-3 text-muted-foreground">
                  <p className="leading-relaxed">
                    <strong>4.1 Sponsorship Commitments:</strong> When you sponsor a Bestie, you agree to make a financial contribution as specified (one-time or monthly).
                  </p>
                  <p className="leading-relaxed">
                    <strong>4.2 Payment Processing:</strong> All payments are processed securely through Stripe. By making a sponsorship, you authorize us to charge your payment method.
                  </p>
                  <p className="leading-relaxed">
                    <strong>4.3 Monthly Subscriptions:</strong> Monthly sponsorships will automatically renew until cancelled. You may cancel at any time by logging into your account and clicking "Manage Subscription" on your sponsorship dashboard, which will open the Stripe customer portal where you can cancel, update payment methods, or view your payment history. Cancellations take effect at the end of the current billing period.
                  </p>
                  <p className="leading-relaxed">
                    <strong>4.4 Use of Funds:</strong> 100% of your sponsorship amount goes directly to support the sponsored Bestie's participation in programs, activities, and community engagement opportunities provided by Best Day Ministries, with the exception of payment processing fees charged by Stripe (which you may optionally cover at checkout).
                  </p>
                  <p className="leading-relaxed">
                    <strong>4.5 Donor Privacy:</strong> Your sponsorship information is kept private. We do not publicly share sponsor names, contact information, or donation amounts. Only aggregate donation totals (which contribute to funding progress indicators) are visible on our platform. Sponsor names are not shared with the Besties you sponsor.
                  </p>
                </div>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">5. Refund Policy</h2>
                <div className="space-y-3 text-muted-foreground">
                  <p className="leading-relaxed">
                    <strong>5.1 One-Time Sponsorships:</strong> One-time sponsorships are generally non-refundable once processed. However, we will consider refund requests on a case-by-case basis within 30 days of the donation.
                  </p>
                  <p className="leading-relaxed">
                    <strong>5.2 Monthly Subscriptions:</strong> You may cancel your monthly subscription at any time. Cancellation will take effect at the end of the current billing period. No refunds will be provided for partial months.
                  </p>
                  <p className="leading-relaxed">
                    <strong>5.3 Disputed Charges:</strong> If you believe a charge was made in error, please contact us immediately at contact@bestdayministries.org. We will investigate and resolve disputes promptly.
                  </p>
                  <p className="leading-relaxed">
                    <strong>5.4 Tax Deductibility:</strong> Best Day Ministries is a church under section 508(c)(1)(A) of the Internal Revenue Code and is exempt from federal income tax. Sponsorships may be tax-deductible to the extent allowed by law. You will receive a receipt for your records and an annual summary for tax purposes. No goods or services are provided in exchange for your sponsorship.
                  </p>
                </div>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">6. User Accounts</h2>
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
                <h2 className="text-2xl font-bold mb-3">7. User Conduct</h2>
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
                <h2 className="text-2xl font-bold mb-3">8. Content and Intellectual Property</h2>
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
                <h2 className="text-2xl font-bold mb-3">9. Marketplace and Vendor Terms</h2>
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
                <h2 className="text-2xl font-bold mb-3">10. Limitation of Liability</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Best Day Ministries is not liable for any indirect, incidental, or consequential damages arising from your use of the Service. 
                  Our total liability to you for any claim arising from these Terms or your use of the Service shall not exceed the amount you paid us in the past 12 months.
                </p>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">11. Indemnification</h2>
                <p className="text-muted-foreground leading-relaxed">
                  You agree to indemnify and hold harmless Best Day Ministries from any claims, damages, or expenses arising from your use of the Service or violation of these Terms.
                </p>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">12. Changes to Terms</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to modify these Terms at any time. Changes will be posted on this page with an updated "Last Updated" date. 
                  Your continued use of the Service after changes are posted constitutes acceptance of the modified Terms.
                </p>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">13. Termination</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may suspend or terminate your access to the Service at any time for violation of these Terms or for any other reason. 
                  Upon termination, you remain responsible for any outstanding sponsorship commitments.
                </p>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">14. Governing Law</h2>
                <p className="text-muted-foreground leading-relaxed">
                  These Terms are governed by the laws of the state where Best Day Ministries is organized, without regard to conflict of law principles.
                </p>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">15. Contact Information</h2>
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
                <h2 className="text-2xl font-bold mb-3">16. Entire Agreement</h2>
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
