/**
* WebSocket API
*/

var url = require('url'), querystring = require('querystring');
var helper = require(__dirname + '/../models/helper');

// Array for WebSocket Connections
var wsConnections = [];

// ----

module.exports = {


	/**
	 * Method for called when the new client was connected
	 * @param  {Object} ws Instance of ws library - https://github.com/websockets/ws
	 */
	onWsConnection: function (ws) {

		var self = module.exports;

		// Get an upgraded url from HTTP connection
		var location = url.parse(ws.upgradeReq.url, true).href;

		// Get an IP address
		ws.ipAddress = helper.getClientIPAddress(ws.upgradeReq);

		// Check a permission of the client
		self._checkClientPermission(ws, location, function (ws, location, device) { // Client is valid

			console.log('WebSocket client connected', ws.ipAddress, location, 'DeviceID=' + device.id);

			// Accept the connection
			wsConnections.push(ws);

			// Set the incoming event handlers to connection
			ws.on('message', function (message) {
				self._onWsMessage(ws, message);
			});

			// Set the disconnection event handlers to connection
			ws.on('error', function () {
				console.log('WebSocket client disconnected by error');
				wsConnections = wsConnections.filter(function (conn, i) {
					return (conn === ws) ? false : true;
				});
			});
			ws.on('close', function () {
				console.log('WebSocket client disconnected');
				wsConnections = wsConnections.filter(function (conn, i) {
					return (conn === ws) ? false : true;
				});
			});

		}, function (ws, location, error_text) { // Client is invalid

			console.log('WebSocket client connected but blocked', ws.ipAddress, location, error_text);
			ws.close();

		});

	},


	/**
	 * Get the connection by the Device ID
	 * @param  {Number} device_id Device ID
	 * @return {Object}           Connection instance of ws library
	 */
	getConnectionByDeviceId: function (device_id) {

		for (var i = 0, l = wsConnections.length; i < l; i++) {
			try {
				if (wsConnections[i].deviceId == device_id) {
					return wsConnections[i];
				}
			} catch (e) {
				console.log(e.toString);
			}
		}

		return null;

	},


	/**
	 * Check a permission of the connected client
	 * @param  {Object} ws Instance of ws library - https://github.com/websockets/ws
	 * @param  {String} location Upgraded url from HTTP connection
	 * @param  {Function} cb_success Callback for Successful - function (ws, location, device)
	 * @param  {Function} cb_success Callback for Failed - function (ws, location, error_text)
	 */
	_checkClientPermission: function (ws, location, cb_success, cb_failed) {

		var self = module.exports;

		// Parse a query string from the url
		var query = {};
		if (location.match(/\?([\S\s]+)$/)) {
			query = querystring.parse(RegExp.$1);
		}

		// Get the token string from query
		var token = query.token;
		if (token == null) {
			cb_failed(ws, location, 'Token was undefined');
			return;
		}

		var db = helper.getDB();
		db.query('SELECT * FROM Device WHERE deviceToken = ?;', [token], function (err, rows) {

			if (err) {
				cb_failed(ws, location, err.toString());
				return;
			} else if (rows.length == 0) {
				cb_failed(ws, location, 'Device was not registered');
				return;
			}

			// Add the device ID to the WebSocket connection
			var device = rows[0];
			ws.deviceId = device.id;

			// Update the lastConnectedAt field of the database
			db.query('UPDATE Device SET lastConnectedAt = ? WHERE id = ?;', [new Date(), device.id],
			function (err, result) {

				// Done
				cb_success(ws, location, device);

			});

		});

	},


	/**
	 * Method for called when the message was received
	 * @param  {Object} ws Instance of ws library - https://github.com/websockets/ws
	 * @param  {String} message Received message
	 */
	_onWsMessage: function (ws, message) {

		var self = module.exports;

		console.log('WebSocket message received', message);

	}


};
