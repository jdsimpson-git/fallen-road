import { z } from 'zod';

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

export const ErrorResponseSchema = z.object({
  status: z.literal('error'),
  message: z.string(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
