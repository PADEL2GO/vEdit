// Mock data for development and testing
// TODO: Replace with real data from backend

export const mockPerformance = {
  lastGame: { score: 21, opponentScore: 18, won: true, date: "2024-01-15" },
  lastThreeGames: [
    { won: true, score: "21-18" },
    { won: false, score: "19-21" },
    { won: true, score: "21-15" },
  ],
  winRate: 67,
  avgScore: 20.3,
};
