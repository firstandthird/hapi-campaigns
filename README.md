# hapi-campaigns
   A hapi server plugin that provides automatic tracking of campaigns and UTM campaigns

## installation

   Go to your project directory and do
```console
npm install hapi-campaign
```

  Register the plugin with your hapi server with

```javascript
const hapiCampaigns = require('hapi-campaigns');
const server = new hapi.Server({ port: 8000 });
await server.register(hapiCampaigns);
```

## How it Works
hapi-campaigns parses every incoming request to your
server for a campaign (or utm_campaign) cookie.  It will
automatically extract any values associated with the campaign
cookie (separated by '_'), and for utm_campaigns will extract
utm_medium / utm_source fields.  It also registers a 'campaign'
event that is called any time a campaign matching the specified cookie name is detected.


## Example
If you register an event handler like:
```javascript
server.events.on('campaign', (data) => {
  console.log(data.hello);
});
```

When you call the route `/foo?campaign=visit_world` your
server will print:
"world"

## Options

- __cookieName__

The cookie associated with your campaign, default value is _campaigns64_
- __cookie__

- __ttl__

The TTL for the cookie, by default the cookie will last 30 days.

A JSON object specifying the cookie's properties, these along with their defaults are:
  - __isSecure__: false
  - __isSameSite__: false
  - __isHttpOnly__: true
  - __clearInvalid__: true
  - __ignoreErrors__: true
