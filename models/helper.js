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
				user: 'denhub-server',
				database: 'denhub-server'
			});
		}

		return dbCon;

	},


	/**
	 * Get the IP address of Client
	 * @param  {Object} req Request of Express.js
	 * @return {String}     IP address
	 */
	getClientIPAddress(req) {

		var ip_addr = null;
		var forwarded_for = req.headers['x-forwarded-for'];
		if (forwarded_for) {
			var forwarded_ips = forwarded_for.split(',');
			ip_addr = forwarded_ips[0];
		}

		if (!ip_addr) {
			ip_addr = req.connection.remoteAddress;
		}

		return ip_addr;

	}


};
