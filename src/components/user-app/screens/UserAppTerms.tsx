import { motion } from "framer-motion";
import { ChevronLeft, FileText } from "lucide-react";

interface UserAppTermsProps {
  onBack: () => void;
}

export function UserAppTerms({ onBack }: UserAppTermsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen bg-background"
    >
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Terms & Conditions</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
          <FileText className="w-6 h-6 text-primary" />
          <div>
            <p className="font-medium">Last Updated</p>
            <p className="text-sm text-muted-foreground">January 2024</p>
          </div>
        </div>

        <div className="space-y-6 text-sm leading-relaxed">
          <section className="space-y-3">
            <h2 className="font-semibold text-base">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing and using the Niteways application, you accept and agree to be bound by 
              the terms and provisions of this agreement. If you do not agree to these terms, please 
              do not use our services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-base">2. User Account</h2>
            <p className="text-muted-foreground">
              To access certain features of the app, you must create an account. You are responsible 
              for maintaining the confidentiality of your account credentials and for all activities 
              that occur under your account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-base">3. Booking & Reservations</h2>
            <p className="text-muted-foreground">
              Table reservations and guest list sign-ups are subject to venue approval. We do not 
              guarantee availability of tables or entry to venues. Cancellation policies vary by venue 
              and are displayed at the time of booking.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-base">4. Payments</h2>
            <p className="text-muted-foreground">
              All payments are processed securely through our payment partners. Prices displayed are 
              subject to change without notice. Deposits may be required for certain reservations and 
              may be non-refundable.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-base">5. User Conduct</h2>
            <p className="text-muted-foreground">
              Users must conduct themselves appropriately when using our services and visiting partner 
              venues. Any violation of venue rules or local laws may result in account suspension and 
              denial of service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-base">6. Privacy</h2>
            <p className="text-muted-foreground">
              Your privacy is important to us. Please review our Privacy Policy to understand how we 
              collect, use, and protect your personal information.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-base">7. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              Niteways shall not be liable for any indirect, incidental, special, consequential, or 
              punitive damages resulting from your use or inability to use the service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-base">8. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these terms at any time. Continued use of the app after 
              changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-base">9. Contact</h2>
            <p className="text-muted-foreground">
              For questions about these Terms & Conditions, please contact us at legal@niteways.com.
            </p>
          </section>
        </div>
      </div>
    </motion.div>
  );
}
