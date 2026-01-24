/**
 * One Rep Max (1RM) calculation utilities
 * 
 * Used to estimate the maximum weight a person can lift for one repetition
 * based on the weight and reps they can do for multiple repetitions.
 */

/**
 * Calculate estimated 1RM using the Brzycki formula
 * Most accurate for repetition ranges of 1-10
 * 
 * Formula: 1RM = weight × (36 / (37 - reps))
 * 
 * @param weight - Weight lifted in kg
 * @param reps - Number of repetitions performed
 * @returns Estimated 1RM in kg, or null if calculation is invalid
 */
export function calculateBrzycki1RM(weight: number, reps: number): number | null {
    // Brzycki formula breaks down above 37 reps
    if (reps <= 0 || reps >= 37 || weight <= 0) {
        return null;
    }

    // If reps === 1, the weight IS the 1RM
    if (reps === 1) {
        return weight;
    }

    return weight * (36 / (37 - reps));
}

/**
 * Calculate estimated 1RM using the Epley formula
 * Alternative formula, often considered more accurate for higher rep ranges
 * 
 * Formula: 1RM = weight × (1 + reps/30)
 * 
 * @param weight - Weight lifted in kg
 * @param reps - Number of repetitions performed
 * @returns Estimated 1RM in kg, or null if calculation is invalid
 */
export function calculateEpley1RM(weight: number, reps: number): number | null {
    if (reps <= 0 || weight <= 0) {
        return null;
    }

    // If reps === 1, the weight IS the 1RM
    if (reps === 1) {
        return weight;
    }

    return weight * (1 + reps / 30);
}

/**
 * Find the best estimated 1RM from a set of weight/rep combinations
 * Uses Brzycki formula
 * 
 * @param sets - Array of sets with weight and reps
 * @returns Best estimated 1RM, or null if no valid sets
 */
export function findBest1RM(sets: Array<{ weight?: number; reps?: number }>): number | null {
    let best1RM: number | null = null;

    for (const set of sets) {
        if (set.weight && set.reps) {
            const estimated = calculateBrzycki1RM(set.weight, set.reps);
            if (estimated !== null && (best1RM === null || estimated > best1RM)) {
                best1RM = estimated;
            }
        }
    }

    return best1RM ? Math.round(best1RM * 10) / 10 : null;
}
