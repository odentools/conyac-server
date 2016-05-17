/**
 * Routes for /api/accounts
 */

var express = require('express');
var router = express.Router();

var crypto = require('crypto'), helper = require(__dirname + '/../../models/helper'),
	async = require('async');


/**
 * GET /api/accounts - Get a list of accounts
 */
router.get('/', function (req, res) {

	var db = helper.getDB();
	db.query('SELECT * FROM Account;', function (err, rows) {

		var accounts = [];

		rows.forEach(function (item, i) {
			delete item.pw;
			accounts.push(item);
		});

		res.send(accounts);

	});

});


/**
 * GET /api/accounts/:id - Get the account
 */
router.get('/:id', function (req, res) {

	var db = helper.getDB();

	var id = null;
	if (req.params.id == '@me') {
		id = req.headers.sessionAccountId;
	} else {
		id = req.params.id;
	}

	if (id == null) {
		res.status(400).send('Invalid parameter or session');
		return;
	}

	// Get the account from the account ID
	db.query('SELECT * FROM Account WHERE id = ?;', [id], function (err, rows) {

		if (err || rows.length == 0) {
			res.status(400).send('Could not get the account ' + id);
			return;
		}

		var account = rows[0];
		delete account.pw;

		res.send(account);

	});

});


/**
 * DELETE /api/accounts/:id - Delete the account
 */
router.delete('/:id', function (req, res) {

	var id = req.params.id;
	if (id == null) {
		res.status(400).send('Invalid parameter');
		return;
	}

	var db = helper.getDB();
	db.query('DELETE FROM Account WHERE id = ?;', [id], function (err, rows) {

		if (err) {
			res.status(400).send(err.toString());
			return;
		}

		db.query('DELETE FROM Session WHERE accountId = ?;', [id], function (err, rows) {

			res.send({
				result: 'Account was deleted'
			});

		});

	});

});


/**
 * POST /api/accounts - Add an account
 */
router.post('/', function (req, res) {

	var account_name = req.body.name || null;
	var account_pw = req.body.pw || null;

	// Check the parameters
	if (account_name == null || account_pw == null) {
		res.status(400).send('Invalid parameters.');
		return;
	} else if (!account_name.match(/^[a-z0-9_\-]+$/)) {
		res.status(400).send('Available characters for account name: a-z, 0-9, underscore, hyphen');
		return;
	}

	// Make a hash string of the password
	account_pw = crypto.createHash('sha256').update(account_pw).digest('hex');

	// Insert to database
	var db = helper.getDB();
	db.query('SELECT * FROM Account LIMIT 1;', function (err, rows) {

		var role = 'MODERATOR';
		if (rows.length == 0) { // First account
			role = 'ADMIN';
		}

		db.query(
			'INSERT INTO Account(name, pw, role, createdAt) VALUES(?, ?, ?, ?)',
			[account_name, account_pw, role, new Date()],
			function (err, rows) {

				if (err) {
					res.status(400).send(err.toString());
				} else {
					res.send({
						result: 'Account created'
					});
				}

			}
		);

	});

});


/**
 * POST /api/sessions/signin - Sign in
 */
router.post('/signin', function (req, res) {

	var account_name = req.body.name || null;
	var account_pw = req.body.pw || null;

	// Check the parameters
	if (account_name == null || account_pw == null) {
		res.status(400).send('Invalid parameters.');
		return;
	}

	// Make a hash string of the password
	account_pw = crypto.createHash('sha256').update(account_pw).digest('hex');

	// Check the account
	var db = helper.getDB();
	db.query('SELECT * FROM Account WHERE name = ? AND pw = ?;',
		[account_name, account_pw],
		function (err, rows) {

			if (rows.length == 0) { // Error
				res.status(400).send('Account name or password was invalid.');
				return;
			}

			// Create a session key
			var session_id = account_name + '-' + Math.random(999999) + '-' + new Date().toString();
			console.log(session_id);
			session_id = crypto.createHash('sha256').update(session_id).digest('hex');

			// Insert to database
			db.query('INSERT INTO Session(id, accountId, createdAt) VALUES (?, ?, ?);',
				[session_id, rows[0].id, new Date()],
				function (err, rows) {

					// Done
					res.send({
						result: 'Signed in.',
						sessionId: session_id
					});

				}
			);

		}
	);

});


/**
 * POST /api/accounts/signout - Sign out
 */
router.post('/signout', function (req, res) {

	if (req.headers.sessionToken == null) {
		res.status(400).send('Invalid session.');
		return;
	}

	// Check the account
	var db = helper.getDB();
	db.query('DELETE FROM Session WHERE id = ?;', [req.headers.sessionToken], function (err, rows) {

		res.send('Signed out');

	});

});


// ----

module.exports = router;
