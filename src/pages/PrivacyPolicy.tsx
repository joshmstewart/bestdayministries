import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      
      <main className="flex-1 pt-6 pb-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-4xl font-black">Privacy Policy</CardTitle>
              <p className="text-sm text-muted-foreground">Last Updated: January 6, 2025 • Version 1.0</p>
            </CardHeader>
            <CardContent className="space-y-6 text-sm">
              <section>
                <h2 className="text-2xl font-bold mb-3">1. Introduction</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Best Day Ministries ("we," "us," or "our") respects your privacy and is committed to protecting your personal information. 
                  This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.
                </p>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">2. Information We Collect</h2>
                <div className="space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">2.1 Information You Provide</h3>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                      <li><strong>Account Information:</strong> Name, email address, display name, profile details</li>
                      <li><strong>Payment Information:</strong> Processed securely through Stripe (we do not store credit card numbers)</li>
                      <li><strong>Sponsorship Information:</strong> Sponsorship amount, frequency, and linked Bestie</li>
                      <li><strong>Communication Data:</strong> Messages sent through our platform, event registrations</li>
                      <li><strong>User Content:</strong> Posts, comments, photos, and other content you submit</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2">2.2 Automatically Collected Information</h3>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                      <li><strong>Device Information:</strong> Browser type, operating system, device identifiers</li>
                      <li><strong>Usage Data:</strong> Pages visited, features used, time spent on pages</li>
                      <li><strong>Location Data:</strong> General geographic location based on IP address</li>
                      <li><strong>Cookies:</strong> Session cookies for authentication and preferences</li>
                    </ul>
                  </div>
                </div>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">3. How We Use Your Information</h2>
                <p className="text-muted-foreground leading-relaxed mb-2">We use your information to:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>Process and manage your sponsorships and donations</li>
                  <li>Maintain and improve our services</li>
                  <li>Communicate with you about your account and sponsorships</li>
                  <li>Send receipts and tax documentation</li>
                  <li>Provide customer support</li>
                  <li>Facilitate community features and connections</li>
                  <li>Ensure security and prevent fraud</li>
                  <li>Comply with legal obligations</li>
                  <li>Send updates about Best Day Ministries (with your consent)</li>
                </ul>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">4. Payment Processing</h2>
                <div className="space-y-3 text-muted-foreground">
                  <p className="leading-relaxed">
                    <strong>4.1 Stripe Integration:</strong> All payment processing is handled by Stripe, a third-party payment processor. 
                    When you make a sponsorship, your payment information is transmitted directly to Stripe and is not stored on our servers.
                  </p>
                  <p className="leading-relaxed">
                    <strong>4.2 Information Shared with Stripe:</strong> We share your name, email address, and payment amount with Stripe to process transactions. 
                    Stripe's use of your information is governed by their Privacy Policy.
                  </p>
                  <p className="leading-relaxed">
                    <strong>4.3 PCI Compliance:</strong> Stripe is PCI-DSS compliant, ensuring your payment information is handled securely according to industry standards.
                  </p>
                </div>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">5. Information Sharing and Disclosure</h2>
                <div className="space-y-3 text-muted-foreground">
                  <p className="leading-relaxed">
                    <strong>5.1 With Service Providers:</strong> We share information with trusted third-party service providers who assist us in operating our platform (e.g., Stripe for payments, email service providers, hosting providers).
                  </p>
                  <p className="leading-relaxed">
                    <strong>5.2 Within the Community:</strong> Your profile information and public posts are visible to other users based on your role and privacy settings.
                  </p>
                  <p className="leading-relaxed">
                    <strong>5.3 With Guardians:</strong> If you are a Bestie, information you share may be visible to your linked guardians for approval and oversight.
                  </p>
                  <p className="leading-relaxed">
                    <strong>5.4 Legal Requirements:</strong> We may disclose information if required by law, court order, or to protect our rights and safety.
                  </p>
                  <p className="leading-relaxed">
                    <strong>5.5 Business Transfers:</strong> In the event of a merger or acquisition, your information may be transferred to the new entity.
                  </p>
                </div>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">6. Data Security</h2>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  We implement appropriate security measures to protect your information:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>Encryption of data in transit and at rest</li>
                  <li>Secure authentication and access controls</li>
                  <li>Regular security audits and updates</li>
                  <li>Limited employee access to personal data</li>
                  <li>Secure third-party service providers</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-3">
                  However, no method of transmission or storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
                </p>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">7. Your Privacy Rights</h2>
                <div className="space-y-3 text-muted-foreground">
                  <p className="leading-relaxed">
                    <strong>7.1 Access and Correction:</strong> You can access and update your account information through your profile settings.
                  </p>
                  <p className="leading-relaxed">
                    <strong>7.2 Data Deletion:</strong> You may request deletion of your account and personal information by contacting us. Note that we may retain certain information for legal or operational purposes.
                  </p>
                  <p className="leading-relaxed">
                    <strong>7.3 Marketing Communications:</strong> You can opt out of marketing emails by using the unsubscribe link in our emails.
                  </p>
                  <p className="leading-relaxed">
                    <strong>7.4 Data Portability:</strong> You can request a copy of your personal data in a machine-readable format.
                  </p>
                  <p className="leading-relaxed">
                    <strong>7.5 Cookie Preferences:</strong> You can manage cookie preferences through your browser settings.
                  </p>
                </div>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">8. Children's Privacy</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Our Service is not directed to children under 13. If you are a parent or guardian and believe your child has provided us with personal information, 
                  please contact us. For Besties under 18, guardians have oversight and approval rights over their linked Bestie's content and activities.
                </p>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">9. Retention of Information</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We retain your information for as long as necessary to provide our services, comply with legal obligations, resolve disputes, and enforce our agreements. 
                  Sponsorship and donation records are retained for tax and legal purposes as required by law.
                </p>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">10. Third-Party Links</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Our Service may contain links to third-party websites. We are not responsible for the privacy practices of these external sites. 
                  We encourage you to review their privacy policies before providing any information.
                </p>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">11. International Data Transfers</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Your information may be transferred to and processed in countries other than your own. 
                  We ensure appropriate safeguards are in place to protect your information in accordance with this Privacy Policy.
                </p>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">12. Changes to This Privacy Policy</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated "Last Updated" date. 
                  We encourage you to review this policy periodically. Continued use of our services after changes are posted constitutes acceptance of the updated policy.
                </p>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">13. Contact Us</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  If you have questions about this Privacy Policy or wish to exercise your privacy rights, please contact us:
                </p>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="font-medium">Best Day Ministries</p>
                  <p className="text-muted-foreground">Email: contact@bestdayministries.org</p>
                  <p className="text-muted-foreground mt-2">Privacy Officer: Best Day Ministries Privacy Team</p>
                </div>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">14. California Privacy Rights</h2>
                <p className="text-muted-foreground leading-relaxed">
                  California residents have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what information we collect, 
                  the right to request deletion, and the right to opt-out of sale of personal information. We do not sell personal information.
                </p>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-bold mb-3">15. GDPR Compliance (EU Users)</h2>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  If you are located in the European Economic Area (EEA), you have rights under the General Data Protection Regulation (GDPR), including:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>Right to access your personal data</li>
                  <li>Right to rectification of inaccurate data</li>
                  <li>Right to erasure ("right to be forgotten")</li>
                  <li>Right to restrict processing</li>
                  <li>Right to data portability</li>
                  <li>Right to object to processing</li>
                  <li>Right to withdraw consent</li>
                </ul>
              </section>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
