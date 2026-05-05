import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  variant: "gold" | "teal" | "coral" | "purple";
  trend?: {
    value: number;
    label: string;
  };
  delay?: number;
}

const variantStyles = {
  gold: "stat-card-gold",
  teal: "stat-card-teal",
  coral: "stat-card-coral",
  purple: "bg-gradient-to-br from-purple to-purple/80",
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant,
  trend,
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn("stat-card", variantStyles[variant])}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="w-8 h-8 rounded-lg bg-black/10 flex items-center justify-center">
              <Icon className="w-4 h-4 text-inherit" />
            </div>
          )}
          <h3 className="text-sm font-medium text-black/70">{title}</h3>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-4xl font-bold text-black tracking-tight">{value}</p>
        {subtitle && (
          <p className="text-sm text-black/60 mt-1">{subtitle}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            <span
              className={cn(
                "text-sm font-medium",
                trend.value > 0 ? "text-green-800" : "text-red-800"
              )}
            >
              {trend.value > 0 ? "+" : ""}
              {trend.value}%
            </span>
            <span className="text-xs text-black/50">{trend.label}</span>
          </div>
        )}
      </div>

      {/* Progress indicator dots */}
      <div className="flex items-center gap-1 mt-4">
        <div className="w-16 h-1 rounded-full bg-black/20">
          <div className="w-3/4 h-full rounded-full bg-black/40" />
        </div>
        <div className="w-2 h-2 rounded-full bg-black/30" />
      </div>
    </motion.div>
  );
}
