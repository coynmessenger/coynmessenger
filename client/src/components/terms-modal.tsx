import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermsModal({ isOpen, onClose }: TermsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:w-[85vw] max-w-4xl max-h-[95vh] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            Terms and Conditions
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[70vh] pr-4">
          <div className="space-y-6 text-sm text-foreground leading-relaxed">
            <section>
              <h3 className="text-lg font-semibold mb-3 text-primary">1. Acceptance of Terms</h3>
              <p>
                By accessing and using COYN Messenger and its integrated marketplace ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 text-primary">2. Service Description</h3>
              <p className="mb-3">
                COYN Messenger is a cryptocurrency-integrated messaging platform that provides:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Real-time messaging and communication services</li>
                <li>Cryptocurrency wallet integration and transactions</li>
                <li>E-commerce marketplace with crypto payment options</li>
                <li>Escrow services for secure transactions</li>
                <li>Digital asset management tools</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 text-primary">3. User Accounts and Responsibilities</h3>
              <p className="mb-3">
                To use our services, you must:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Be at least 18 years of age or have parental consent</li>
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Comply with all applicable laws and regulations</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 text-primary">4. Cryptocurrency and Financial Services</h3>
              <p className="mb-3">
                Our platform facilitates cryptocurrency transactions. You acknowledge that:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Cryptocurrency values are volatile and can fluctuate significantly</li>
                <li>Transactions are irreversible once confirmed on the blockchain</li>
                <li>We are not responsible for market losses or transaction fees</li>
                <li>You are responsible for tax obligations related to crypto transactions</li>
                <li>We do not provide financial, investment, or tax advice</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 text-primary">5. Marketplace and E-commerce</h3>
              <p className="mb-3">
                When using our integrated marketplace:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Product listings are sourced from third-party retailers</li>
                <li>We act as an intermediary for transactions</li>
                <li>Shipping and fulfillment are handled by merchant partners</li>
                <li>Returns and refunds are subject to merchant policies</li>
                <li>We are not responsible for product quality or delivery issues</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 text-primary">6. Escrow Services</h3>
              <p className="mb-3">
                Our escrow services provide secure transaction mediation:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Funds are held in secure smart contracts</li>
                <li>Release conditions are predetermined by both parties</li>
                <li>Dispute resolution may involve manual review</li>
                <li>Escrow fees may apply to certain transactions</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 text-primary">7. Prohibited Activities</h3>
              <p className="mb-3">
                You agree not to:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Use the service for illegal activities or money laundering</li>
                <li>Attempt to hack, disrupt, or compromise system security</li>
                <li>Create multiple accounts to circumvent restrictions</li>
                <li>Engage in fraudulent or deceptive practices</li>
                <li>Violate intellectual property rights</li>
                <li>Harass, threaten, or abuse other users</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 text-primary">8. Privacy and Data Protection</h3>
              <p>
                Your privacy is important to us. Please review our Privacy Policy, which governs how we collect, use, and protect your personal information. By using our service, you consent to our data practices as described in the Privacy Policy.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 text-primary">9. Limitation of Liability</h3>
              <p className="mb-3">
                To the maximum extent permitted by law:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>We provide the service "as is" without warranties</li>
                <li>We are not liable for indirect, incidental, or consequential damages</li>
                <li>Our total liability is limited to the amount paid for services</li>
                <li>We are not responsible for third-party actions or services</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 text-primary">10. Intellectual Property</h3>
              <p>
                All content, trademarks, and intellectual property on our platform are owned by us or our licensors. You may not copy, modify, or distribute our content without written permission.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 text-primary">11. Termination</h3>
              <p>
                We reserve the right to terminate or suspend your account at any time for violations of these terms. Upon termination, your right to use the service ceases immediately.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 text-primary">12. Changes to Terms</h3>
              <p>
                We may update these terms periodically. Continued use of the service after changes constitutes acceptance of the new terms. We will notify users of significant changes.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 text-primary">13. Governing Law</h3>
              <p>
                These terms are governed by the laws of the jurisdiction where our company is incorporated. Any disputes will be resolved through binding arbitration.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 text-primary">14. Contact Information</h3>
              <p>
                For questions about these terms, please contact us at legal@coynmessenger.com or through our in-app support system.
              </p>
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