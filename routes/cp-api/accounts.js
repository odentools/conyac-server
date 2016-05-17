/**
 * Routes for /cp-api/accounts
 */

var express = require('express');
var router = express.Router();
var crypto = require('crypto'), helper = require(__dirname + '/../../models/helper');

// Example articles
var exampleArticles = [
	{
		title: 'Hello, World',
		content: 'Hi! This is an example article by OdenTools.'
	}
];


/**
 * POST /cp-api/accounts - Add an account
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

		if (rows.length == 0) { // First account

			db.query(
				'INSERT INTO Account(name, pw, role, createdAt) VALUES(?, ?, ?, ?)',
				[account_name, account_pw, 'ADMIN', new Date()],
				function (err, rows) {

					if (err) {
						res.status(400).send(err.toString());
					} else {
						res.send({
							data: 'Account created'
						});
					}

				}
			);
			return;

		} else { // TODO: Normal account

			res.status(400).send('This API is not implemented.');

		}

	});

});


/**
 * POST /cp-api/sessions/signin - Sign in
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
						data: 'Signed in.',
						sessionId: session_id
					});

				}
			);

		}
	);

});


/**
 * GET /api/articles/:id - Get the article as single
 */
router.get('/:id', function (req, res) {

	var article_id = req.params.id;
	if (exampleArticles[article_id] == null) {
		res.sendStatus(404);
		return;
	}

	// Get the article
	var article_data = exampleArticles[article_id];

	// Send a response
	res.send({
		article: article_data
	});

});


// ----

module.exports = router;
