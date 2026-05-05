import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, ChevronRight, Calendar, Users, CreditCard, 
  Check, Loader2, X, Circle, Sofa
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Venue, VenueTable } from "@/hooks/useUserAppData";
import { format, addDays } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserProfile } from "@/hooks/useUserProfile";

interface TableBookingFlowProps {
  venue: Venue;
  tables: VenueTable[];
  preSelectedTable?: VenueTable;
  preSelectedDate?: Date;
  onClose: () => void;
  onSuccess: () => void;
}

type BookingStep = "guests" | "payment" | "confirmation";

// Default positions for floor plan visualization
const getTablePosition = (label: string, index: number) => {
  const positions: Record<string, { x: number; y: number; width: number; height: number }> = {
    "T1": { x: 10, y: 15, width: 18, height: 18 },
    "T2": { x: 35, y: 15, width: 18, height: 18 },
    "T3": { x: 60, y: 15, width: 18, height: 18 },
    "T4": { x: 10, y: 40, width: 18, height: 18 },
    "T5": { x: 35, y: 40, width: 18, height: 18 },
    "T6": { x: 60, y: 40, width: 18, height: 18 },
    "T7": { x: 10, y: 65, width: 18, height: 18 },
    "T8": { x: 35, y: 65, width: 18, height: 18 },
    "T9": { x: 60, y: 65, width: 18, height: 18 },
    "VIP 1": { x: 5, y: 85, width: 25, height: 12 },
    "VIP 2": { x: 35, y: 85, width: 25, height: 12 },
    "VIP 3": { x: 65, y: 85, width: 25, height: 12 },
  };
  
  if (positions[label]) return positions[label];
  
  // Fallback grid positioning
  const row = Math.floor(index / 3);
  const col = index % 3;
  return { 
    x: 10 + col * 30, 
    y: 15 + row * 25, 
    width: 18, 
    height: 18 
  };
};

export function TableBookingFlow({ venue, tables, preSelectedTable, preSelectedDate, onClose, onSuccess }: TableBookingFlowProps) {
  const { profile } = useUserProfile();
  const [currentStep, setCurrentStep] = useState<BookingStep>("guests");
  const [selectedDate] = useState<Date>(preSelectedDate || new Date());
  const [selectedTable] = useState<VenueTable | null>(preSelectedTable || null);
  const [guestCount, setGuestCount] = useState(2);
  const [notes, setNotes] = useState("");

  const createBookingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDate || !selectedTable) throw new Error("Missing booking details");

      const bookingId = `BK${Date.now().toString(36).toUpperCase()}`;
      
      // Determine status based on table's booking mode
      const requiresApproval = (selectedTable as any).requires_approval ?? false;
      const bookingStatus = requiresApproval ? "pending" : "confirmed";
      
      const { data, error } = await supabase
        .from("table_bookings")
        .insert({
          booking_id: bookingId,
          venue_id: venue.id,
          table_number: selectedTable.label,
          booking_date: format(selectedDate, "yyyy-MM-dd"),
          booking_time: "22:00",
          guest_name: profile.name,
          guest_email: profile.email || null,
          guest_phone: profile.phone ? `${profile.countryCode}${profile.phone}` : null,
          party_size: guestCount,
          price: selectedTable.base_price,
          notes: notes || null,
          status: bookingStatus,
        })
        .select()
        .single();

      if (error) throw error;
      return { booking: data, requiresApproval };
    },
    onSuccess: (result) => {
      setCurrentStep("confirmation");
    },
    onError: (error) => {
      toast.error("Failed to create booking: " + error.message);
    },
  });

  const steps: { id: BookingStep; label: string; icon: typeof Calendar }[] = [
    { id: "guests", label: "Details", icon: Users },
    { id: "payment", label: "Confirm", icon: CreditCard },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const canProceed = () => {
    switch (currentStep) {
      case "guests":
        return guestCount > 0;
      case "payment":
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep === "payment") {
      createBookingMutation.mutate();
    } else {
      const nextIndex = currentStepIndex + 1;
      if (nextIndex < steps.length) {
        setCurrentStep(steps[nextIndex].id);
      }
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  };

  if (currentStep === "confirmation") {
    const isRequestMode = (selectedTable as any)?.requires_approval ?? false;
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      >
        <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full text-center border border-gray-800">
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
            isRequestMode ? "bg-amber-500/20" : "bg-green-500/20"
          )}>
            <Check className={cn("w-8 h-8", isRequestMode ? "text-amber-500" : "text-green-500")} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {isRequestMode ? "Booking Request Sent!" : "Booking Confirmed!"}
          </h2>
          <p className="text-gray-400 mb-6">
            {isRequestMode 
              ? `Your table request at ${venue.name} for ${selectedDate && format(selectedDate, "EEEE, MMMM d")} has been sent. You'll be notified once confirmed.`
              : `Your table at ${venue.name} has been reserved for ${selectedDate && format(selectedDate, "EEEE, MMMM d")}.`
            }
          </p>
          <div className="bg-gray-800/50 rounded-xl p-4 mb-6 text-left">
            <div className="flex justify-between py-2 border-b border-gray-700">
              <span className="text-gray-400">Table</span>
              <span className="text-white font-medium">{selectedTable?.label}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-700">
              <span className="text-gray-400">Guests</span>
              <span className="text-white font-medium">{guestCount}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-700">
              <span className="text-gray-400">Status</span>
              <span className={cn("font-medium", isRequestMode ? "text-amber-500" : "text-green-500")}>
                {isRequestMode ? "Pending Approval" : "Confirmed"}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-400">Total</span>
              <span className="text-white font-bold">€{selectedTable?.base_price}</span>
            </div>
          </div>
          <button
            onClick={() => {
              onSuccess();
              onClose();
            }}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors"
          >
            View My Bookings
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="bg-gray-900 rounded-t-3xl md:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden border border-gray-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Book a Table</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                index <= currentStepIndex
                  ? "bg-primary text-primary-foreground"
                  : "bg-gray-800 text-gray-500"
              )}>
                {index < currentStepIndex ? (
                  <Check className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={cn(
                  "w-8 md:w-12 h-0.5 mx-1",
                  index < currentStepIndex ? "bg-primary" : "bg-gray-800"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          <AnimatePresence mode="wait">
            {/* Guest Details Step - Only number of guests and notes */}
            {currentStep === "guests" && (
              <motion.div
                key="guests"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-white font-semibold mb-4">Booking Details</h3>
                
                <div className="bg-gray-800/50 rounded-xl p-3 mb-4">
                  <p className="text-xs text-gray-400">Booking for</p>
                  <p className="text-white font-medium">{profile.name}</p>
                  <p className="text-sm text-gray-400">{profile.email}</p>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Number of Guests</label>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                      className="w-10 h-10 rounded-full bg-gray-800 text-white hover:bg-gray-700 transition-colors"
                    >
                      -
                    </button>
                    <span className="text-2xl font-bold text-white w-12 text-center">{guestCount}</span>
                    <button
                      onClick={() => setGuestCount(Math.min(selectedTable?.capacity || 10, guestCount + 1))}
                      className="w-10 h-10 rounded-full bg-gray-800 text-white hover:bg-gray-700 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Special Requests</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special requests or notes..."
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-primary resize-none"
                  />
                </div>
              </motion.div>
            )}


            {/* Payment/Confirmation Step */}
            {currentStep === "payment" && (
              <motion.div
                key="payment"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h3 className="text-white font-semibold mb-4">Review Your Booking</h3>
                
                <div className="bg-gray-800/50 rounded-xl p-4 mb-4">
                  <div className="flex justify-between py-2 border-b border-gray-700">
                    <span className="text-gray-400">Venue</span>
                    <span className="text-white font-medium">{venue.name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-700">
                    <span className="text-gray-400">Date</span>
                    <span className="text-white font-medium">
                      {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-700">
                    <span className="text-gray-400">Table</span>
                    <span className="text-white font-medium">{selectedTable?.label}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-700">
                    <span className="text-gray-400">Guests</span>
                    <span className="text-white font-medium">{guestCount}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-700">
                    <span className="text-gray-400">Name</span>
                    <span className="text-white font-medium">{profile.name}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-400">Deposit Required</span>
                    <span className="text-primary font-bold">
                      €{selectedTable && Math.round(selectedTable.base_price * (selectedTable.deposit_percent / 100))}
                    </span>
                  </div>
                </div>

                <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 mb-4">
                  <p className="text-sm text-primary">
                    By confirming this booking, you agree to the venue's cancellation policy. 
                    A deposit may be required to secure your reservation.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between p-4 border-t border-gray-800 bg-gray-900">
          <button
            onClick={currentStepIndex === 0 ? onClose : handleBack}
            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {currentStepIndex === 0 ? "Cancel" : "Back"}
          </button>
          
          <button
            onClick={handleNext}
            disabled={!canProceed() || createBookingMutation.isPending}
            className={cn(
              "flex items-center gap-2 px-6 py-2 rounded-xl font-medium transition-colors",
              canProceed()
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-gray-800 text-gray-500 cursor-not-allowed"
            )}
          >
            {createBookingMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : currentStep === "payment" ? (
              "Confirm Booking"
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
