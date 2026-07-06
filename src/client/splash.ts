import { context, requestExpandedMode } from '@devvit/web/client';

const startButton = document.getElementById(
  'start-button'
) as HTMLButtonElement;
const descriptionElement = document.getElementById(
  'description'
) as HTMLParagraphElement;

startButton.addEventListener('click', (e) => {
  requestExpandedMode(e, 'game');
});

function init(): void {
  const username = context.username;
  if (username) {
    descriptionElement.textContent = `u/${username} — the road awaits. Swipe, block, counter.`;
  }
}

init();
