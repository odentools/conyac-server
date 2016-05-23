/**
 * denhub-server
 * https://github.com/odentools/denhub-server
 * (C) 2016 - OdenTools; Released under MIT License.
 */

'use strict';

var express = require('express'), mysql = require('mysql'),
	WebSocketServer = require('ws').Server;
var helper = require(__dirname + '/models/helper');

var app = express();

// Publish the static directories
app.use(express.static('bower_components'));
app.use(express.static('public'));

// Use application/json for Content-Type of POST request
app.use(require('body-parser').json());

// Request Hooks
app.use(require(__dirname + '/routes/_hook'));

// REST API
app.use('/api/accounts', require(__dirname + '/routes/api/accounts'));
app.use('/api/devices', require(__dirname + '/routes/api/devices'));
app.use('/api/deviceTypes', require(__dirname + '/routes/api/deviceTypes'));
app.use('/api/tokens', require(__dirname + '/routes/api/tokens'));
var server = require('http').createServer(app);

// WebSocket API
var wss = new WebSocketServer({server: server});
var wsApi = require(__dirname + '/routes/_websocket-api');
wss.on('connection', wsApi.onWsConnection);

// Start the server
var s = server.listen(process.env.PORT || 3000, function () {
	var host = s.address().address;
	var port = s.address().port;
	console.log('The app listening on port %s:%s', host, port);
});
