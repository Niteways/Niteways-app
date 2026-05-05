import { motion } from "framer-motion";
import { ChevronLeft, Globe, Instagram, Mail, ExternalLink } from "lucide-react";

interface UserAppAboutProps {
  onBack: () => void;
}

export function UserAppAbout({ onBack }: UserAppAboutProps) {
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
          <h1 className="text-lg font-semibold">About Niteways</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Logo & Brand */}
        <div className="text-center py-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <span className="text-3xl font-bold text-primary-foreground">N</span>
          </div>
          <h2 className="text-2xl font-bold">Niteways</h2>
          <p className="text-muted-foreground mt-1">Your nightlife companion</p>
        </div>

        {/* Description */}
        <div className="bg-muted/30 rounded-xl p-5 space-y-4">
          <p className="text-foreground leading-relaxed">
            Niteways is the ultimate platform for discovering the best nightlife experiences. 
            From exclusive clubs and lounges to unforgettable events, we connect you with 
            the most sought-after venues in your city.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Book VIP tables, skip the line with guest lists, purchase tickets to events, 
            and earn rewards through our loyalty program. Experience nightlife like never before.
          </p>
        </div>

        {/* Features */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Features</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { title: "Table Booking", desc: "Reserve VIP tables" },
              { title: "Guest Lists", desc: "Skip the queue" },
              { title: "Event Tickets", desc: "Secure your spot" },
              { title: "Member Rewards", desc: "Earn points & perks" },
            ].map((feature) => (
              <div key={feature.title} className="bg-muted/30 rounded-lg p-4">
                <p className="font-medium text-sm">{feature.title}</p>
                <p className="text-xs text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Links */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Connect</h3>
          <div className="space-y-2">
            <a 
              href="https://niteways.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <Globe className="w-5 h-5 text-primary" />
              <span className="flex-1">Website</span>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
            <a 
              href="https://instagram.com/niteways" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <Instagram className="w-5 h-5 text-primary" />
              <span className="flex-1">Instagram</span>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
            <a 
              href="mailto:hello@niteways.com"
              className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <Mail className="w-5 h-5 text-primary" />
              <span className="flex-1">Contact Us</span>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
          </div>
        </div>

        {/* Version */}
        <div className="text-center pt-8 pb-4">
          <p className="text-xs text-muted-foreground">Version 1.0.0</p>
          <p className="text-xs text-muted-foreground mt-1">© 2024 Niteways. All rights reserved.</p>
        </div>
      </div>
    </motion.div>
  );
}
