/**
 * conyac-server
 * https://github.com/odentools/conyac-server
 * (C) 2016 - OdenTools; Released under MIT License.
 */

'use strict';

var express = require('express'), mysql = require('mysql'),
	helper = require(__dirname + '/models/helper');

var app = express();

// Publish the static directories
app.use(express.static('bower_components'));
app.use(express.static('public'));

// Use application/json for Content-Type of POST request
app.use(require('body-parser').json());

// Request hook
app.use(require(__dirname + '/routes/_hook'));

// Routes
app.use('/api/accounts', require(__dirname + '/routes/api/accounts'));
app.use('/api/devices', require(__dirname + '/routes/api/devices'));
app.use('/api/tokens', require(__dirname + '/routes/api/tokens'));

// Start the server
var server = app.listen(3000, function () {
	var host = server.address().address;
	var port = server.address().port;
	console.log('The app listening on port %s:%s', host, port);
});
