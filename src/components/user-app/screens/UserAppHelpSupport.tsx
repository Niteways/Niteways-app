import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, HelpCircle, MessageCircle, FileQuestion, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface UserAppHelpSupportProps {
  onBack: () => void;
}

const faqs = [
  {
    question: "How do I book a table?",
    answer: "Navigate to a venue, select the 'Tables' tab, choose your preferred table from the floor map, select your date, and complete the booking form. You'll receive a confirmation once approved."
  },
  {
    question: "Can I cancel my booking?",
    answer: "Yes, you can cancel bookings from your Bookings page. Please note that cancellation policies vary by venue, and deposits may be non-refundable depending on timing."
  },
  {
    question: "How does the guest list work?",
    answer: "Sign up for a venue's guest list through the event or venue page. You'll receive confirmation when approved. Present your Member ID at the door for priority entry."
  },
  {
    question: "What are member loyalty levels?",
    answer: "Member levels (Bronze, Silver, Gold, Platinum) are earned through visits and spending. Higher levels unlock perks like priority booking, exclusive access, and discounts."
  },
  {
    question: "How do I purchase tickets?",
    answer: "Go to the Events page, select an event, choose your ticket type and quantity, then complete the purchase. E-tickets will be available in your Bookings section."
  },
  {
    question: "Can I change my booking date?",
    answer: "To change your booking, please cancel the existing booking and create a new one for your preferred date. Contact venue support if you need assistance."
  },
];

export function UserAppHelpSupport({ onBack }: UserAppHelpSupportProps) {
  const [activeTab, setActiveTab] = useState<"faq" | "chat">("faq");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitChat = async () => {
    if (!chatMessage.trim() || !email.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    // Simulate sending message
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success("Message sent! We'll respond within 24 hours.");
    setChatMessage("");
    setIsSubmitting(false);
  };

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
          <h1 className="text-lg font-semibold">Help & Support</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("faq")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors",
            activeTab === "faq"
              ? "text-primary border-primary"
              : "text-muted-foreground border-transparent"
          )}
        >
          <FileQuestion className="w-4 h-4" />
          FAQ
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors",
            activeTab === "chat"
              ? "text-primary border-primary"
              : "text-muted-foreground border-transparent"
          )}
        >
          <MessageCircle className="w-4 h-4" />
          Contact Us
        </button>
      </div>

      <div className="px-4 py-6">
        {activeTab === "faq" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              Find answers to commonly asked questions below.
            </p>
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-muted/30 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-primary shrink-0" />
                    <span className="font-medium text-sm">{faq.question}</span>
                  </div>
                  <ChevronRight className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform",
                    expandedFaq === index && "rotate-90"
                  )} />
                </button>
                {expandedFaq === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 pb-4"
                  >
                    <p className="text-sm text-muted-foreground pl-8">
                      {faq.answer}
                    </p>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-4">
              <MessageCircle className="w-12 h-12 text-primary mx-auto mb-3" />
              <h2 className="font-semibold mb-1">Need help?</h2>
              <p className="text-sm text-muted-foreground">
                Send us a message and we'll get back to you within 24 hours.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="bg-muted/50 border-border"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Describe your issue or question..."
                  className="bg-muted/50 border-border min-h-[150px]"
                />
              </div>

              <Button 
                className="w-full" 
                onClick={handleSubmitChat}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
