"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Search, MapPin, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Place {
  name: string
  coordinates: { lat: number; lng: number }
  country: string
  description: string
}

interface GeocodingResult {
  display_name: string
  lat: string
  lon: string
  type: string
  importance: number
}

const FAMOUS_PLACES: Place[] = [
  {
    name: "Jaipur",
    coordinates: { lat: 26.9124, lng: 75.7873 },
    country: "India",
    description: "The Pink City, capital of Rajasthan",
  },
  {
    name: "Paris",
    coordinates: { lat: 48.8566, lng: 2.3522 },
    country: "France",
    description: "City of Light, home to the Eiffel Tower",
  },
  {
    name: "Tokyo",
    coordinates: { lat: 35.6762, lng: 139.6503 },
    country: "Japan",
    description: "Modern metropolis and cultural hub",
  },
  {
    name: "New York",
    coordinates: { lat: 40.7128, lng: -74.006 },
    country: "USA",
    description: "The Big Apple, city that never sleeps",
  },
  {
    name: "London",
    coordinates: { lat: 51.5074, lng: -0.1278 },
    country: "UK",
    description: "Historic capital with royal heritage",
  },
  {
    name: "Sydney",
    coordinates: { lat: -33.8688, lng: 151.2093 },
    country: "Australia",
    description: "Harbor city with iconic Opera House",
  },
  {
    name: "Dubai",
    coordinates: { lat: 25.2048, lng: 55.2708 },
    country: "UAE",
    description: "Modern desert oasis and business hub",
  },
  {
    name: "Rome",
    coordinates: { lat: 41.9028, lng: 12.4964 },
    country: "Italy",
    description: "Eternal City with ancient history",
  },
  {
    name: "Cairo",
    coordinates: { lat: 30.0444, lng: 31.2357 },
    country: "Egypt",
    description: "Ancient city near the pyramids",
  },
  {
    name: "Rio de Janeiro",
    coordinates: { lat: -22.9068, lng: -43.1729 },
    country: "Brazil",
    description: "Marvelous city with Christ the Redeemer",
  },
]

interface PlaceSearchProps {
  onPlaceSelect: (place: Place) => void
  isVisible: boolean
}

export default function PlaceSearch({ onPlaceSelect, isVisible }: PlaceSearchProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [suggestions, setSuggestions] = useState<Place[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const geocodePlace = async (query: string): Promise<Place[]> => {
    try {
      console.log(`[v0] Geocoding search for: ${query}`)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
      )

      if (!response.ok) {
        throw new Error("Geocoding request failed")
      }

      const results: GeocodingResult[] = await response.json()
      console.log(`[v0] Geocoding results:`, results)

      return results.map((result) => {
        // Extract place name and country from display_name
        const parts = result.display_name.split(", ")
        const placeName = parts[0]
        const country = parts[parts.length - 1]

        return {
          name: placeName,
          coordinates: {
            lat: Number.parseFloat(result.lat),
            lng: Number.parseFloat(result.lon),
          },
          country: country,
          description: `${result.type} - ${result.display_name.split(", ").slice(1, 3).join(", ")}`,
        }
      })
    } catch (error) {
      console.error("[v0] Geocoding error:", error)
      return []
    }
  }

  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (searchQuery.trim() === "") {
      setSuggestions([])
      setShowSuggestions(false)
      setIsLoading(false)
      return
    }

    const localMatches = FAMOUS_PLACES.filter(
      (place) =>
        place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.description.toLowerCase().includes(searchQuery.toLowerCase()),
    )

    if (localMatches.length > 0) {
      setSuggestions(localMatches)
      setShowSuggestions(true)
      setIsLoading(false)
    } else {
      setIsLoading(true)
      debounceTimerRef.current = setTimeout(async () => {
        const geocodedResults = await geocodePlace(searchQuery)
        setSuggestions(geocodedResults)
        setShowSuggestions(geocodedResults.length > 0)
        setIsLoading(false)
      }, 800) // 800ms debounce to avoid too many API calls
    }
  }, [searchQuery])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
        setIsSearchFocused(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const handlePlaceSelect = (place: Place) => {
    console.log(
      `[v0] Place selected: ${place.name}, ${place.country} at ${place.coordinates.lat}, ${place.coordinates.lng}`,
    )
    setSearchQuery(place.name)
    setShowSuggestions(false)
    setIsSearchFocused(false)
    setIsLoading(false)
    onPlaceSelect(place)
  }

  const clearSearch = () => {
    setSearchQuery("")
    setSuggestions([])
    setShowSuggestions(false)
    setIsLoading(false)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    if (searchRef.current) {
      searchRef.current.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && suggestions.length > 0 && !isLoading) {
      handlePlaceSelect(suggestions[0])
    } else if (e.key === "Escape") {
      setShowSuggestions(false)
      setIsSearchFocused(false)
    }
  }

  if (!isVisible) return null

  return (
    <div className="relative">
      <div className="relative">
        <div className="relative flex items-center">
          {isLoading ? (
            <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60 z-10 animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60 z-10" />
          )}
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              setIsSearchFocused(true)
              if (suggestions.length > 0) setShowSuggestions(true)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search any place in the world..."
            className="w-full pl-10 pr-10 py-3 bg-black/50 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-white/40 focus:bg-black/70 transition-all"
          />
          {searchQuery && (
            <Button
              onClick={clearSearch}
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 w-8 h-8 p-0 text-white/60 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-2 bg-black/80 backdrop-blur-sm border border-white/20 rounded-lg overflow-hidden z-50 max-h-64 overflow-y-auto"
        >
          {suggestions.map((place, index) => (
            <button
              key={`${place.name}-${place.country}-${index}`}
              onClick={() => handlePlaceSelect(place)}
              className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors border-b border-white/10 last:border-b-0 focus:outline-none focus:bg-white/10"
            >
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{place.name}</span>
                    <span className="text-white/60 text-sm">{place.country}</span>
                  </div>
                  <p className="text-white/70 text-sm mt-1 truncate">{place.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showSuggestions && suggestions.length === 0 && searchQuery.trim() !== "" && !isLoading && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-2 bg-black/80 backdrop-blur-sm border border-white/20 rounded-lg p-4 z-50"
        >
          <div className="text-center text-white/70">
            <MapPin className="w-6 h-6 mx-auto mb-2 text-white/40" />
            <p className="text-sm">No places found for "{searchQuery}"</p>
            <p className="text-xs text-white/50 mt-1">Try searching for cities, countries, or landmarks worldwide</p>
          </div>
        </div>
      )}

      {isLoading && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-2 bg-black/80 backdrop-blur-sm border border-white/20 rounded-lg p-4 z-50"
        >
          <div className="text-center text-white/70">
            <Loader2 className="w-6 h-6 mx-auto mb-2 text-white/40 animate-spin" />
            <p className="text-sm">Searching worldwide...</p>
          </div>
        </div>
      )}
    </div>
  )
}
