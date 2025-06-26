import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:w-[85vw] max-w-4xl max-h-[95vh] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            Privacy Policy
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[70vh] pr-4">
          <div className="space-y-6 text-sm text-foreground leading-relaxed">
            <section>
              <h3 className="text-lg font-semibold mb-3 text-primary">1. Information We Collect</h3>
              <p className="mb-3">
                We collect information you provide directly to us and information automatically collected through your use of our services:
              </p>
              
              <h4 className="font-semibold mb-2">Personal Information:</h4>
              <ul className="list-disc pl-6 space-y-1 mb-3">
                <li>Account registration details (username, email, profile information)</li>
                <li>Wallet addresses and cryptocurrency transaction data</li>
                <li>Shipping addresses and contact information for marketplace purchases</li>
                <li>Communication content and message history</li>
                <li>Identity verification documents when required</li>
              </ul>

              <h4 className="font-semibold mb-2">Technical Information:</h4>
              <ul className="list-disc pl-6 space-y-1">
                <li>Device information (IP address, browser type, operating system)</li>
                <li>Usage data and interaction patterns</li>
                <li>Session information and authentication tokens</li>
                <li>Performance analytics and error logs</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 text-primary">2. How We Use Your Information</h3>
              <p className="mb-3">
                We use collected information to:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Provide and maintain our messaging and marketplace services</li>
                <li>Process cryptocurrency transactions and escrow services</li>
                <li>Facilitate e-commerce purchases and order fulfillment</li>
                <li>Verify user identity and prevent fraud</li>
                <li>Improve our services and develop new features</li>
                <li>Comply with legal obligations and regulatory requirements</li>
                <li>Send important service notifications and updates</li>
                <li>Provide customer support and resolve technical issues</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 text-primary">3. Information Sharing and Disclosure</h3>
              <p className="mb-3">
                We may share your information in the following circumstances:
              </p>
              
              <h4 className="font-semibold mb-2">Service Providers:</h4>
              <ul className="list-disc pl-6 space-y-1 mb-3">
                <li>Payment processors for cryptocurrency transactions</li>
                <li>E-commerce partners for product fulfillment</li>
                <li>Cloud service providers for data storage and processing</li>
                <li>Analytics providers for service improvement</li>
              </ul>

              <h4 className="font-semibold mb-2">Legal Requirements:</h4>
              <ul className="list-disc pl-6 space-y-1 mb-3">
                <li>To comply with applicable laws and regulations</li>
                <li>In response to valid legal requests from authorities</li>
                <li>To protect our rights, property, or safety</li>
                <li>To prevent fraud or security threats</li>
              </ul>

              <h4 className="font-semibold mb-2">Business Transfers:</h4>
              <p>
                In connection with mergers, acquisitions, or asset sales, your information may be transferred as part of the business assets.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 text-primary">4. Cryptocurrency and Blockchain Data</h3>
              <p className="mb-3">
                Important considerations regarding cryptocurrency transactions:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Blockchain transactions are publicly visible and immutable</li>
                <li>Wallet addresses may be linked to your identity</li>
                <li>Transaction history is permanently recorded on blockchain networks</li>
                <li>We may monitor transactions for compliance and security purposes</li>
                <li>Cryptocurrency exchanges may require identity verification</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 text-primary">5. Data Security</h3>
              <p className="mb-3">
                We implement comprehensive security measures to protect your information:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>End-to-end encryption for messaging communications</li>
                <li>Secure storage of sensitive data with industry-standard encryption</li>
                <li>Multi-factor authentication and access controls</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Secure smart contracts for escrow and transaction processing</li>
                <li>Incident response procedures for security breaches</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 text-primary">6. Data Retention</h3>
              <p className="mb-3">
                We retain your information for different periods based on data type:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Account information: While your account is active plus 7 years</li>
                <li>Transaction records: 7 years for compliance purposes</li>
                <li>Communication logs: 3 years or as required by law</li>
                <li>Technical logs: 1 year for security and troubleshooting</li>
                <li>Marketing preferences: Until you withdraw consent</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 text-primary">7. Your Privacy Rights</h3>
              <p className="mb-3">
                Depending on your jurisdiction, you may have the following rights:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Access to your personal information we hold</li>
                <li>Correction of inaccurate or incomplete data</li>
                <li>Deletion of your personal information (subject to legal requirements)</li>
                <li>Portability of your data to another service</li>
                <li>Restriction of processing in certain circumstances</li>
                <li>Objection to processing based on legitimate interests</li>
                <li>Withdrawal of consent for optional data processing</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 text-primary">8. Cookies and Tracking Technologies</h3>
              <p className="mb-3">
                We use various technologies to collect information:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Essential cookies for authentication and security</li>
                <li>Performance cookies for analytics and optimization</li>
                <li>Preference cookies to remember your settings</li>
                <li>Local storage for application functionality</li>
                <li>Web beacons for email communication tracking</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 text-primary">9. Third-Party Services</h3>
              <p className="mb-3">
                Our platform integrates with third-party services that have their own privacy policies:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Cryptocurrency networks and blockchain explorers</li>
                <li>Payment processors and financial institutions</li>
                <li>E-commerce platforms and shipping providers</li>
                <li>Analytics and monitoring services</li>
                <li>Cloud infrastructure providers</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 text-primary">10. International Data Transfers</h3>
              <p>
                Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for international transfers, including standard contractual clauses and adequacy decisions.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 text-primary">11. Children's Privacy</h3>
              <p>
                Our services are not intended for users under 18 years of age. We do not knowingly collect personal information from children. If we become aware of such collection, we will delete the information immediately.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 text-primary">12. Changes to This Privacy Policy</h3>
              <p>
                We may update this privacy policy periodically to reflect changes in our practices or legal requirements. We will notify you of material changes through the platform or email. Continued use after changes indicates acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 text-primary">13. Contact Information</h3>
              <p className="mb-3">
                For privacy-related questions or to exercise your rights, contact us at:
              </p>
              <ul className="list-none space-y-1">
                <li>Email: privacy@coynmessenger.com</li>
                <li>Data Protection Officer: dpo@coynmessenger.com</li>
                <li>In-app support: Available through settings menu</li>
                <li>Response time: Within 30 days for most requests</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 text-primary">14. Regulatory Compliance</h3>
              <p className="mb-3">
                We comply with applicable privacy laws including:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>General Data Protection Regulation (GDPR)</li>
                <li>California Consumer Privacy Act (CCPA)</li>
                <li>Personal Information Protection and Electronic Documents Act (PIPEDA)</li>
                <li>Anti-money laundering (AML) and know your customer (KYC) regulations</li>
              </ul>
            </section>

            <div className="mt-8 p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">
                Last updated: December 26, 2024
              </p>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}