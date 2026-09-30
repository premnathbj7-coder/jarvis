export interface ActionInteraction {
  count: number;
  lastUsed: number; // Unix timestamp
}

export type InteractionHistoryMap = Record<string, ActionInteraction>;

const STORAGE_KEY = 'jarvis_omnibar_interaction_history';

/**
 * Reads interaction history from localStorage
 */
export function getInteractionHistory(): InteractionHistoryMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Records an invocation of an action and saves updated metrics to localStorage
 */
export function recordActionInteraction(actionId: string): InteractionHistoryMap {
  try {
    const history = getInteractionHistory();
    const existing = history[actionId] || { count: 0, lastUsed: 0 };
    history[actionId] = {
      count: existing.count + 1,
      lastUsed: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    return history;
  } catch {
    return {};
  }
}

/**
 * Clears interaction history
 */
export function clearInteractionHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/**
 * Calculates priority weight based on frequency count and recency
 */
export function calculateInteractionScore(interaction?: ActionInteraction): number {
  if (!interaction || interaction.count === 0) return 0;

  const { count, lastUsed } = interaction;
  const hoursSince = (Date.now() - lastUsed) / (1000 * 60 * 60);

  // Recency bonus: up to 35 points if used in the last hour, diminishing over 72 hours
  const recencyBonus = Math.max(0, 35 - hoursSince * 0.5);

  // Frequency bonus: up to 250 points with logarithmic diminishing returns
  const frequencyBonus = Math.min(count * 25, 250);

  return frequencyBonus + recencyBonus;
}

/**
 * Formats relative last used time
 */
export function formatLastUsed(lastUsed: number): string {
  if (!lastUsed) return '';
  const diffSec = Math.floor((Date.now() - lastUsed) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
