import { reddit } from '@devvit/web/server';

export const createPost = async () => {
  return await reddit.submitCustomPost({
    title: "Fallen Road — Your death becomes someone else's enemy",
  });
};
