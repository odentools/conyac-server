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

	// Check the session token
	if (req.header('Authorization') && req.header('Authorization').match(/^Bearer (\S+)$/)) {

		var token = RegExp.$1;
		helper.getDB().query('SELECT * FROM Session WHERE id = ?;', [token], function (err, rows) {

			if (!err && 1 <= rows.length) {
				req.headers.sessionAccountId = rows[0].accountId;
				req.headers.sessionToken = rows[0].token;
			}

			// Done
			next();

		});

		return;

	}

	// Done
	next();

};
