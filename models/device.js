/**
 * Device Model
 */

'use strict';

var helper = require(__dirname + '/helper');


/**
 * Constructor
 */
var Device = function () {

};


/**
 * Get an instance by the Device Token string
 * @param  {String} token Device Token string
 * @param  {Function} callback Callback function (error, device)
 */
Device.getInstanceByToken = function (token, callback) {

	var db = helper.getDB();
	db.query('SELECT * FROM Device WHERE deviceToken = ?;', [token], function (err, rows) {

		if (err) {
			callback(err, null);
			return;
		} else if (rows.length == 0) {
			callback(new Error('Device was not registered'), null);
			return;
		}

		callback(null, rows[0]);

	});

};
