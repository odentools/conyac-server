/**
* WebSocket API
*/

var url = require('url'), querystring = require('querystring'), crypto = require('crypto'),
	jsonStableStringify = require('json-stable-stringify');

var Device = require(__dirname + '/../models/device'), helper = require(__dirname + '/../models/helper');

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

			if (!device.approvedAt) { // Unapproved device
				console.log('WebSocket client connected', ws.ipAddress, location, 'DeviceID=' + device.id, 'Unapproved');
			} else { // Approved device
				console.log('WebSocket client connected', ws.ipAddress, location, 'DeviceID=' + device.id, 'Approved');
			}

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

		// Get the Device Name string from query
		var name = query.deviceName || null;

		// Get the Device Token string from query
		var token = query.deviceToken || '';

		// Find the device from the database
		var db = helper.getDB();
		db.query('SELECT * FROM Device WHERE deviceToken = ?;', [token], function (err, rows) {

			if (err) {
				cb_failed(ws, location, err.toString());
				return;

			} else if (rows.length == 0) { // Device was not registered

				if (name == null) {
					cb_failed(ws, location, 'This anonymous device could not registered', token);
					return;
				}

				// If necessary, generate the token string
				var is_generated_token = false;
				if (token == '') {
					token = 'DEVICETOKEN_' + name + '_' + Math.random(999999) + '_' + new Date().toString();
					token = crypto.createHash('sha256').update(token).digest('hex');
					is_generated_token = true;
				}

				// Add the unapproved device
				console.log('This device are unapproved', name, token);
				var now = new Date();
				db.query('INSERT Device(name, deviceToken, createdAt, lastConnectedAt) VALUES (?, ?, ?, ?);',
				[name, token, now, now],
				function (err, result) {

					if (err) {
						cb_failed(ws, location, err.toString());
						return;
					}

					// Add the device ID to the WebSocket connection
					ws.deviceId = result.insertId;

					// Send a token
					if (is_generated_token) {
						ws.send(JSON.stringify({
							cmd: '_changeToken',
							token: token
						}));
					}

					// Done
					var device = {
						name: name,
						deviceToken: token,
						createdAt: now,
						lastConnectedAt: now
					};
					cb_success(ws, location, device);

				});
				return;

			}

			// Add the device ID to the WebSocket connection
			var device = rows[0];
			ws.deviceId = device.id;

			// Update the lastConnectedAt field on the database
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

		var data = {};
		try {
			data = JSON.parse(message);
		} catch (e) {
			console.warn('Unknown message', e.toString());
		}

		if (data.cmd == '_sendManifests') {
			self._registerDeviceManifest(ws, ws.deviceId, data.commands, data.typeName);
		}

	},


	/**
	 * Get the device object from Device ID
	 * @param  {Number} device_id Devce 5D
	 * @param  {Function} callback function - function (error_text, device)
	 */
	_getDevice: function (device_id, callback) {

		var self = module.exports;

		var db = helper.getDB();
		db.query('SELECT * FROM Device WHERE id = ?', [device_id], function (err, rows) {

			if (err || rows.length == 0) {
				callback('Could not get the device', null);
				return;
			}

			callback(null, rows[0]);

		});


	},


	/**
	 * Register the commands definition to the database.
	 * It also generate the Device Type.
	 * @param  {Object} ws Instance of ws library - https://github.com/websockets/ws
	 * @param  {Number} device_id Devce ID
	 * @param  {Object} commands Commands
	 * @param  {String} base_type_name Device type name which self-reported from the device
	 */
	_registerDeviceManifest: function (ws, device_id, commands, base_type_name) {

		var self = module.exports;

		var db = helper.getDB();

		self._getDevice(device_id, function (error_text, device) {

			if (error_text) {
				console.warn(error_text);
				return false;
			}

			// Make a json from commands
			var commands_json = jsonStableStringify(commands, function (a, b) {
				return a.key < b.key ? 1 : -1;
			});

			// Get the number of the same DeviceType with this device
			var type_id = device.deviceTypeId;
			db.query('SELECT * FROM Device WHERE deviceTypeId = ?;', [type_id], function (err, rows) {

				if (err) {
					console.warn(err.toString());
					return;
				}

				// Get the number of related device from the DeviceType
				var num_of_related_device = rows.length;

				// Get the current DeviceType from the database
				db.query('SELECT * FROM DeviceType WHERE id = ?;', [type_id], function (err, rows) {

					if (err) {
						console.warn(err.toString());
						return;
					}

					// Compare the commands of the current DeviceType with device
					var device_type = rows[0] || {};
					if (rows.length == 1 && rows[0].commands != null && rows[0].commands == commands_json) {
						console.log('Commands are not changed', 'DeviceId=' + device_id, 'DeviceTypeId=' + type_id);
						return false; // commands are not changed
					}

					// Find the similar Device Type
					db.query('SELECT * FROM DeviceType WHERE baseName = ?;', [base_type_name], function (err, rows) { // Commands was matched

						if (err) {
							console.warn(err.toString());
							return false;
						}

						// Compare the commands of the DeviceType with the device
						for (var i = 0; i < rows.length; i++) {

							var similar_type_id = rows[i].id;

							if (rows[i].commands != null && rows[i].commands == commands_json) { // Commands was matched to similar device type

								console.log('DeviceType has been merged', 'DeviceId=' + device_id, 'DeviceTypeId(Src)=' + type_id, 'DeviceTypeId(Dst)=' + similar_type_id);

								// Change the deviceTypeId of the device to the similar DeviceType
								db.query('UPDATE Device SET commands = ?, deviceTypeId = ? WHERE id = ?;', [commands_json, similar_type_id, device_id],
								function (err, result) {
									if (err) console.warn('Could not update the device type', err.toString());
								});

								// Merge the DeviceType to the similar DeviceType
								db.query('DELETE FROM DeviceType WHERE id = ?;', [type_id],
								function (err, result) {
									if (err) console.warn('Could not merge the device type', err.toString());
								});

								return true;

							}

						}

						// Create or Update of DeviceType
						if (num_of_related_device == 1) {

							console.log('Device Type has been updated', 'DeviceId=' + device_id, 'DeviceTypeId=' + type_id, 'DeviceTypeName=' + device_type.name);

							// Update the commands of type device type
							db.query('UPDATE DeviceType SET baseName = ?, commands = ? WHERE id = ?;', [base_type_name, commands_json, type_id],
							function (err, result) {

								if (err) console.warn('Could not update the device type', err.toString());

							});

							// Update the commands of the device
							db.query('UPDATE Device SET commands = ? WHERE id = ?;', [commands_json, device_id],
							function (err, result) {

								if (err) console.warn(err.toString());

							});

						} else {

							// Make a name of the new device type
							var type_name = base_type_name || device.name;
							type_name += '-' + crypto.createHash('sha1').update(commands_json).digest('hex');

							// Make the new device type
							console.log('Device Type has been created', 'DeviceId=' + device_id, 'DeviceTypeId=NEW', 'DeviceTypeName=' + type_name);
							db.query('INSERT INTO DeviceType(name, baseName, commands) VALUES(?, ?, ?);', [type_name, base_type_name, commands_json],
							function (err, result) {

								if (err) {
									console.warn('Could not make the device type', err.toString());
									return;
								}

								type_id = result.insertId;

								// Update the device type ID and commands of the device
								db.query('UPDATE Device SET deviceTypeId = ?, commands = ? WHERE id = ?;', [type_id, commands_json, device_id],
								function (err, result) {

									if (err) console.warn(err.toString());

								});

							});

						}

					});

				});

			});

		});

	}


};
