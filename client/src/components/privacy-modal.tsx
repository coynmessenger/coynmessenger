import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Database, Share2, Lock, UserCheck, Cookie, Globe, Mail, Scale } from "lucide-react";

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:w-[85vw] max-w-4xl max-h-[95vh] p-0 overflow-hidden bg-gradient-to-b from-background to-background/95 border-orange-200/20 dark:border-cyan-500/20 z-[60]" onPointerDownOutside={(e) => e.preventDefault()}>
        
        <div className="relative bg-gradient-to-r from-orange-500 via-orange-400 to-amber-500 dark:from-cyan-600 dark:via-cyan-500 dark:to-teal-500 p-6 pb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Privacy Policy</h2>
            </div>
          </div>
        </div>
        
        <ScrollArea className="h-[60vh] px-6 py-4">
          <div className="space-y-4">
            
            <div className="group p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-100 dark:border-blue-800/30 hover:shadow-md transition-all">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg group-hover:scale-110 transition-transform">
                  <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-blue-700 dark:text-blue-300 mb-2">1. Information We Collect</h3>
                  
                  <div className="mb-3">
                    <h4 className="font-medium text-sm text-blue-600 dark:text-blue-400 mb-2">Personal Information:</h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>Account details</li>
                      <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>Wallet addresses</li>
                      <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>Shipping information</li>
                      <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>Message history</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm text-blue-600 dark:text-blue-400 mb-2">Technical Information:</h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>Device information</li>
                      <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>Usage data</li>
                      <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>Session tokens</li>
                      <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>Analytics</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="group p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-100 dark:border-green-800/30 hover:shadow-md transition-all">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg group-hover:scale-110 transition-transform">
                  <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-green-700 dark:text-green-300 mb-2">2. How We Use Your Information</h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>Provide messaging services</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>Process crypto transactions</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>Facilitate purchases</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>Verify identity</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>Improve services</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>Comply with regulations</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="group p-4 rounded-xl bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 border border-purple-100 dark:border-purple-800/30 hover:shadow-md transition-all">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg group-hover:scale-110 transition-transform">
                  <Share2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-purple-700 dark:text-purple-300 mb-2">3. Information Sharing</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">We may share your information with:</p>
                  <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>Payment processors for transactions</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>E-commerce partners for fulfillment</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>Legal authorities when required</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="group p-4 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border border-amber-100 dark:border-amber-800/30 hover:shadow-md transition-all">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg group-hover:scale-110 transition-transform">
                  <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-amber-700 dark:text-amber-300 mb-2">4. Blockchain & Cryptocurrency</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">Important considerations:</p>
                  <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>Blockchain transactions are public and immutable</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>Wallet addresses may be linked to identity</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>Transaction history is permanent</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="group p-4 rounded-xl bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30 border border-teal-100 dark:border-teal-800/30 hover:shadow-md transition-all">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-teal-100 dark:bg-teal-900/50 rounded-lg group-hover:scale-110 transition-transform">
                  <ShieldCheck className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-teal-700 dark:text-teal-300 mb-2">5. Data Security</h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-teal-400 rounded-full"></span>End-to-end encryption</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-teal-400 rounded-full"></span>Secure data storage</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-teal-400 rounded-full"></span>Multi-factor auth</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-teal-400 rounded-full"></span>Security audits</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="group p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 border border-indigo-100 dark:border-indigo-800/30 hover:shadow-md transition-all">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg group-hover:scale-110 transition-transform">
                  <UserCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-indigo-700 dark:text-indigo-300 mb-2">6. Your Privacy Rights</h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>Access your data</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>Correct inaccuracies</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>Request deletion</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>Data portability</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="group p-4 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border border-orange-100 dark:border-orange-800/30 hover:shadow-md transition-all">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg group-hover:scale-110 transition-transform">
                  <Cookie className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-orange-700 dark:text-orange-300 mb-2">7. Cookies & Tracking</h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-orange-400 rounded-full"></span>Essential cookies</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-orange-400 rounded-full"></span>Performance cookies</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-orange-400 rounded-full"></span>Preference cookies</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-orange-400 rounded-full"></span>Local storage</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="group p-4 rounded-xl bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 border border-rose-100 dark:border-rose-800/30 hover:shadow-md transition-all">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-rose-100 dark:bg-rose-900/50 rounded-lg group-hover:scale-110 transition-transform">
                  <Globe className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-rose-700 dark:text-rose-300 mb-2">8. Third-Party Services</h3>
                  <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-rose-400 rounded-full"></span>Blockchain networks</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-rose-400 rounded-full"></span>Payment processors</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-rose-400 rounded-full"></span>E-commerce platforms</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="group p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border border-emerald-100 dark:border-emerald-800/30 hover:shadow-md transition-all">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg group-hover:scale-110 transition-transform">
                  <Scale className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-emerald-700 dark:text-emerald-300 mb-2">9. Regulatory Compliance</h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>GDPR</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>CCPA</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>PIPEDA</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>AML/KYC</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="group p-4 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 dark:from-cyan-950/30 dark:to-teal-950/30 border border-orange-100 dark:border-cyan-800/30 hover:shadow-md transition-all">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-orange-100 dark:bg-cyan-900/50 rounded-lg group-hover:scale-110 transition-transform">
                  <Mail className="h-5 w-5 text-orange-600 dark:text-cyan-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-orange-700 dark:text-cyan-300 mb-2">10. Contact Information</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    For privacy-related questions, contact us at <span className="font-medium text-orange-600 dark:text-cyan-400">info@coynful.com</span> or through our in-app support. Response time: within 30 days.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </ScrollArea>

        <div className="flex justify-end p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
          <Button 
            onClick={onClose} 
            className="bg-gradient-to-r from-orange-500 to-amber-500 dark:from-cyan-600 dark:to-teal-600 hover:from-orange-600 hover:to-amber-600 dark:hover:from-cyan-700 dark:hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all"
          >
            I Understand
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
