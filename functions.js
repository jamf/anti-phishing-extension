'use strict';

/* global browser */

// https://stackoverflow.com/a/23854032
async function getUserId() {
  const getRandomToken = () => {
    // E.g. 8 * 32 = 256 bits token
    const randomPool = new Uint8Array(32);
    crypto.getRandomValues(randomPool);
    let hex = '';
    for (let i = 0; i < randomPool.length; ++i) {
      hex += randomPool[i].toString(16);
    }
    // E.g. db18458e2782b2b77e36769c569e263a53885a9944dd0a861e5064eac16f1a
    return hex;
  };

  const items = await browser.storage.sync.get('userId');
  const userId = items.userId;
  if (userId) {
    return userId;
  }

  const newUserId = getRandomToken();
  await browser.storage.sync.set({ userId: newUserId });
  return newUserId;
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
