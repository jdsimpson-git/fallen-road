import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import {
  InitResponseSchema,
  VictoryResponseSchema,
  type ErrorResponse,
} from '../../shared/api';

const VICTORIES_KEY = 'fr:stats:victories';

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
