import { z } from 'zod';
import { WEAPON_IDS } from './balance/weapons';
import { GAMBIT_IDS } from './run/gambits';
import { ROAD_FIGHTS_BEFORE_BOSS } from './balance/enemies';

/**
 * Contract for GET /api/init. The server builds this from authenticated
 * context; the client parses responses defensively with the same schema.
 */
export const InitResponseSchema = z.object({
  type: z.literal('init'),
  postId: z.string(),
  username: z.string(),
  /** Community-wide count of Road Soldiers felled, stored in Redis. */
  totalVictories: z.number().int().nonnegative(),
});

export type InitResponse = z.infer<typeof InitResponseSchema>;

/** Contract for POST /api/victory, recorded after a won battle. */
export const VictoryResponseSchema = z.object({
  type: z.literal('victory'),
  totalVictories: z.number().int().nonnegative(),
});

export type VictoryResponse = z.infer<typeof VictoryResponseSchema>;

const GambitIdSchema = z.enum(GAMBIT_IDS);
const WeaponIdSchema = z.enum(WEAPON_IDS);

export const DailyRunDefinitionSchema = z.object({
  contentVersion: z.number().int().positive(),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  seed: z.number().int().nonnegative(),
  roadEnemyIds: z.array(z.string()).length(ROAD_FIGHTS_BEFORE_BOSS),
  gambitDeck: z.array(GambitIdSchema).length(GAMBIT_IDS.length),
});

export type DailyRunDefinitionResponse = z.infer<typeof DailyRunDefinitionSchema>;

/** A user-bound ticket that lets one daily attempt submit exactly once. */
export const DailyRunStartResponseSchema = z.object({
  type: z.literal('daily-run'),
  runId: z.string().min(1),
  expiresAt: z.string().datetime(),
  daily: DailyRunDefinitionSchema,
});

export type DailyRunStartResponse = z.infer<typeof DailyRunStartResponseSchema>;

export const DailyScoreStatsSchema = z.object({
  foesFelled: z.number().int().min(0).max(6),
  damageDealt: z.number().int().min(0).max(10000),
  damageTaken: z.number().int().min(0).max(1000),
  weakPointHits: z.number().int().min(0).max(300),
  perfectCounters: z.number().int().min(0).max(100),
  dodgeCounters: z.number().int().min(0).max(100),
  attacksEvaded: z.number().int().min(0).max(100),
});

export type DailyScoreStats = z.infer<typeof DailyScoreStatsSchema>;

export const DailyRunSubmissionSchema = z.object({
  runId: z.string().min(1),
  outcome: z.enum(['victory', 'defeat']),
  // A first-encounter defeat can happen before the ten-second mark.
  durationSec: z.number().int().min(1).max(3600),
  stats: DailyScoreStatsSchema,
  weaponId: WeaponIdSchema,
  gambitIds: z.array(GambitIdSchema).max(5),
});

export type DailyRunSubmission = z.infer<typeof DailyRunSubmissionSchema>;

export const DailyLeaderboardEntrySchema = z.object({
  username: z.string(),
  score: z.number().int().nonnegative(),
});

export type DailyLeaderboardEntry = z.infer<typeof DailyLeaderboardEntrySchema>;

export const DailyRunCompletionResponseSchema = z.object({
  type: z.literal('daily-result'),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  score: z.number().int().nonnegative(),
  bestScore: z.number().int().nonnegative(),
  rank: z.number().int().positive(),
  personalBest: z.boolean(),
  leaderboard: z.array(DailyLeaderboardEntrySchema).max(10),
});

export type DailyRunCompletionResponse = z.infer<
  typeof DailyRunCompletionResponseSchema
>;

export const DailyLeaderboardResponseSchema = z.object({
  type: z.literal('daily-leaderboard'),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  leaderboard: z.array(DailyLeaderboardEntrySchema).max(10),
});

export type DailyLeaderboardResponse = z.infer<typeof DailyLeaderboardResponseSchema>;

/** Sanitized loss record — enough to make a rival readable, never a full run log. */
export const FallenRivalSchema = z.object({
  id: z.string().min(1),
  username: z.string(),
  weaponId: WeaponIdSchema,
  gambitIds: z.array(GambitIdSchema).max(5),
  foesFelled: z.number().int().min(0).max(6),
  defeatedAt: z.string().datetime(),
});

export type FallenRival = z.infer<typeof FallenRivalSchema>;

export const FallenRivalClaimResponseSchema = z.object({
  type: z.literal('fallen-rival'),
  rival: FallenRivalSchema.nullable(),
});

export type FallenRivalClaimResponse = z.infer<typeof FallenRivalClaimResponseSchema>;

export const FallenRivalAvengeSubmissionSchema = z.object({
  rivalId: z.string().min(1),
  outcome: z.enum(['victory', 'defeat']),
});

export const FallenRivalAvengeResponseSchema = z.object({
  type: z.literal('rival-result'),
  avenges: z.number().int().nonnegative(),
});

export const ErrorResponseSchema = z.object({
  status: z.literal('error'),
  message: z.string(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
