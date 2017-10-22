const port    = process.env.OPENSHIFT_NODEJS_PORT || process.env.VCAP_APP_PORT || process.env.PORT || process.argv[2] || 9001;
const express = require('express');
const path    = require('path');
const favicon = require('serve-favicon');
const Gun     = require('gun');
const app     = express();

const { api } = require ('../serverapi/index');
const s3Options = require('../configs/s3');
const gunPeers = '' ['http://localhost:9000/gun'];
app.use(Gun.serve);
app.use(express.static(__dirname + '../'));
app.use(favicon(path.join(__dirname, '../public/images', 'favicon.ico')))

app.use('*', (req, res) => api(req, res))
var server = app.listen(port);
Gun({	file: 'data/client-express/pl-data.json', web: server, s3: s3Options, peers: gunPeers });

console.log('Server started on port ' + port + ' with /gun');
