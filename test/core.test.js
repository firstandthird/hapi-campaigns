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

  lab.test('invalid campaign param', async() => {
    server.route({
      path: '/somecampaign',
      method: 'get',
      handler(request, h) {
        return { f: 'true' };
      }
    });

    const { res } = await wreck.get('http://localhost:8000/somecampaign?campaign=testname', { json: 'force' });
    let cookie = res.headers['set-cookie'] || [];
    code.expect(cookie.length).to.equal(0);

    const result = await wreck.get('http://localhost:8000/somecampaign?campaign=_visit', { json: 'force' });
    cookie = result.res.headers['set-cookie'] || [];
    code.expect(cookie.length).to.equal(0);
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

  lab.test('setting duplicate campaign', async() => {
    server.route({
      path: '/somecampaign',
      method: 'get',
      handler(request, h) {
        return { cookie: request.getCampaigns() };
      }
    });

    let result;

    result = await wreck.get('http://localhost:8000/somecampaign?campaign=testname_visit', { json: 'force' });
    result = await wreck.get('http://localhost:8000/somecampaign?campaign=testname_visit', { json: 'force', headers: { cookie: `campaigns=testname|visit|${Date.now()}` } });
    code.expect(result.payload.cookie.length).to.equal(1);
  });

  lab.test('setting multiple campaigns', async() => {
    server.route({
      path: '/somecampaign',
      method: 'get',
      handler(request, h) {
        return '';
      }
    });

    server.route({
      path: '/somecampaign2',
      method: 'get',
      handler(request, h) {
        return { cookie: request.getCampaigns() };
      }
    });

    let result;

    result = await wreck.get('http://localhost:8000/somecampaign?campaign=testname_visit', { json: 'force' });
    result = await wreck.get('http://localhost:8000/somecampaign?campaign=testname2_visit', { json: 'force', headers: { cookie: `campaigns=testname|visit|${Date.now()}` } });
    result = await wreck.get('http://localhost:8000/somecampaign?campaign=testname3_visit', { json: 'force', headers: { cookie: `campaigns=testname|visit|${Date.now()}/campaigns=testname2|visit|${Date.now()}` } });
    result = await wreck.get('http://localhost:8000/somecampaign?campaign=testname4_visit', { json: 'force', headers: { cookie: `campaigns=testname|visit|${Date.now()}/campaigns=testname2|visit|${Date.now()}/campaigns=testname3|visit|${Date.now()}` } });
    result = await wreck.get('http://localhost:8000/somecampaign2', { json: 'force', headers: { cookie: `campaigns=testname|visit|${Date.now()}/campaigns=testname2|visit|${Date.now()}/campaigns=testname3|visit|${Date.now()}` } });
    code.expect(result.payload.cookie.length).to.equal(3);
  });

  lab.test('gets campaigns', async() => {
    server.route({
      path: '/somecampaign2',
      method: 'get',
      handler(request, h) {
        return { cookie: request.getCampaigns() };
      }
    });

    const { payload } = await wreck.get('http://localhost:8000/somecampaign2', { json: 'force', headers: { cookie: `campaigns=testname|visit|${Date.now()}` } });
    const cookie = payload.cookie;
    code.expect(cookie.length).to.equal(1);
    code.expect(cookie[0].name).to.equal('testname');
    code.expect(cookie[0].type).to.equal('visit');
    code.expect(cookie[0].timestamp).to.exist();
  });

  lab.test('handles when no cookie set', async() => {
    server.route({
      path: '/somecampaign',
      method: 'get',
      handler(request, h) {
        return { cookie: request.getCampaigns() };
      }
    });

    const { payload } = await wreck.get('http://localhost:8000/somecampaign', { json: 'force' });
    const cookie = payload.cookie;
    code.expect(cookie.length).to.equal(0);
  });

  lab.test('filters out expired', async() => {
    server.route({
      path: '/somecampaign2',
      method: 'get',
      handler(request, h) {
        return { cookie: request.getCampaigns() };
      }
    });

    const expired = Date.now() - (31 * 86400000);

    const result = await wreck.get('http://localhost:8000/somecampaign2', { json: 'force', headers: { cookie: `campaigns=testname|visit|${Date.now()}/campaigns=testname2|visit|${expired}` } });
    code.expect(result.payload.cookie.length).to.equal(1);
  });

  lab.test('handles utm campaigns', async() => {
    server.route({
      path: '/somecampaign',
      method: 'get',
      handler(request, h) {
        return { f: 'true' };
      }
    });
    const { res } = await wreck.get('http://localhost:8000/somecampaign?utm_campaign=testname&utm_source=visit', { json: 'force' });
    let cookie = res.headers['set-cookie'] || [];
    code.expect(cookie.length).to.equal(1);
    code.expect(cookie[0]).to.include('testname');
    code.expect(cookie[0]).to.include('visit');
  });
});
