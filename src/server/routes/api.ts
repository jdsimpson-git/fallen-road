import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import { z } from 'zod';
import {
  DailyLeaderboardResponseSchema,
  FallenRivalAvengeResponseSchema,
  FallenRivalAvengeSubmissionSchema,
  FallenRivalClaimResponseSchema,
  FallenRivalSchema,
  DailyRunCompletionResponseSchema,
  DailyRunDefinitionSchema,
  DailyRunStartResponseSchema,
  DailyRunSubmissionSchema,
  InitResponseSchema,
  VictoryResponseSchema,
  type ErrorResponse,
  type FallenRival,
} from '../../shared/api';
import {
  createDailyRunDefinition,
  dailySeedForDay,
  scoreDailyRun,
  utcDayKey,
} from '../../shared/run/daily';
import { ROAD_FIGHTS_BEFORE_BOSS } from '../../shared/balance/enemies';

const VICTORIES_KEY = 'fr:stats:victories';
const DAILY_RUN_TTL_MS = 2 * 60 * 60 * 1000;
const DAILY_BOARD_TTL_SECONDS = 3 * 24 * 60 * 60;
const RIVAL_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RIVAL_QUEUE_LIMIT = 80;

const dailyRunKey = (runId: string): string => `fr:daily-run:${runId}`;
const dailyCompletionKey = (runId: string): string => `fr:daily-completion:${runId}`;
const dailyLeaderboardKey = (day: string): string => `fr:daily-leaderboard:${day}`;
const rivalRecordKey = (rivalId: string): string => `fr:fallen-rival:${rivalId}`;
const rivalAvengesKey = (rivalId: string): string => `fr:fallen-rival-avenges:${rivalId}`;
const FALLEN_RIVALS_KEY = 'fr:fallen-rivals';

const StoredDailyRunSchema = z.object({
  username: z.string(),
  postId: z.string(),
  expiresAt: z.string().datetime(),
  daily: DailyRunDefinitionSchema,
});

const StoredDailyCompletionSchema = DailyRunCompletionResponseSchema;

const readJson = (value: string): unknown | null => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const currentUsername = async (): Promise<string | null> => {
  const username = await reddit.getCurrentUsername();
  return username ?? null;
};

const leaderboardForDay = async (day: string) => {
  const entries = await redis.zRange(dailyLeaderboardKey(day), 0, 9, {
    by: 'rank',
    reverse: true,
  });
  return entries.map(({ member, score }) => ({ username: member, score }));
};

const rankForUser = async (day: string, username: string): Promise<number | null> => {
  const key = dailyLeaderboardKey(day);
  const [ascendingRank, count] = await Promise.all([
    redis.zRank(key, username),
    redis.zCard(key),
  ]);
  return ascendingRank === undefined ? null : count - ascendingRank;
};

const eligibleFallenRivals = async (username: string): Promise<FallenRival[]> => {
  const ids = await redis.zRange(FALLEN_RIVALS_KEY, 0, RIVAL_QUEUE_LIMIT - 1, {
    by: 'rank',
    reverse: true,
  });
  const candidates = await Promise.all(
    ids.map(async ({ member }) => {
      const raw = await redis.get(rivalRecordKey(member));
      return raw ? FallenRivalSchema.safeParse(readJson(raw)) : null;
    })
  );
  return candidates
    .filter((candidate) => candidate?.success && candidate.data.username !== username)
    .map((candidate) => candidate?.data)
    .filter((candidate): candidate is FallenRival => candidate !== undefined);
};

const fallenRivalForUser = async (username: string): Promise<FallenRival | null> => {
  const candidates = await eligibleFallenRivals(username);
  if (candidates.length === 0) return null;
  const index = dailySeedForDay(`${utcDayKey()}:${username}`) % candidates.length;
  return candidates[index] ?? null;
};

const preserveFallenRival = async (
  rival: FallenRival
): Promise<void> => {
  const expiresAt = new Date(Date.now() + RIVAL_TTL_MS);
  await Promise.all([
    redis.set(rivalRecordKey(rival.id), JSON.stringify(rival), { expiration: expiresAt }),
    redis.zAdd(FALLEN_RIVALS_KEY, { member: rival.id, score: Date.now() }),
    redis.expire(FALLEN_RIVALS_KEY, Math.floor(RIVAL_TTL_MS / 1000)),
  ]);
  const count = await redis.zCard(FALLEN_RIVALS_KEY);
  if (count > RIVAL_QUEUE_LIMIT) {
    await redis.zRemRangeByRank(FALLEN_RIVALS_KEY, 0, count - RIVAL_QUEUE_LIMIT - 1);
  }
};

export const api = new Hono();

api.get('/init', async (c) => {
  const { postId } = context;

  if (!postId) {
    console.error('API init error: postId not found in devvit context');
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required but missing from context',
      },
      400
    );
  }

  try {
    const [username, victories] = await Promise.all([
      reddit.getCurrentUsername(),
      redis.get(VICTORIES_KEY),
    ]);

    const payload = InitResponseSchema.parse({
      type: 'init',
      postId,
      username: username ?? 'traveler',
      totalVictories: victories ? Number.parseInt(victories, 10) : 0,
    });
    return c.json(payload);
  } catch (error) {
    console.error(`API init error for post ${postId}:`, error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Initialization failed' },
      400
    );
  }
});

api.post('/victory', async (c) => {
  try {
    const total = await redis.incrBy(VICTORIES_KEY, 1);
    const payload = VictoryResponseSchema.parse({
      type: 'victory',
      totalVictories: total,
    });
    return c.json(payload);
  } catch (error) {
    console.error('API victory error:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Failed to record victory' },
      400
    );
  }
});

/** Issues a short-lived, user-bound ticket for today's deterministic route. */
api.post('/runs/start', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Daily runs require a post context' },
      400
    );
  }

  try {
    const username = await currentUsername();
    if (!username) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Sign in to begin a ranked daily run' },
        401
      );
    }
    const daily = createDailyRunDefinition(utcDayKey());
    const runId = randomUUID();
    const expiresAt = new Date(Date.now() + DAILY_RUN_TTL_MS);
    const stored = StoredDailyRunSchema.parse({
      username,
      postId,
      expiresAt: expiresAt.toISOString(),
      daily,
    });
    await redis.set(dailyRunKey(runId), JSON.stringify(stored), { expiration: expiresAt });

    const payload = DailyRunStartResponseSchema.parse({
      type: 'daily-run',
      runId,
      expiresAt: expiresAt.toISOString(),
      daily,
    });
    return c.json(payload);
  } catch (error) {
    console.error('Daily run start error:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Unable to begin today’s ranked run' },
      500
    );
  }
});

/** Returns the leading ten scores for the current UTC daily challenge. */
api.get('/leaderboard/daily', async (c) => {
  try {
    const day = utcDayKey();
    const payload = DailyLeaderboardResponseSchema.parse({
      type: 'daily-leaderboard',
      day,
      leaderboard: await leaderboardForDay(day),
    });
    return c.json(payload);
  } catch (error) {
    console.error('Daily leaderboard error:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Unable to load today’s leaderboard' },
      500
    );
  }
});

/** Finds a different traveller's recent defeat for an unranked revenge duel. */
api.post('/rivals/claim', async (c) => {
  try {
    const username = await currentUsername();
    if (!username) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Sign in to seek a Fallen Rival' },
        401
      );
    }
    const payload = FallenRivalClaimResponseSchema.parse({
      type: 'fallen-rival',
      rival: await fallenRivalForUser(username),
    });
    return c.json(payload);
  } catch (error) {
    console.error('Fallen Rival claim error:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Unable to seek a Fallen Rival' },
      500
    );
  }
});

/** Records a revenge outcome separately from competitive daily scores. */
api.post('/rivals/avenge', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json<ErrorResponse>({ status: 'error', message: 'Invalid rival result' }, 400);
  }
  const submission = FallenRivalAvengeSubmissionSchema.safeParse(body);
  if (!submission.success) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Invalid rival result' }, 400);
  }
  try {
    const username = await currentUsername();
    if (!username) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Sign in to record a rival duel' },
        401
      );
    }
    const rivalRaw = await redis.get(rivalRecordKey(submission.data.rivalId));
    const rival = rivalRaw ? FallenRivalSchema.safeParse(readJson(rivalRaw)) : null;
    if (!rival?.success) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'This Fallen Rival has faded from the road' },
        404
      );
    }
    if (rival.data.username === username) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'You cannot avenge your own echo' },
        403
      );
    }
    await redis.hIncrBy(rivalAvengesKey(rival.data.id), 'attempts', 1);
    const avenges =
      submission.data.outcome === 'victory'
        ? await redis.hIncrBy(rivalAvengesKey(rival.data.id), 'victories', 1)
        : Number.parseInt(
            (await redis.hGet(rivalAvengesKey(rival.data.id), 'victories')) ?? '0',
            10
          );
    await redis.expire(rivalAvengesKey(rival.data.id), Math.floor(RIVAL_TTL_MS / 1000));
    const payload = FallenRivalAvengeResponseSchema.parse({
      type: 'rival-result',
      avenges,
    });
    return c.json(payload);
  } catch (error) {
    console.error('Fallen Rival result error:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Unable to record this rival duel' },
      500
    );
  }
});

/**
 * Validates a run ticket, recomputes its score, and retains only each
 * traveller's best score for that day. The ticket makes retries idempotent.
 */
api.post('/runs/complete', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json<ErrorResponse>({ status: 'error', message: 'Invalid score payload' }, 400);
  }
  const submission = DailyRunSubmissionSchema.safeParse(body);
  if (!submission.success) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Invalid score payload' }, 400);
  }

  try {
    const username = await currentUsername();
    if (!username) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Sign in to submit a ranked score' },
        401
      );
    }
    const storedRaw = await redis.get(dailyRunKey(submission.data.runId));
    if (!storedRaw) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'This daily run has expired or is unknown' },
        404
      );
    }
    const stored = StoredDailyRunSchema.safeParse(readJson(storedRaw));
    if (!stored.success || stored.data.username !== username) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'This daily run belongs to another traveller' },
        403
      );
    }
    if (new Date(stored.data.expiresAt).getTime() < Date.now()) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'This daily run has expired' },
        410
      );
    }

    const completedKey = dailyCompletionKey(submission.data.runId);
    const existingRaw = await redis.get(completedKey);
    if (existingRaw) {
      const existing = StoredDailyCompletionSchema.safeParse(readJson(existingRaw));
      if (existing.success) return c.json(existing.data);
      return c.json<ErrorResponse>(
        { status: 'error', message: 'This daily run is already being scored' },
        409
      );
    }

    const totalFoes = ROAD_FIGHTS_BEFORE_BOSS + 2;
    const expectedFoes =
      submission.data.outcome === 'victory'
        ? submission.data.stats.foesFelled === totalFoes
        : submission.data.stats.foesFelled < totalFoes;
    if (!expectedFoes) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'The reported encounter count is not possible' },
        400
      );
    }
    if (new Set(submission.data.gambitIds).size !== submission.data.gambitIds.length) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'A Gambit cannot be claimed twice' },
        400
      );
    }

    const expiresAt = new Date(stored.data.expiresAt);
    const claim = await redis.set(completedKey, 'pending', {
      nx: true,
      expiration: expiresAt,
    });
    if (claim !== 'OK') {
      const completedRaw = await redis.get(completedKey);
      const completed = completedRaw
        ? StoredDailyCompletionSchema.safeParse(readJson(completedRaw))
        : null;
      if (completed?.success) return c.json(completed.data);
      return c.json<ErrorResponse>(
        { status: 'error', message: 'This daily run is already being scored' },
        409
      );
    }

    const score = scoreDailyRun(submission.data);
    const leaderboardKey = dailyLeaderboardKey(stored.data.daily.day);
    const previousBest = await redis.zScore(leaderboardKey, username);
    const personalBest = previousBest === undefined || score > previousBest;
    if (personalBest) {
      await redis.zAdd(leaderboardKey, { member: username, score });
    }
    await redis.expire(leaderboardKey, DAILY_BOARD_TTL_SECONDS);
    const bestScore = personalBest ? score : previousBest;
    const rank = await rankForUser(stored.data.daily.day, username);
    if (rank === null) {
      throw new Error('Leaderboard rank missing after score submission');
    }
    const payload = DailyRunCompletionResponseSchema.parse({
      type: 'daily-result',
      day: stored.data.daily.day,
      score,
      bestScore,
      rank,
      personalBest,
      leaderboard: await leaderboardForDay(stored.data.daily.day),
    });
    if (submission.data.outcome === 'defeat') {
      await preserveFallenRival(
        FallenRivalSchema.parse({
          id: submission.data.runId,
          username,
          weaponId: submission.data.weaponId,
          gambitIds: submission.data.gambitIds,
          foesFelled: submission.data.stats.foesFelled,
          defeatedAt: new Date().toISOString(),
        })
      );
    }
    await redis.set(completedKey, JSON.stringify(payload), { expiration: expiresAt });
    return c.json(payload);
  } catch (error) {
    console.error('Daily score submission error:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Unable to submit this daily score' },
      500
    );
  }
});
