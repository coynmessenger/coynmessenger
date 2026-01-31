import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { FileText, Shield, ShoppingBag, Lock, AlertTriangle, Scale, Gavel, Mail } from "lucide-react";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermsModal({ isOpen, onClose }: TermsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:w-[85vw] max-w-4xl max-h-[95vh] p-0 overflow-hidden bg-gradient-to-b from-background to-background/95 border-orange-200/20 dark:border-cyan-500/20 z-[60]" onPointerDownOutside={(e) => e.preventDefault()}>
        
        <div className="relative bg-gradient-to-r from-orange-500 via-orange-400 to-amber-500 dark:from-cyan-600 dark:via-cyan-500 dark:to-teal-500 p-6 pb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Terms and Conditions</h2>
            </div>
          </div>
        </div>
        
        <ScrollArea className="h-[60vh] px-6 py-4">
          <div className="space-y-4">
            
            <div className="group p-4 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 dark:from-cyan-950/30 dark:to-teal-950/30 border border-orange-100 dark:border-cyan-800/30 hover:shadow-md transition-all">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-orange-100 dark:bg-cyan-900/50 rounded-lg group-hover:scale-110 transition-transform">
                  <FileText className="h-5 w-5 text-orange-600 dark:text-cyan-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-orange-700 dark:text-cyan-300 mb-2">1. Acceptance of Terms</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    By accessing and using COYN Messenger and its integrated marketplace ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                  </p>
                </div>
              </div>
            </div>

            <div className="group p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-100 dark:border-blue-800/30 hover:shadow-md transition-all">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg group-hover:scale-110 transition-transform">
                  <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-blue-700 dark:text-blue-300 mb-2">2. Service Description</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">COYN Messenger is a cryptocurrency-integrated messaging platform that provides:</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>Real-time messaging</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>Crypto wallet integration</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>E-commerce marketplace</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>Escrow services</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="group p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-100 dark:border-green-800/30 hover:shadow-md transition-all">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg group-hover:scale-110 transition-transform">
                  <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-green-700 dark:text-green-300 mb-2">3. User Responsibilities</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">To use our services, you must:</p>
                  <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>Be at least 18 years of age</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>Provide accurate information</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>Maintain account security</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>Comply with all applicable laws</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="group p-4 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border border-amber-100 dark:border-amber-800/30 hover:shadow-md transition-all">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg group-hover:scale-110 transition-transform">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-amber-700 dark:text-amber-300 mb-2">4. Cryptocurrency Services</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">You acknowledge that:</p>
                  <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>Cryptocurrency values are volatile</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>Transactions are irreversible</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>You are responsible for tax obligations</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>We do not provide financial advice</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="group p-4 rounded-xl bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 border border-purple-100 dark:border-purple-800/30 hover:shadow-md transition-all">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg group-hover:scale-110 transition-transform">
                  <ShoppingBag className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-purple-700 dark:text-purple-300 mb-2">5. Marketplace & E-commerce</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">When using our integrated marketplace:</p>
                  <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>Products are from third-party retailers</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>We act as an intermediary</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>Returns subject to merchant policies</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="group p-4 rounded-xl bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30 border border-teal-100 dark:border-teal-800/30 hover:shadow-md transition-all">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-teal-100 dark:bg-teal-900/50 rounded-lg group-hover:scale-110 transition-transform">
                  <Lock className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-teal-700 dark:text-teal-300 mb-2">6. Escrow Services</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">Our escrow services provide secure transaction mediation:</p>
                  <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-teal-400 rounded-full"></span>Funds held in secure smart contracts</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-teal-400 rounded-full"></span>Predetermined release conditions</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-teal-400 rounded-full"></span>Dispute resolution available</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="group p-4 rounded-xl bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border border-red-100 dark:border-red-800/30 hover:shadow-md transition-all">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg group-hover:scale-110 transition-transform">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-red-700 dark:text-red-300 mb-2">7. Prohibited Activities</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">You agree not to:</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>Engage in illegal activities</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>Attempt to hack systems</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>Create multiple accounts</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>Harass other users</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="group p-4 rounded-xl bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950/30 dark:to-gray-950/30 border border-slate-100 dark:border-slate-800/30 hover:shadow-md transition-all">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-100 dark:bg-slate-900/50 rounded-lg group-hover:scale-110 transition-transform">
                  <Scale className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">8. Limitation of Liability</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    We provide the service "as is" without warranties. We are not liable for indirect, incidental, or consequential damages. Our total liability is limited to the amount paid for services.
                  </p>
                </div>
              </div>
            </div>

            <div className="group p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 border border-indigo-100 dark:border-indigo-800/30 hover:shadow-md transition-all">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg group-hover:scale-110 transition-transform">
                  <Gavel className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-indigo-700 dark:text-indigo-300 mb-2">9. Governing Law</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    These terms are governed by the laws of the jurisdiction where our company is incorporated. Any disputes will be resolved through binding arbitration.
                  </p>
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
                    For questions about these terms, please contact us at <span className="font-medium text-orange-600 dark:text-cyan-400">info@coynful.com</span> or through our in-app support system.
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
