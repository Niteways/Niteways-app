import { useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MobileStatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  variant: "gold" | "teal" | "coral" | "purple";
}

const variantStyles = {
  gold: "stat-card-gold",
  teal: "stat-card-teal",
  coral: "stat-card-coral",
  purple: "bg-gradient-to-br from-purple to-purple/80",
};

export function MobileStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant,
}: MobileStatCardProps) {
  return (
    <div
      className={cn(
        "flex-shrink-0 w-[75vw] max-w-[280px] p-4 rounded-xl snap-center",
        variantStyles[variant]
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-black/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-black/70" />
        </div>
        <h3 className="text-sm font-medium text-black/70">{title}</h3>
      </div>
      <p className="text-3xl font-bold text-black tracking-tight">{value}</p>
      {subtitle && (
        <p className="text-sm text-black/60 mt-1">{subtitle}</p>
      )}
    </div>
  );
}

interface MobileStatsCarouselProps {
  stats: MobileStatCardProps[];
}

export function MobileStatsCarousel({ stats }: MobileStatsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative -mx-4">
      <motion.div
        ref={scrollRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-4 px-4 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {stats.map((stat, index) => (
          <MobileStatCard key={index} {...stat} />
        ))}
      </motion.div>
      
      {/* Scroll indicators */}
      <div className="flex justify-center gap-1.5 mt-2">
        {stats.map((_, index) => (
          <div
            key={index}
            className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30"
          />
        ))}
      </div>
    </div>
  );
}
