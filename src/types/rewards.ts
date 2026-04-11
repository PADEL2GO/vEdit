/**
 * Shared reward system types used across P2G Points and Rewards hooks/components.
 * Single source of truth for reward-related data structures.
 */

/** Possible status states for a reward instance */
export type RewardStatus = "PENDING" | "AVAILABLE" | "CLAIMED" | "REVERSED" | "EXPIRED" | "PENDING_APPROVAL";

/** Definition metadata attached to a reward instance */
export interface RewardDefinition {
  key: string;
  title: string;
  description: string;
  category: string;
}

/** A single reward instance belonging to a user */
export interface RewardInstance {
  id: string;
  user_id: string;
  definition_key: string;
  status: RewardStatus;
  points: number;
  source_type: string;
  source_id: string;
  available_at: string | null;
  claimed_at: string | null;
  reversed_at: string | null;
  expires_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  reward_definitions?: RewardDefinition;
}

/** Summary of user's reward state */
export interface RewardsSummary {
  balance: number;
  claimableCount: number;
  pendingCount: number;
}

/** Response from rewards list API */
export interface RewardsListResponse {
  claimable: RewardInstance[];
  pending: RewardInstance[];
  history: RewardInstance[];
}

/** Response from P2G rewards endpoint */
export interface P2GRewardsResponse {
  reward_balance: number;
  claimable: RewardInstance[];
  pending: RewardInstance[];
  history: RewardInstance[];
}
