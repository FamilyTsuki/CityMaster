export const MINOR_WAY_KEYWORDS = [
  "chemin",
  "chemins",
  "sentier",
  "sentiers",
  "ruelle",
  "ruelles",
  "passage",
  "passages",
  "allée",
  "allées",
  "impasse",
  "impasses",
  "traverse",
  "traverses",
  "chemain",
  "cour",
  "cours",
  "villa",
  "villas",
  "cité",
  "cités",
  "square",
  "squares",
];

export const MAJOR_WAY_TYPES = [
  "primary",
  "secondary",
  "trunk",
  "motorway",
  "tertiary",
];

/**
 * Service providing difficulty calculations for roads and districts.
 */
export class RouteDifficultyService {
  /**
   * Determines the difficulty level ('easy', 'medium', 'hard') for a route feature.
   * @param {object} feature GeoJSON Feature
   * @param {number} cityCentroidLat
   * @param {number} cityCentroidLng
   * @returns {'easy' | 'medium' | 'hard'}
   */
  static getRouteDifficulty(feature, cityCentroidLat, cityCentroidLng) {
    if (!feature || !feature.geometry) return "medium";

    const props = feature.properties || {};
    const name = (props.name || "").toLowerCase().trim();
    const highway = (props.highway || "").toLowerCase();

    // 1. Check for minor way keywords
    const isMinorKeyword = MINOR_WAY_KEYWORDS.some((kw) => {
      const regex = new RegExp(`\\b${kw}\\b`, "i");
      return regex.test(name);
    });

    if (
      isMinorKeyword ||
      highway === "living_street" ||
      highway === "pedestrian"
    ) {
      return "hard";
    }

    // 2. Check for major highway types
    if (MAJOR_WAY_TYPES.includes(highway)) {
      return "easy";
    }

    // 3. Distance from city centroid
    if (
      cityCentroidLat != null &&
      cityCentroidLng != null &&
      typeof turf !== "undefined"
    ) {
      try {
        const routeCentroid = turf.centroid(feature);
        const [lng, lat] = routeCentroid.geometry.coordinates;
        const distKm = turf.distance(
          turf.point([cityCentroidLng, cityCentroidLat]),
          turf.point([lng, lat]),
          { units: "kilometers" },
        );

        if (distKm <= 1.5) {
          return "easy";
        } else if (distKm <= 3.5) {
          return "medium";
        } else {
          return "hard";
        }
      } catch (e) {
        // Fallback if turf calculation fails
      }
    }

    return "medium";
  }

  /**
   * Classifies an array of route features with their calculated difficulty.
   * @param {Array<object>} features
   * @param {number} cityCentroidLat
   * @param {number} cityCentroidLng
   * @returns {Array<object>}
   */
  static classifyRoutes(features = [], cityCentroidLat, cityCentroidLng) {
    return features.map((feature) => {
      const difficulty = this.getRouteDifficulty(
        feature,
        cityCentroidLat,
        cityCentroidLng,
      );
      return {
        ...feature,
        properties: {
          ...feature.properties,
          difficulty,
        },
      };
    });
  }
}
