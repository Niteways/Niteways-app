import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Ticket, Plus, Minus, CreditCard, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRealtimeTicketPurchases } from "@/hooks/useRealtimeTicketPurchases";

interface TicketType {
  id: string;
  name: string;
  price: number;
  available: number;
  sold: number;
  description?: string;
}

interface TicketPurchaseFlowProps {
  eventId: string;
  eventName: string;
  eventDate: string;
  venueId: string;
  ticketTypes: TicketType[];
  onClose: () => void;
  onSuccess: () => void;
}

export function TicketPurchaseFlow({
  eventId,
  eventName,
  eventDate,
  venueId,
  ticketTypes,
  onClose,
  onSuccess,
}: TicketPurchaseFlowProps) {
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});
  const [step, setStep] = useState<"select" | "details" | "confirm">("select");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { addPurchase } = useRealtimeTicketPurchases({ venueId });

  const totalTickets = Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);
  const totalPrice = Object.entries(selectedTickets).reduce((sum, [id, qty]) => {
    const ticket = ticketTypes.find(t => t.id === id);
    return sum + (ticket?.price || 0) * qty;
  }, 0);

  const adjustQuantity = (ticketId: string, delta: number) => {
    setSelectedTickets(prev => {
      const current = prev[ticketId] || 0;
      const ticket = ticketTypes.find(t => t.id === ticketId);
      const available = ticket ? ticket.available - ticket.sold : 0;
      const newQty = Math.max(0, Math.min(current + delta, available, 10));
      
      if (newQty === 0) {
        const { [ticketId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [ticketId]: newQty };
    });
  };

  const handleContinue = () => {
    if (totalTickets === 0) {
      toast.error("Please select at least one ticket");
      return;
    }
    setStep("details");
  };

  const handlePurchase = async () => {
    if (!guestName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create purchase for each ticket type
      for (const [ticketId, quantity] of Object.entries(selectedTickets)) {
        if (quantity <= 0) continue;
        
        const ticket = ticketTypes.find(t => t.id === ticketId);
        if (!ticket) continue;

        await addPurchase({
          venue_id: venueId,
          ticket_id: `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          guest_name: guestName,
          guest_email: guestEmail || null,
          guest_id: null,
          ticket_type: ticket.name,
          event_name: eventName,
          event_date: eventDate,
          quantity: quantity,
          price: ticket.price,
          status: "confirmed",
        });
      }

      toast.success("Tickets purchased successfully!");
      onSuccess();
    } catch (error) {
      console.error("Purchase failed:", error);
      toast.error("Failed to complete purchase. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-800 shrink-0">
        <button
          onClick={() => step === "select" ? onClose() : setStep("select")}
          className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-white">
            {step === "select" ? "Select Tickets" : step === "details" ? "Your Details" : "Confirm"}
          </h2>
          <p className="text-xs text-gray-400">{eventName}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {step === "select" && (
          <div className="space-y-4">
            {ticketTypes.map((ticket) => {
              const remaining = ticket.available - ticket.sold;
              const isSoldOut = remaining <= 0;
              const quantity = selectedTickets[ticket.id] || 0;

              return (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "p-4 rounded-xl border transition-all",
                    isSoldOut 
                      ? "border-red-500/30 bg-red-500/5 opacity-60" 
                      : quantity > 0 
                        ? "border-primary bg-primary/5" 
                        : "border-gray-700 bg-gray-900/50"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-white">{ticket.name}</h3>
                      {ticket.description && (
                        <p className="text-sm text-gray-400 mt-1">{ticket.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-primary">€{ticket.price}</p>
                      <p className="text-xs text-gray-500">
                        {isSoldOut ? "Sold Out" : `${remaining} left`}
                      </p>
                    </div>
                  </div>

                  {!isSoldOut && (
                    <div className="flex items-center justify-end gap-3 mt-3">
                      <button
                        onClick={() => adjustQuantity(ticket.id, -1)}
                        className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center disabled:opacity-50"
                        disabled={quantity === 0}
                      >
                        <Minus className="w-4 h-4 text-white" />
                      </button>
                      <span className="w-8 text-center text-white font-semibold">{quantity}</span>
                      <button
                        onClick={() => adjustQuantity(ticket.id, 1)}
                        className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center disabled:opacity-50"
                        disabled={quantity >= Math.min(remaining, 10)}
                      >
                        <Plus className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {step === "details" && (
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="p-4 rounded-xl border border-gray-700 bg-gray-900/50 space-y-3">
              <h3 className="font-semibold text-white">Order Summary</h3>
              {Object.entries(selectedTickets).map(([id, qty]) => {
                const ticket = ticketTypes.find(t => t.id === id);
                if (!ticket || qty <= 0) return null;
                return (
                  <div key={id} className="flex justify-between text-sm">
                    <span className="text-gray-400">{ticket.name} x {qty}</span>
                    <span className="text-white">€{ticket.price * qty}</span>
                  </div>
                );
              })}
              <div className="border-t border-gray-700 pt-3 flex justify-between">
                <span className="font-semibold text-white">Total</span>
                <span className="font-bold text-primary text-lg">€{totalPrice}</span>
              </div>
            </div>

            {/* Guest Details */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Full Name *</Label>
                <Input
                  placeholder="Enter your name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Email (for confirmation)</Label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800 shrink-0">
        {step === "select" ? (
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-400">{totalTickets} ticket{totalTickets !== 1 ? "s" : ""}</p>
              <p className="text-xl font-bold text-white">€{totalPrice}</p>
            </div>
            <Button
              onClick={handleContinue}
              disabled={totalTickets === 0}
              className="px-8 bg-primary hover:bg-primary/90"
            >
              Continue
            </Button>
          </div>
        ) : (
          <Button
            onClick={handlePurchase}
            disabled={isSubmitting || !guestName.trim()}
            className="w-full gap-2 bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                Pay €{totalPrice}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
