// Re-export all actions from their respective files
export * from "./accounts"
export * from "./transactions"
export * from "./categories"
export * from "./budgets"
export * from "./expenses"
export * from "./investments"
export * from "./watchlist"
export * from "./net-worth"
export * from "./analytics"
export * from "./test-db"
export * from "./voice-memos"
export * from "./tax"

// Mock exports for missing modules
export const getIncomes = async () => {
  return [];
};

export const getMerchantIntelligence = async () => {
  return { merchants: [], categories: [] };
};

export const getTimeOfDayAnalysis = async () => {
  return { morning: 0, afternoon: 0, evening: 0, night: 0 };
};
