import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface MemberIdCardProps {
  name: string;
  guestId: string;
  loyaltyLevel: "bronze" | "silver" | "gold" | "platinum";
  avatarUrl?: string;
  className?: string;
  size?: "default" | "large";
}

// Colors matching the reference screenshots exactly
const loyaltyStyles = {
  bronze: {
    gradientFrom: "hsl(20, 40%, 25%)",
    gradientVia: "hsl(25, 35%, 30%)",
    gradientTo: "hsl(20, 45%, 20%)",
    ringColor: "#d97706",
    textAccent: "text-orange-500",
    labelColor: "text-orange-500",
  },
  silver: {
    gradientFrom: "hsl(240, 5%, 26%)",
    gradientVia: "hsl(240, 5%, 30%)",
    gradientTo: "hsl(240, 5%, 22%)",
    ringColor: "#9ca3af",
    textAccent: "text-zinc-300",
    labelColor: "text-zinc-300",
  },
  gold: {
    gradientFrom: "hsl(45, 50%, 25%)",
    gradientVia: "hsl(50, 45%, 35%)",
    gradientTo: "hsl(45, 55%, 20%)",
    ringColor: "#eab308",
    textAccent: "text-yellow-500",
    labelColor: "text-yellow-500",
  },
  platinum: {
    gradientFrom: "hsl(270, 35%, 25%)",
    gradientVia: "hsl(275, 30%, 30%)",
    gradientTo: "hsl(270, 40%, 20%)",
    ringColor: "#a855f7",
    textAccent: "text-purple-400",
    labelColor: "text-purple-400",
  },
};

export function MemberIdCard({ 
  name, 
  guestId, 
  loyaltyLevel, 
  avatarUrl,
  className,
  size = "default"
}: MemberIdCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const style = loyaltyStyles[loyaltyLevel];
  
  // Card dimensions based on size
  const cardWidth = size === "large" ? 360 : 320;
  const cardHeight = size === "large" ? 220 : 200;
  const avatarSize = size === "large" ? "w-24 h-24" : "w-20 h-20";
  const nameSize = size === "large" ? "text-2xl" : "text-xl";
  const statusSize = size === "large" ? "text-2xl" : "text-xl";
  
  // Get initials from name
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  // Generate a deterministic QR code pattern based on guestId
  const qrPattern = useMemo(() => {
    const patterns = [];
    const seed = guestId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // QR code is typically 21x21 for version 1, we'll use 15x15 for visual simplicity
    const qrSize = 15;
    
    for (let y = 0; y < qrSize; y++) {
      for (let x = 0; x < qrSize; x++) {
        // Corner patterns (finder patterns) - always filled
        const isTopLeftCorner = x < 4 && y < 4;
        const isTopRightCorner = x >= qrSize - 4 && y < 4;
        const isBottomLeftCorner = x < 4 && y >= qrSize - 4;
        
        // Corner pattern logic - outer ring filled, inner empty, center filled
        let isCornerPattern = false;
        if (isTopLeftCorner || isTopRightCorner || isBottomLeftCorner) {
          const cornerX = isTopRightCorner ? x - (qrSize - 4) : x;
          const cornerY = isBottomLeftCorner ? y - (qrSize - 4) : y;
          
          // Outer ring
          if (cornerX === 0 || cornerX === 3 || cornerY === 0 || cornerY === 3) {
            isCornerPattern = true;
          }
          // Center dot
          else if (cornerX >= 1 && cornerX <= 2 && cornerY >= 1 && cornerY <= 2) {
            isCornerPattern = cornerX === 1 && cornerY === 1 || cornerX === 2 && cornerY === 2;
          }
        }
        
        // Data area - use deterministic pattern based on seed
        const hash = ((seed * (x + 1) * (y + 1) + x * 7 + y * 13) % 100);
        const isFilled = isCornerPattern || (hash > 45 && !isTopLeftCorner && !isTopRightCorner && !isBottomLeftCorner);
        
        patterns.push({ x, y, filled: isFilled });
      }
    }
    return patterns;
  }, [guestId]);

  return (
    <div 
      className={cn("relative cursor-pointer", className)}
      style={{ 
        width: `${cardWidth}px`, 
        height: `${cardHeight}px`,
        perspective: "1000px",
      }}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      {/* Front Side - visible when not flipped */}
      <motion.div
        className="absolute inset-0 rounded-2xl overflow-hidden shadow-xl"
        style={{
          background: `linear-gradient(135deg, ${style.gradientFrom}, ${style.gradientVia}, ${style.gradientTo})`,
        }}
        initial={false}
        animate={{
          rotateY: isFlipped ? 180 : 0,
          opacity: isFlipped ? 0 : 1,
        }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
      >
        {/* Decorative blurred circles for gold/bronze */}
        {(loyaltyLevel === 'gold' || loyaltyLevel === 'bronze') && (
          <>
            <div className="absolute top-10 right-10 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute bottom-0 left-20 w-32 h-32 rounded-full bg-white/5 blur-xl" />
          </>
        )}
        
        {/* Content */}
        <div className="relative z-10 h-full p-5 flex flex-col">
          {/* Top row - Avatar + Member Status */}
          <div className="flex justify-between items-start mb-auto">
            {/* Avatar Circle with colored ring */}
            <div 
              className={cn(
                "rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center",
                avatarSize
              )}
              style={{ 
                border: `3px solid ${style.ringColor}`,
                background: 'linear-gradient(135deg, #52525b, #3f3f46)',
              }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-semibold text-zinc-400">
                  {getInitials(name)}
                </span>
              )}
            </div>
            
            {/* Member Status - Right side */}
            <div className="text-right">
              <p className="text-xs text-zinc-400 uppercase tracking-wider font-medium">Member Status</p>
              <p className={cn("font-bold capitalize", statusSize, style.textAccent)}>
                {loyaltyLevel.charAt(0).toUpperCase() + loyaltyLevel.slice(1)}
              </p>
            </div>
          </div>
          
          {/* Bottom row - Name and IDs */}
          <div className="mt-auto">
            <h2 className={cn("font-bold text-white leading-tight", nameSize)}>
              {name}
            </h2>
            <div className="flex items-center justify-between mt-1">
              <p className="text-zinc-400 text-sm font-mono">{guestId}</p>
              <p className="text-zinc-500 text-xs uppercase tracking-wider font-medium">NITEWAYS</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Back Side - Same gold gradient with QR Code and Member ID */}
      <motion.div 
        className="absolute inset-0 rounded-2xl overflow-hidden shadow-xl"
        style={{
          background: `linear-gradient(135deg, ${style.gradientFrom}, ${style.gradientVia}, ${style.gradientTo})`,
        }}
        initial={false}
        animate={{
          rotateY: isFlipped ? 0 : -180,
          opacity: isFlipped ? 1 : 0,
        }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
      >
        {/* Decorative blurred circles for gold/bronze */}
        {(loyaltyLevel === 'gold' || loyaltyLevel === 'bronze') && (
          <>
            <div className="absolute top-10 right-10 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute bottom-0 left-20 w-32 h-32 rounded-full bg-white/5 blur-xl" />
          </>
        )}
        
        {/* Content - Only QR and Member ID - Same gradient background */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center p-4">
          {/* QR Code Container - smaller to fit */}
          <div className="bg-white rounded-xl p-3 shadow-lg">
            <div 
              className="grid gap-[1px]"
              style={{
                gridTemplateColumns: `repeat(15, 1fr)`,
                width: size === "large" ? "120px" : "100px",
                height: size === "large" ? "120px" : "100px",
              }}
            >
              {qrPattern.map((cell, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "aspect-square",
                    cell.filled ? "bg-black" : "bg-white"
                  )}
                />
              ))}
            </div>
          </div>
          
          {/* Member ID Only - Clear and prominent */}
          <p className="text-white font-mono text-lg font-bold tracking-wider mt-4">{guestId}</p>
          <p className="text-zinc-400 text-xs uppercase tracking-wider mt-1">NITEWAYS</p>
        </div>
      </motion.div>
    </div>
  );
}