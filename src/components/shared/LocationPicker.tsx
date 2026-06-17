"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { countryCodeToFlag } from "@/lib/utils/location";
import { MapPin, Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface LocationValue {
  city: string;
  state: string;
  country: string;
  countryCode: string;
  area?: string;
  coordinates: { lat: number; lng: number };
  timezone: string;
  display: string;
}

interface LocationPickerProps {
  value: LocationValue | null;
  onChange: (location: LocationValue | null) => void;
  placeholder?: string;
  allowAreaInput?: boolean;
  required?: boolean;
}

export default function LocationPicker({
  value,
  onChange,
  placeholder = "Search your city...",
  allowAreaInput = true,
  required = false,
}: LocationPickerProps) {
  const supabase = createClient() as any;
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [area, setArea] = useState(value?.area || "");
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("location_cities")
          .select("*")
          .or(`city.ilike.%${query}%,state.ilike.%${query}%,country.ilike.%${query}%`)
          .order("population", { ascending: false })
          .limit(8);

        if (error) {
          console.error("Failed to fetch cities", error);
        } else {
          setSuggestions(data || []);
        }
      } catch (err) {
        console.error("Location search error", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query, supabase]);

  // Sync area text
  useEffect(() => {
    if (value) {
      setArea(value.area || "");
    } else {
      setArea("");
    }
  }, [value]);

  // Click outside close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (cityRow: any) => {
    const displayStr =
      cityRow.country_code === "IN"
        ? `${cityRow.city}, ${cityRow.state}`
        : `${cityRow.city}, ${cityRow.country}`;

    const newValue: LocationValue = {
      city: cityRow.city,
      state: cityRow.state,
      country: cityRow.country,
      countryCode: cityRow.country_code,
      area: area || undefined,
      coordinates: { lat: parseFloat(cityRow.latitude), lng: parseFloat(cityRow.longitude) },
      timezone: cityRow.timezone || "UTC",
      display: displayStr,
    };

    onChange(newValue);
    setQuery("");
    setIsOpen(false);
  };

  const handleAreaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setArea(val);
    if (value) {
      onChange({
        ...value,
        area: val || undefined,
      });
    }
  };

  const handleClear = () => {
    onChange(null);
    setQuery("");
    setArea("");
  };

  return (
    <div ref={containerRef} className="space-y-4 w-full">
      <div className="relative">
        <label className="block text-sm font-semibold text-[#fbfbef] mb-1.5">
          Where are you based? {required && <span className="text-red-500">*</span>}
        </label>

        {value ? (
          <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm">
            <div className="flex items-center gap-2.5 text-[#fbfbef]">
              <span className="text-base">{countryCodeToFlag(value.countryCode)}</span>
              <span className="font-medium">
                {value.area ? `${value.area}, ` : ""}
                {value.display}
              </span>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
              <Search className="h-4 w-4" />
            </span>
            <Input
              type="text"
              placeholder={placeholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              className="pl-10 pr-10 py-3 bg-black border border-zinc-800 text-[#fbfbef] placeholder-zinc-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fbfbef]/20 w-full"
            />
            {loading && (
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" />
              </span>
            )}

            {isOpen && (query || suggestions.length > 0) && (
              <div className="absolute z-50 w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                {loading && suggestions.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-zinc-500 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching cities...
                  </div>
                ) : suggestions.length > 0 ? (
                  suggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className="flex items-center gap-3 w-full px-4 py-3 text-left text-sm text-[#fbfbef] hover:bg-zinc-900 transition-colors border-b border-zinc-900 last:border-b-0"
                    >
                      <MapPin className="h-4 w-4 text-zinc-500 shrink-0" />
                      <div className="flex-1 truncate">
                        <span className="font-medium">{item.city}</span>
                        <span className="text-xs text-zinc-400 ml-1">
                          · {item.state}, {item.country}
                        </span>
                      </div>
                      <span className="text-base shrink-0">{countryCodeToFlag(item.country_code)}</span>
                    </button>
                  ))
                ) : (
                  query.trim() && (
                    <div className="px-4 py-3 text-sm text-zinc-500">
                      No matching cities found. Try another search.
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {allowAreaInput && value && (
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-400">
            Area / Locality (optional — e.g. Bandra, Koramangala)
          </label>
          <Input
            type="text"
            placeholder="e.g. Bandra"
            value={area}
            onChange={handleAreaChange}
            className="py-2.5 bg-black border border-zinc-800 text-[#fbfbef] placeholder-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fbfbef]/20 w-full text-sm"
          />
        </div>
      )}
    </div>
  );
}
