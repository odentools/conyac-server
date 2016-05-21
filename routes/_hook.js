'use strict';

var helper = require(__dirname + '/../models/helper');


/**
 * Hook for all requests on the server
 */
module.exports = function (req, res, next) {

	// Allow the Cross Domain Request from JavaScript
	res.header('Access-Control-Allow-Origin', '*');

	// Clear the session information
	req.headers.sessionAccountId = null;
	req.headers.sessionToken = null;
	req.headers.apiTokenId = null;
	req.headers.apiTokenScope = null;

	// Check the access to API via API Token
	var api_token = req.query.token || req.params.token || null;
	console.log(api_token);
	if (api_token) {

		helper.getDB().query('SELECT * FROM ApiToken WHERE token = ?;', [api_token], function (err, rows) {

			if (!err && 1 <= rows.length) { // Access with API Token
				req.headers.apiTokenId = rows[0].id;
				req.headers.apiTokenScope = rows[0].scope;

				if (req.headers.apiTokenScope == 'DEVICE_API') { // API Token for DEVICE_API
					// Check the request
					if (!req.path.match(/^\/api\/devices/)) {
						res.status(403).send('Your token (scope=DEVICE_API) doesn\'t have sufficient authority.');
						return;
					} else if (req.method != 'GET' && !(req.method == 'POST' && req.path.match(/^\/api\/devices\/([a-zA-Z0-9\=\_\-\*]+)\/exec$/))) {
						res.status(403).send('Your token (scope=DEVICE_API) doesn\'t have sufficient authority for this HTTP method.');
						return;
					}
				}

			} else { // Access with Invalid Token (Guest)
				// Check the request url
				if (req.path.match(/^\/api\//)) {
					res.status(403).send('Your token was invalid.');
					return;
				}
			}

			// Done
			next();

		});

		return;

	}

	// Check the session token
	if (req.header('Authorization') && req.header('Authorization').match(/^Bearer (\S+)$/)) {

		var session_token = RegExp.$1;
		helper.getDB().query('SELECT * FROM Session WHERE id = ?;', [session_token], function (err, rows) {

			if (!err && 1 <= rows.length) { // Access with Session of Account
				req.headers.sessionAccountId = rows[0].accountId;
				req.headers.sessionToken = rows[0].token;
			} else { // Access with Invalid Session (Guest)
				// Check the request
				if (req.path.match(/^\/api\//) && !req.path.match(/^\/api\/accounts\/signin/)) {
					res.status(403).send('Your session was invalid.');
					return;
				}
			}

			// Done
			next();

		});

		return;

	}

	// Done
	next();

};
