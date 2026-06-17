import { Tables } from "@/lib/supabase/database.types";

type Card = Tables<"cards">;
type Profile = Tables<"profiles">;

export function parsePoint(coords: any): { lat: number; lng: number } | null {
  if (!coords) return null;
  if (typeof coords === "object" && "x" in coords && "y" in coords) {
    return { lat: coords.y, lng: coords.x };
  }
  if (typeof coords === "string") {
    const clean = coords.replace(/[()]/g, "");
    const parts = clean.split(",");
    if (parts.length === 2) {
      return { lat: parseFloat(parts[1]), lng: parseFloat(parts[0]) };
    }
  }
  return null;
}

export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates a match score between a collaboration Card and an Influencer Profile.
 *
 * Scoring rules:
 * 1. Intersection of Card niche tags and Influencer niches: +3 points per match
 * 2. Intersection of Card platform requirements and Influencer platforms: +2 points per match
 * 3. If Card min_followers <= Influencer follower_count: +2 points
 * 4. If Card category is in Influencer niches: +1 point
 * 5. Location requirement matching:
 *    - If required: Creator must match target regions or radius, else score = -999
 *    - Boosts: exact city/proximity <=25km (+5), state/proximity <=100km (+3), country (+1)
 */
export function calculateMatchScore(card: Card, influencer: Profile): number {
  let score = 0;

  // Rule 1: Niche tags intersection
  const cardNiches = card.niche_tags || [];
  const influencerNiches = influencer.niche || [];
  cardNiches.forEach((niche) => {
    if (influencerNiches.includes(niche)) {
      score += 3;
    }
  });

  // Rule 2: Platforms intersection
  const cardPlatforms = card.platform_requirements || [];
  const influencerPlatforms = influencer.platforms || [];
  cardPlatforms.forEach((platform) => {
    if (influencerPlatforms.includes(platform)) {
      score += 2;
    }
  });

  // Rule 3: Follower count check
  const cardMinFollowers = card.min_followers || 0;
  const influencerFollowers = influencer.follower_count || 0;
  if (influencerFollowers >= cardMinFollowers) {
    score += 2;
  }

  // Rule 4: Category in influencer niches
  if (influencerNiches.includes(card.category)) {
    score += 1;
  }

  // Rule 5: Location-Aware matching
  const locationReq = (card as any).location_requirement || "none";
  if (locationReq !== "none") {
    const locCountries = (card as any).location_countries || [];
    const locStates = (card as any).location_states || [];
    const locCities = (card as any).location_cities || [];
    const locRadiusKm = (card as any).location_radius_km;
    const locCoords = (card as any).location_coordinates;

    const infCountry = (influencer as any).location_country;
    const infState = (influencer as any).location_state;
    const infCity = (influencer as any).location_city;
    const infCoordsRaw = (influencer as any).location_coordinates;

    let matched = false;
    let locationBoost = 0;

    if (locRadiusKm && locCoords) {
      // Radius geofence mode
      const center = parsePoint(locCoords);
      const creatorLoc = parsePoint(infCoordsRaw);

      if (center && creatorLoc) {
        const dist = getDistance(center.lat, center.lng, creatorLoc.lat, creatorLoc.lng);
        if (dist <= locRadiusKm) {
          matched = true;
          if (dist <= 25) {
            locationBoost = 5;
          } else if (dist <= 100) {
            locationBoost = 3;
          } else {
            locationBoost = 1;
          }
        }
      }
    } else {
      // Specific regions mode
      const matchesCountry = infCountry && locCountries.some((c: string) => c.toLowerCase() === infCountry.toLowerCase());
      const matchesState = infState && locStates.some((s: string) => s.toLowerCase() === infState.toLowerCase());
      const matchesCity = infCity && locCities.some((c: string) => c.toLowerCase() === infCity.toLowerCase());

      if (matchesCountry || matchesState || matchesCity) {
        matched = true;
        if (matchesCity) {
          locationBoost = 5;
        } else if (matchesState) {
          locationBoost = 3;
        } else {
          locationBoost = 1;
        }
      }
    }

    if (locationReq === "required" && !matched) {
      return -999; // Location Lock Exclusion
    }

    score += locationBoost;
  }

  return score;
}

/**
 * Sorts cards based on match score in descending order, then falls back to creation date.
 */
export function sortCardsByMatch(cards: Card[], influencer: Profile): (Card & { matchScore: number })[] {
  return cards
    .map((card) => ({
      ...card,
      matchScore: calculateMatchScore(card, influencer),
    }))
    .filter((card) => card.matchScore !== -999) // exclude location locked cards
    .sort((a, b) => {
      // 1. Sort by score
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }
      // 2. Sort by date if scores are identical
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });
}
