import { motion } from "framer-motion";
import { Calendar, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Event {
  id: string;
  name: string;
  date: string;
  venue: string;
  guests: number;
  status: "live" | "upcoming" | "planning";
}

const events: Event[] = [
  {
    id: "1",
    name: "Saturday Night Fever",
    date: "Tonight",
    venue: "Main Floor",
    guests: 342,
    status: "live",
  },
  {
    id: "2",
    name: "VIP Private Party",
    date: "Tomorrow",
    venue: "Rooftop Lounge",
    guests: 85,
    status: "upcoming",
  },
  {
    id: "3",
    name: "New Year's Eve 2025",
    date: "Dec 31",
    venue: "All Venues",
    guests: 1200,
    status: "planning",
  },
];

const statusStyles = {
  live: "bg-teal/20 text-teal border-teal/30",
  upcoming: "bg-gold/20 text-gold border-gold/30",
  planning: "bg-muted text-muted-foreground border-border",
};

export function UpcomingEvents() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.6 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Events</h3>
        <button className="text-sm text-primary hover:underline">View all</button>
      </div>

      <div className="space-y-4">
        {events.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.7 + index * 0.1 }}
            className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-foreground">{event.name}</h4>
                <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {event.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {event.venue}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {event.guests}
                  </span>
                </div>
              </div>
              <Badge
                variant="outline"
                className={statusStyles[event.status]}
              >
                {event.status === "live" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-teal mr-1.5 animate-pulse" />
                )}
                {event.status}
              </Badge>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
