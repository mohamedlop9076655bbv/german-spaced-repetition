// Improved SM-2 Algorithm Implementation

export interface SM2Data {
  interval: number; // in days
  repetition: number;
  easeFactor: number;
  nextReviewDate: string; // ISO string
}

export const calculateSM2 = (
  quality: number,
  repetition: number,
  interval: number, // current interval in days
  easeFactor: number
): SM2Data => {
  let nextInterval = interval;
  let nextRepetition = repetition;
  let nextEaseFactor = easeFactor;
  let nextReviewDate = new Date();

  // "Again" (Failed)
  if (quality === 1) {
    nextRepetition = 0;
    nextInterval = 0; // Reset interval
    nextReviewDate.setMinutes(nextReviewDate.getMinutes() + 10);
  } 
  else {
    // New Cards (Learning Phase)
    if (repetition === 0) {
      if (quality === 2) { // Hard
        nextInterval = 1; // Base interval for next time
        nextRepetition = 1; // Graduates to review
        nextReviewDate.setHours(nextReviewDate.getHours() + 12);
      } else if (quality === 4) { // Good
        nextInterval = 1;
        nextRepetition = 1;
        nextReviewDate.setDate(nextReviewDate.getDate() + 1);
      } else if (quality === 5) { // Easy
        nextInterval = 4;
        nextRepetition = 1;
        nextReviewDate.setDate(nextReviewDate.getDate() + 4);
      }
    } 
    // Review Phase
    else {
      if (quality === 2) { // Hard
        nextInterval = Math.max(interval + 1, Math.round(interval * 1.2));
      } else if (quality === 4) { // Good
        nextInterval = Math.max(interval + 1, Math.round(interval * easeFactor));
      } else if (quality === 5) { // Easy
        nextInterval = Math.max(interval + 1, Math.round(interval * easeFactor * 1.3));
      }
      
      // Ensure strict separation: Hard < Good < Easy
      if (quality === 4 && nextInterval <= Math.max(interval + 1, Math.round(interval * 1.2))) {
        nextInterval = Math.max(interval + 1, Math.round(interval * 1.2)) + 1;
      }
      if (quality === 5 && nextInterval <= Math.max(interval + 1, Math.round(interval * easeFactor))) {
        nextInterval = Math.max(interval + 1, Math.round(interval * easeFactor)) + 1;
      }

      nextRepetition += 1;
      nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);
    }

    // Update ease factor for Good (4) and Easy (5)
    if (quality >= 4) {
      nextEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    } else if (quality === 2) {
      nextEaseFactor = easeFactor - 0.15;
    }
    
    if (nextEaseFactor < 1.3) nextEaseFactor = 1.3;
  }

  return {
    interval: nextInterval,
    repetition: nextRepetition,
    easeFactor: parseFloat(nextEaseFactor.toFixed(2)),
    nextReviewDate: nextReviewDate.toISOString(),
  };
};
