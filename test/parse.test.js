const Lab = require('lab');
const lab = exports.lab = Lab.script();
const code = require('code');
const parseCookie = require('../lib/parseCookie');

lab.experiment('campaigns', async() => {
  lab.test('parse tokens', async() => {
    const cookie = 'te|stname|visit|1525972663761';
    const cookie2 = 'te/stname|visit|1525972663790/testname/2|visit|1525972663792';
    const cookie3 = 'testn/a|me|visit|1525972663793/testname2|visit|1525972663793/test/name3|visit|1525972663795';
    const cookie4 = 'test/name|visit|1525972663797/te/stn|ame2|visit|1525972663797/tes|tname/3|visit|1525972663797/test/name4|visit|1525972663798';
    const outcome = parseCookie(cookie);
    const outcome2 = parseCookie(cookie2);
    const outcome3 = parseCookie(cookie3);
    const outcome4 = parseCookie(cookie4);

    code.expect(outcome[0].name).to.equal('te|stname');

    code.expect(outcome2.length).to.equal(2);
    code.expect(outcome2[0].name).to.equal('te/stname');
    code.expect(outcome2[1].name).to.equal('testname/2');

    code.expect(outcome3.length).to.equal(3);
    code.expect(outcome3[0].name).to.equal('testn/a|me');
    code.expect(outcome3[1].name).to.equal('testname2');
    code.expect(outcome3[2].name).to.equal('test/name3');

    code.expect(outcome4.length).to.equal(4);
    code.expect(outcome4[0].name).to.equal('test/name');
    code.expect(outcome4[1].name).to.equal('te/stn|ame2');
    code.expect(outcome4[2].name).to.equal('tes|tname/3');
    code.expect(outcome4[3].name).to.equal('test/name4');
  });
});
