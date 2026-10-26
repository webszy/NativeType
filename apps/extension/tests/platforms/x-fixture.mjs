// Semantic structure observed in a live X quote composer on 2026-10-26.
// The attached post has neither quoteTweet nor a /status/ link.
export function attachedPost(document) {
  const attachment = document.createElement('div');
  attachment.dataset.testid = 'attachments';
  const wrapper = document.createElement('div');
  const label = document.createElement('span');
  label.textContent = 'Quote';
  const card = document.createElement('button');
  card.setAttribute('role', 'button');
  const author = document.createElement('div');
  author.dataset.testid = 'User-Name';
  const time = document.createElement('time');
  time.setAttribute('datetime', '2026-10-26T11:18:48.000Z');
  const text = document.createElement('div');
  text.dataset.testid = 'tweetText';
  text.textContent = 'An attached post';
  card.append(author, time, text);
  wrapper.append(label, card);
  attachment.append(wrapper);
  return { attachment, card, author, time, label };
}
