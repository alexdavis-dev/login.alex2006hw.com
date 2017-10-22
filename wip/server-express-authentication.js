const port    = process.env.OPENSHIFT_NODEJS_PORT || process.env.VCAP_APP_PORT || process.env.PORT || process.argv[2] || 9000;
const express = require('express');
const path    = require('path');
const favicon = require('serve-favicon');
const Gun     = require('gun');
const app     = express();
// const authentication = require('express-authentication');

const { api } = require ('./serverapi/index');
const s3Options = require('./configs/s3');
const gunPeers = ['https://pl.pointlook.com/gun'];
app.use(Gun.serve);
app.use(express.static(__dirname));
app.use(favicon(path.join(__dirname, 'public/images', 'favicon.ico')))

app.use('*', (req, res) => api(req, res))
var server = app.listen(port);
Gun({	file: 'data/ut-gun-data.json', web: server, s3: s3Options, peers: gunPeers });

console.log('Server started on port ' + port + ' with /gun');

//// websocket authentication
// http://iostreamer.me/ws/node.js/jwt/2016/05/08/websockets_authentication.html
