module.exports = function(cookie) {
  return cookie.split('/').map(c => {
    const [name, type, timestamp] = c.split('|');
    return { name, type, timestamp };
  });
};
