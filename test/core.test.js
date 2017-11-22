const hapi = require('hapi');
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const code = require('code');
const wreck = require('wreck');
const hapiCampaigns = require('../index.js');
let server;

lab.experiment('campaigns', async() => {
  lab.beforeEach(async () => {
    server = new hapi.Server({ port: 8000 });
    await server.register(hapiCampaigns);
    await server.start();
  });

  lab.afterEach(async () => {
    await server.stop();
  });

  lab.test('sets cookie', async() => {
    server.route({
      path: '/somecampaign',
      method: 'get',
      handler(request, h) {
        return { f: 'true' };
      }
    });

    const { res, payload } = await wreck.get('http://localhost:8000/somecampaign?campaign=testname_visit', { json: 'force' });
    const cookie = res.headers['set-cookie'][0];
    code.expect(cookie.indexOf('testname')).not.equal(-1);
    code.expect(payload.f).to.equal('true');
  });

  lab.test('gets campaigns', async() => {
    server.route({
      path: '/somecampaign2',
      method: 'get',
      handler(request, h) {
        return { cookie: request.getCampaigns() };
      }
    });

    const { res, payload } = await wreck.get('http://localhost:8000/somecampaign2', { json: 'force', headers: { cookie: `campaigns=testname|value|${Date.now()}` } });
    const cookie = payload.cookie;
    code.expect(cookie.length).to.equal(1);
    code.expect(cookie[0].name).to.equal('testname');
    code.expect(cookie[0].type).to.equal('value');
    code.expect(cookie[0].timestamp).to.exist();
  });
});
