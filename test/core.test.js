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

    const result = await wreck.get('http://localhost:8000/somecampaign?campaign=visit_', { json: 'force' });
    const cookie = result.res.headers['set-cookie'] || [];
    code.expect(cookie.length).to.equal(0);
  });

  lab.test('setting campaign with no type', async() => {
    server.route({
      path: '/somecampaign',
      method: 'get',
      handler(request, h) {
        return { cookie: request.getCampaigns() };
      }
    });

    const { res } = await wreck.get('http://localhost:8000/somecampaign?campaign=testname', { json: 'force' });
    const cookie = res.headers['set-cookie'][0];
    code.expect(cookie).to.include('testname');
  });

  lab.test('sets cookie', async() => {
    server.route({
      path: '/somecampaign',
      method: 'get',
      handler(request, h) {
        return { f: 'true' };
      }
    });

    const { res, payload } = await wreck.get('http://localhost:8000/somecampaign?campaign=visit_testname', { json: 'force' });
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

    result = await wreck.get('http://localhost:8000/somecampaign?campaign=visit_testname', { json: 'force' });
    result = await wreck.get('http://localhost:8000/somecampaign?campaign=visit_testname', { json: 'force', headers: { cookie: `campaigns=testname|visit|${Date.now()}` } });
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

    result = await wreck.get('http://localhost:8000/somecampaign?campaign=visit_testname', { json: 'force' });
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

  lab.test('setting campaign names with "/" and "|" characters', async() => {
    server.route({
      path: '/somecampaign',
      method: 'get',
      handler(request, h) {
        return { cookie: request.getCampaigns() };
      }
    });
    const result1 = await wreck.get('http://localhost:8000/somecampaign?campaign=visit_test%2fname1', { json: 'force' });
    const result2 = await wreck.get('http://localhost:8000/somecampaign?campaign=visit_test|name2', { json: 'force' });
    const cookie1 = result1.res.headers['set-cookie'][0];
    const cookie2 = result2.res.headers['set-cookie'][0];
    code.expect(cookie1.split(';')[0]).to.startWith('campaigns=test/name1|visit|');
    code.expect(cookie2.split(';')[0]).to.startWith('campaigns=test|name2|visit|');
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
    const cookie = res.headers['set-cookie'] || [];
    code.expect(cookie.length).to.equal(1);
    code.expect(cookie[0]).to.include('testname');
    code.expect(cookie[0]).to.include('visit');
  });

  lab.test('concats utm_medium with utm_source', async() => {
    server.route({
      path: '/somecampaign',
      method: 'get',
      handler(request, h) {
        return { f: 'true' };
      }
    });
    const { res } = await wreck.get('http://localhost:8000/somecampaign?utm_campaign=testname&utm_source=visit&utm_medium=video', { json: 'force' });
    let cookie = res.headers['set-cookie'] || [];
    code.expect(cookie.length).to.equal(1);
    code.expect(cookie[0]).to.include('testname');
    code.expect(cookie[0]).to.include('visit_video');
  });

  lab.test('emits campaign event when campaign is fetched', async() => {
    let called = false;
    server.events.on('campaign', (data) => {
      called = data.campaign;
    });
    server.route({
      path: '/somecampaign2',
      method: 'get',
      handler(request, h) {
        return { cookie: request.getCampaigns() };
      }
    });
    await wreck.get('http://localhost:8000/somecampaign2?campaign=visit_testname', { json: 'force' });
    await new Promise(resolve => setTimeout(resolve, 1500));
    code.expect(called.name).to.equal('testname');
  });
});
