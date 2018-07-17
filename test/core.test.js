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
    const parseCookie = require('../lib/parseCookie');
    server.route({
      path: '/somecampaign',
      method: 'get',
      handler(request, h) {
        return { cookie: request.getCampaigns() };
      }
    });
    const { res } = await wreck.get('http://localhost:8000/somecampaign?campaign=testname', { json: 'force' });
    const cookie = res.headers['set-cookie'][0].split(';')[0].split('=')[1];
    const parsed = parseCookie(cookie);
    code.expect(parsed[0].name).to.equal('testname');
    const term = Buffer.from(`testname||${Date.now()}`).toString('base64');
    const result = await wreck.get('http://localhost:8000/somecampaign?campaign=testname', { json: 'force', headers: { cookie: `campaigns64=${term}` } });
    code.expect(result.payload.cookie[0].name).to.equal('testname');
    code.expect(result.payload.cookie[0].type).to.equal('');
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
    const term = `campaigns64=${Buffer.from('testname').toString('base64')}`;
    code.expect(cookie.indexOf(term.substring(0, term.length - 2))).not.equal(-1);
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
    const term = Buffer.from(`testname|visit|${Date.now()}`).toString('base64');
    result = await wreck.get('http://localhost:8000/somecampaign?campaign=visit_testname', { json: 'force', headers: { cookie: `campaigns64=${term}` } });
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
    let cookie = result.res.headers['set-cookie'][0].split(';')[0];
    result = await wreck.get('http://localhost:8000/somecampaign?campaign=visit_testname2', { json: 'force', headers: { cookie } });
    cookie = result.res.headers['set-cookie'][0].split(';')[0];
    result = await wreck.get('http://localhost:8000/somecampaign?campaign=visit_testname3', { json: 'force', headers: { cookie } });
    cookie = result.res.headers['set-cookie'][0].split(';')[0];
    result = await wreck.get('http://localhost:8000/somecampaign2', { json: 'force', headers: { cookie } });
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
    const term = Buffer.from(`testname|visit|${Date.now()}`).toString('base64');
    const { payload } = await wreck.get('http://localhost:8000/somecampaign2', { json: 'force', headers: { cookie: `campaigns64=${term}` } });
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
    const term = Buffer.from(`testname3|visit|${Date.now()}`).toString('base64');
    const expiredTerm = Buffer.from(`testname2|visit|${expired}`).toString('base64');

    const result = await wreck.get('http://localhost:8000/somecampaign2', { json: 'force', headers: { cookie: `campaigns64=${term}/campaigns64=${expiredTerm}` } });
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
    const term = `campaigns64=${Buffer.from('testname').toString('base64')}`;
    code.expect(cookie[0]).to.include(term.substring(0, term.length - 2));
    const term2 = Buffer.from('visit').toString('base64');
    code.expect(cookie[0]).to.include(term2.substring(0, term2.length - 2));
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
    const cookie = res.headers['set-cookie'] || [];
    code.expect(cookie.length).to.equal(1);
    const term = Buffer.from('testname').toString('base64');
    code.expect(cookie[0]).to.include(term.substring(0, term.length - 2));
    const term2 = Buffer.from('visit_video').toString('base64');
    code.expect(cookie[0]).to.include(term2.substring(0, term2.length - 2));
  });

  lab.test('does not crash if a cookie violates RFC 6265 (eg includes whitespace)', async() => {
    server.route({
      path: '/somecampaign',
      method: 'get',
      handler(request, h) {
        return { f: 'true' };
      }
    });
    const { res } = await wreck.get('http://localhost:8000/somecampaign?utm_campaign=schedule&utm_source=random_page&utm_medium=Arbitrary%20Whitespace%20Cookie', { json: 'force' });
    const cookie = res.headers['set-cookie'] || [];
    code.expect(cookie.length).to.equal(1);
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

  lab.test('setting campaign names with "/" and "|" characters', async() => {
    server.route({
      path: '/somecampaign',
      method: 'get',
      handler(request, h) {
        return { cookie: request.getCampaigns() };
      }
    });
    const term = Buffer.from(`test/name1|visit|${Date.now()}`).toString('base64');
    const term2 = Buffer.from(`test|name2|visit|${Date.now()}`).toString('base64');
    const output1 = await wreck.get('http://localhost:8000/somecampaign', { json: 'force', headers: { cookie: `campaigns64=${term}` } });
    const output2 = await wreck.get('http://localhost:8000/somecampaign', { json: 'force', headers: { cookie: `campaigns64=${term2}` } });
    code.expect(output1.payload.cookie[0].name).to.equal('test/name1');
    code.expect(output2.payload.cookie[0].name).to.equal('test|name2');
    code.expect(output1.payload.cookie[0].type).to.equal('visit');
    code.expect(output2.payload.cookie[0].type).to.equal('visit');
  });

  lab.test('does not crash if request.state is not set', async() => {
    server.route({
      path: '/somecampaign',
      method: 'get',
      handler(request, h) {
        delete request.state;
        return h.redirect('/somewhere');
      }
    });
    const { res } = await wreck.get('http://localhost:8000/somecampaign?campaign=visit_testname');
    code.expect(res.statusCode).to.equal(302);
  });

  lab.test('manually set campaign', async() => {
    server.route({
      path: '/manual',
      method: 'get',
      handler(request, h) {
        request.query = Object.assign(request.query, {
          utm_campaign: 'testname',
          utm_source: 'visit',
          utm_medium: 'video'
        });

        request.setCampaigns(request, h);

        return { status: 'ok' };
      }
    });
    const { res } = await wreck.get('http://localhost:8000/manual', { json: 'force' });
    const cookie = res.headers['set-cookie'] || [];
    code.expect(cookie.length).to.equal(1);
    const term = Buffer.from('testname').toString('base64');
    code.expect(cookie[0]).to.include(term.substring(0, term.length - 2));
    const term2 = Buffer.from('visit_video').toString('base64');
    code.expect(cookie[0]).to.include(term2.substring(0, term2.length - 2));
  });
});
