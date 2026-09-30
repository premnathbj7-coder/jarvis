export interface FuzzyMatchResult {
  isMatch: boolean;
  score: number;
  matchedIndices: number[]; // Indices of characters in target text that matched
}

/**
 * Real-time fuzzy matcher with word-boundary, consecutive character, and prefix bonuses.
 */
export function fuzzyMatch(query: string, text: string): FuzzyMatchResult {
  const q = query.trim().toLowerCase();
  const t = text.toLowerCase();

  if (!q) {
    return { isMatch: true, score: 0, matchedIndices: [] };
  }

  // 1. Exact match bonus
  if (t === q) {
    return {
      isMatch: true,
      score: 1000,
      matchedIndices: Array.from({ length: t.length }, (_, i) => i),
    };
  }

  // 2. Exact prefix match bonus
  if (t.startsWith(q)) {
    return {
      isMatch: true,
      score: 800 + Math.max(0, 100 - t.length),
      matchedIndices: Array.from({ length: q.length }, (_, i) => i),
    };
  }

  // 3. Exact word-start substring match bonus
  const subIdx = t.indexOf(q);
  if (subIdx !== -1) {
    const isWordStart = subIdx === 0 || /[\s\-_/(]/.test(t[subIdx - 1]);
    const score = (isWordStart ? 600 : 350) + Math.max(0, 100 - subIdx) * 2;
    return {
      isMatch: true,
      score,
      matchedIndices: Array.from({ length: q.length }, (_, i) => subIdx + i),
    };
  }

  // 4. Acronym / abbreviation match check (e.g. "ai" -> "Academic Intelligence")
  const words = text.split(/[\s\-_/()]+/).filter(Boolean);
  const acronym = words.map((w) => w[0]?.toLowerCase()).join('');
  const acronymIdx = acronym.indexOf(q);
  if (acronymIdx !== -1) {
    // Collect the starting index of each matching word
    const matchedIndices: number[] = [];
    let currentWordIdx = 0;
    let charOffset = 0;

    for (let i = 0; i < text.length && currentWordIdx < words.length; i++) {
      if (text.slice(i).toLowerCase().startsWith(words[currentWordIdx].toLowerCase())) {
        if (currentWordIdx >= acronymIdx && currentWordIdx < acronymIdx + q.length) {
          matchedIndices.push(i);
        }
        i += words[currentWordIdx].length - 1;
        currentWordIdx++;
      }
    }

    return {
      isMatch: true,
      score: 500 + (100 - acronymIdx * 10),
      matchedIndices,
    };
  }

  // 5. Fuzzy character subsequence matching
  let qIdx = 0;
  let score = 0;
  const matchedIndices: number[] = [];
  let consecutiveMatches = 0;
  let prevMatchIdx = -2;

  for (let i = 0; i < t.length && qIdx < q.length; i++) {
    if (t[i] === q[qIdx]) {
      matchedIndices.push(i);
      qIdx++;

      let charScore = 15;

      // Word boundary bonus
      const isWordBoundary = i === 0 || /[\s\-_/().]/.test(t[i - 1]);
      if (isWordBoundary) {
        charScore += 30;
      }

      // Consecutive match bonus
      if (i === prevMatchIdx + 1) {
        consecutiveMatches++;
        charScore += consecutiveMatches * 18;
      } else {
        consecutiveMatches = 0;
        if (prevMatchIdx !== -2) {
          // Distance penalty
          const gap = i - prevMatchIdx - 1;
          charScore -= Math.min(gap * 2, 16);
        }
      }

      score += charScore;
      prevMatchIdx = i;
    }
  }

  const isMatch = qIdx === q.length;
  return {
    isMatch,
    score: isMatch ? Math.max(score, 10) : 0,
    matchedIndices: isMatch ? matchedIndices : [],
  };
}
