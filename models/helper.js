'use strict';

var mysql = require('mysql');

var dbCon = null;

module.exports = {


	/**
	 * Get an instance of MySQL database connection
	 * @return {Object} An instance of MySQL database
	 */
	getDB: function () {

		if (dbCon) return dbCon;

		if (process.env['CLEARDB_DATABASE_URL']) {
			dbCon = mysql.createPool(process.env['CLEARDB_DATABASE_URL']);
		} else {
			dbCon = mysql.createPool({
				host: 'localhost',
				user: 'conyac-server',
				database: 'conyac-server'
			});
		}

		return dbCon;

	}

};
