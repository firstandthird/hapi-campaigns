module.exports = function(cookie) {
  if (typeof cookie === 'string') {
    cookie = Buffer.from(cookie, 'base64').toString();
  }

  if (typeof cookie !== 'string') {
    return [];
  }

  const cookieTokens = cookie.split('/');
  const cookieElements = [];
  // loop over each element of cookie up to '/' and see if it is an entire cookie or just one item:
  for (let i = 0; i < cookieTokens.length; i++) {
    // if it does not have all the elements of a campaign assume the campaign name had a '/' in it:
    if (cookieTokens[i].split('|').length < 3 && i < cookieTokens.length - 1) {
      cookieTokens[i + 1] = `${cookieTokens[i]}/${cookieTokens[i + 1]}`;
      continue;
    }
    cookieElements.push(cookieTokens[i]);
  }
  // some campaign names may have a '/' in them:
  return cookieElements.map(c => {
    const campaignTokens = c.split('|');
    // some cookies may have a '|' in them in which case there will be 4 elements:
    if (campaignTokens.length > 3) {
      return { name: `${campaignTokens[0]}|${campaignTokens[1]}`, type: campaignTokens[2], timestamp: campaignTokens[3] };
    }
    const [name, type, timestamp] = campaignTokens;
    return { name, type, timestamp };
  });
};
