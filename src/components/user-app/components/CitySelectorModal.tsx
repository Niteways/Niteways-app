import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, X, ChevronRight, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { City } from "@/hooks/useUserAppData";

interface CitySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  cities: City[];
  selectedCity?: City;
  onCitySelect: (cityId: string | undefined) => void;
}

export function CitySelectorModal({
  isOpen,
  onClose,
  cities,
  selectedCity,
  onCitySelect,
}: CitySelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter cities based on search
  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) return cities;
    const query = searchQuery.toLowerCase();
    return cities.filter(
      (city) =>
        city.name.toLowerCase().includes(query) ||
        city.country.toLowerCase().includes(query)
    );
  }, [cities, searchQuery]);

  // Group cities by country
  const citiesByCountry = useMemo(() => {
    const grouped: Record<string, City[]> = {};
    filteredCities.forEach((city) => {
      if (!grouped[city.country]) {
        grouped[city.country] = [];
      }
      grouped[city.country].push(city);
    });
    return grouped;
  }, [filteredCities]);

  const handleSelect = (cityId: string | undefined) => {
    onCitySelect(cityId);
    onClose();
    setSearchQuery("");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background flex flex-col"
        >
          {/* Header */}
          <div className="shrink-0 bg-background">
            <div className="flex items-center justify-between px-4 pt-6 pb-3">
              <h2 className="text-xl font-bold text-foreground">Select City</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="px-4 pb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search cities or countries..."
                  className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  autoFocus
                />
              </div>
            </div>

            {/* Current Selection - Always fully visible, never cut off */}
            {selectedCity && !searchQuery && (
              <div className="px-4 pb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-3">
                  Currently Selected
                </p>
                <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-xl border border-primary/30">
                  <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-primary">{selectedCity.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedCity.country}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-border" />
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto flex-1 pb-20">

            {/* All Cities */}
            <div className="px-4 py-3">
              {!searchQuery && (
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
                  All Cities
                </p>
              )}

              {/* City List by Country */}
              {Object.keys(citiesByCountry).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(citiesByCountry).map(([country, countryCities]) => (
                    <div key={country}>
                      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                        <Globe className="w-3 h-3" />
                        {country}
                      </p>
                      <div className="space-y-1">
                        {countryCities.map((city) => (
                          <motion.button
                            key={city.id}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleSelect(city.id)}
                            className={cn(
                              "w-full flex items-center gap-3 p-3 rounded-xl transition-colors",
                              selectedCity?.id === city.id
                                ? "bg-primary/10 border border-primary/30"
                                : "hover:bg-muted/50"
                            )}
                          >
                            <div
                              className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center",
                                selectedCity?.id === city.id
                                  ? "bg-primary/20"
                                  : "bg-muted"
                              )}
                            >
                              <MapPin
                                className={cn(
                                  "w-5 h-5",
                                  selectedCity?.id === city.id
                                    ? "text-primary"
                                    : "text-muted-foreground"
                                )}
                              />
                            </div>
                            <div className="flex-1 text-left">
                              <p
                                className={cn(
                                  "font-medium",
                                  selectedCity?.id === city.id
                                    ? "text-primary"
                                    : "text-foreground"
                                )}
                              >
                              {city.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {city.country}
                              </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">No cities found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try a different search term
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
