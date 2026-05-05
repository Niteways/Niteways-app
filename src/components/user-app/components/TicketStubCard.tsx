import { useState } from "react";
import { motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface TicketStubCardProps {
  ticket: {
    id: string;
    name: string;
    price: number;
    description: string | null;
    type: string;
    available: number;
    soldOut: boolean;
  };
  selectedDate: Date;
  onPurchase: (quantity: number) => void;
}

export function TicketStubCard({ ticket, selectedDate, onPurchase }: TicketStubCardProps) {
  const [quantity, setQuantity] = useState(0);

  const increment = () => {
    if (!ticket.soldOut && quantity < ticket.available) {
      setQuantity(q => q + 1);
    }
  };

  const decrement = () => {
    if (quantity > 0) {
      setQuantity(q => q - 1);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      {/* Ticket stub shape with notches */}
      <div
        className={cn(
          "relative rounded-2xl overflow-hidden",
          ticket.soldOut ? "opacity-60" : ""
        )}
      >
        {/* Notch cutouts on the sides */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-background z-10" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-5 h-5 rounded-full bg-background z-10" />

        {/* Main card body */}
        <div className="bg-muted/30 border border-border p-5">
          {/* Top row: Name + Price */}
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-lg text-foreground leading-tight">{ticket.name}</h4>
                {ticket.type === "special" && (
                  <Badge variant="outline" className="text-[10px] bg-primary/20 text-primary border-primary/30">
                    Special
                  </Badge>
                )}
                {ticket.soldOut && (
                  <Badge variant="destructive" className="text-xs font-bold">
                    SOLD OUT
                  </Badge>
                )}
              </div>
            </div>
            <p className={cn(
              "text-2xl font-extrabold shrink-0",
              ticket.soldOut ? "text-muted-foreground line-through" : "text-foreground"
            )}>
              €{ticket.price.toFixed(2)}
            </p>
          </div>

          {/* Description preview */}
          {ticket.description && (
            <p className="text-sm text-muted-foreground mb-3">{ticket.description}</p>
          )}

          {/* Dashed separator */}
          <div className="border-t border-dashed border-border my-3" />

          {/* Bottom row: Date label + Quantity selector */}
          <div className="flex items-center justify-between">
            {/* Date label */}
            <p className="text-xs text-muted-foreground">
              For {format(selectedDate, "EEEE, d MMM yyyy")}
            </p>

            {/* Quantity selector */}
            {!ticket.soldOut && (
              <div className="flex items-center gap-3">
                <button
                  onClick={decrement}
                  disabled={quantity === 0}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                    quantity === 0
                      ? "bg-muted/30 text-muted-foreground"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  )}
                >
                  <Minus className="w-5 h-5" />
                </button>
                <span className="text-lg font-bold text-foreground w-6 text-center">{quantity}</span>
                <button
                  onClick={increment}
                  disabled={quantity >= ticket.available}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                    quantity >= ticket.available
                      ? "bg-muted/30 text-muted-foreground"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  )}
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Buy button - appears when quantity > 0 */}
          {quantity > 0 && (
            <motion.button
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => onPurchase(quantity)}
              className="w-full mt-4 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              Buy {quantity} × €{ticket.price.toFixed(2)} = €{(quantity * ticket.price).toFixed(2)}
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
