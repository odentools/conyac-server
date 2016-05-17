/**
 * Routes for /api/tokens
 */

var express = require('express');
var router = express.Router();

var crypto = require('crypto'), helper = require(__dirname + '/../../models/helper'),
	async = require('async');


/**
 * GET /api/tokens - Get a list of api tokens
 */
router.get('/', function (req, res) {

	var db = helper.getDB();
	db.query('SELECT ApiToken.*, Account.name AS createdAccountName FROM ApiToken,\
	Account WHERE ApiToken.createdAccountId = Account.id;',
		function (err, rows) {

		if (err) throw err;

		var tokens = [];

		rows.forEach(function (item, i) {
			delete item.token;
			tokens.push(item);
		});

		res.send(tokens);

	});

});


/**
 * GET /api/tokens/:id - Get the api token
 */
router.get('/:id', function (req, res) {

	var id = req.params.id;
	if (id == null) {
		res.status(400).send('Invalid parameter');
		return;
	}

	// Get an item from the token id
	var db = helper.getDB();
	db.query('SELECT * FROM ApiToken WHERE id = ?;', [id], function (err, rows) {

		if (err || rows.length == 0) {
			res.status(400).send('Item was not found ' + id);
			return;
		}

		var item = rows[0];
		res.send(item);

	});

});


/**
 * DELETE /api/tokens/:id - Delete the api token
 */
router.delete('/:id', function (req, res) {

	var id = req.params.id;
	if (id == null) {
		res.status(400).send('Invalid parameter');
		return;
	}

	// Delete an item from the token id
	var db = helper.getDB();
	db.query('DELETE FROM ApiToken WHERE id = ?;', [id], function (err, rows) {

		var item = rows[0];
		res.send({
			result: 'API Token was deleted.'
		});

	});

});


/**
 * POST /api/tokens - Add the api token
 */
router.post('/', function (req, res) {

	var name = req.body.name || null;

	// Check the parameters
	if (name == null || !name.match(/^[A-Za-z0-9_\-]+$/)) {
		res.status(400).send('Available characters for name of API Token: A-Z, a-z, 0-9, underscore, hyphen');
		return;
	}

	// Make a hash string of the password
	var api_token = 'APITOKEN_' + name + '_' + Math.random(999999) + '_' + new Date().toString();
	api_token = crypto.createHash('sha256').update(api_token).digest('hex');

	// Insert to database
	var db = helper.getDB();
	db.query('INSERT INTO ApiToken (name, token, createdAccountId, createdAt) VALUES (?, ?, ?, ?);',
	[name, api_token, req.headers.sessionAccountId, new Date()], function (err, result) {

		if (err) {
			res.status(400).send(err.toString());
			return;
		}

		res.send({
			id: result.insertId,
			name: name,
			token: api_token,
			createdAt: null,
			result: 'API Token was created'
		});

	});

});


// ----

module.exports = router;
