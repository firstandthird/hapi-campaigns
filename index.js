const parseCookie = require('./lib/parseCookie');
const prepareCookie = require('./lib/prepareCookie');

const defaults = {
  cookieName: 'campaigns',
  ttl: 30 * 86400000 // 30 days
};

const register = function(server, options) {
  const settings = Object.assign({}, options, defaults);

  const parseCampaign = (request) => {
    const [type, name] = request.query.campaign.split('_');

    if (!name || !type) {
      return false;
    }
    return { name, type };
  };

  const parseUTM = (request) => {
    const name = request.query.utm_campaign;
    const type = request.query.utm_medium ? `${request.query.utm_source}_${request.query.utm_medium}` : request.query.utm_source;
    return { name, type };
  };

  server.ext('onPreResponse', (request, h) => {
    let res;
    if (request.query.campaign) {
      res = parseCampaign(request);
    }
    if (request.query.utm_campaign && request.query.utm_source) {
      res = parseUTM(request);
    }
    if (!res) {
      return h.continue;
    }
    const name = res.name;
    const type = res.type;

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
