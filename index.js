const parseCookie = require('./lib/parseCookie');
const prepareCookie = require('./lib/prepareCookie');

const defaults = {
  cookieName: 'campaigns',
  ttl: 30 * 86400000 // 30 days
};

const register = async function(server, options) {
  const settings = Object.assign({}, options, defaults);

  server.ext('onPreResponse', async (request, h) => {
    if (!request.query.campaign) {
      return h.continue;
    }

    const [name, type] = request.query.campaign.split('_');

    if (!name || !type) {
      return h.continue;
    }

    const now = Date.now();
    const cutoff = now - settings.ttl;
    const currentCookie = request.state[settings.cookieName] || '';
    const campaigns = parseCookie(currentCookie).filter(c => c.timestamp >= cutoff);
    const existing = campaigns.findIndex(c => (c.name === name && c.type === type));

    if (existing !== -1) {
      campaigns[existing].timestamp = now;
    } else {
      campaigns.push({ name, type, timestamp: now });
    }

    h.state(settings.cookieName, prepareCookie(campaigns), {
      ttl: settings.ttl,
      path: '/',
      clearInvalid: true,
      ignoreErrors: true
    });

    return h.continue;
  });

  const getCampaigns = function() {
    const now = Date.now();
    const cutoff = now - settings.ttl;
    const currentCookie = this.state[settings.cookieName] || '';
    return parseCookie(currentCookie).filter(c => c.timestamp >= cutoff);
  };

  server.decorate('request', 'getCampaigns', getCampaigns);
};

exports.plugin = {
  once: true,
  pkg: require('./package.json'),
  register
};
