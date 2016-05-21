/**
* Routes for /api/devices
 */

var express = require('express');
var router = express.Router();

var crypto = require('crypto'),	async = require('async');

var wsApi = require(__dirname + '/../_websocket-api'), helper = require(__dirname + '/../../models/helper'),
	Device = require(__dirname + '/../../models/device');

/**
 * GET /api/devices - Get a list of the devices
 */
router.get('/', function (req, res) {

	var db = helper.getDB();

	// Filter
	var filter_approved = (req.query.approved && req.query.approved == 'false') ? false : true;

	// Find
	var query = 'SELECT Device.*, \
	DeviceType.name AS deviceTypeName, DeviceType.baseName AS deviceTypeBaseName, \
	Account.name AS approvedAccountName \
	FROM Device\
	LEFT JOIN DeviceType ON DeviceType.id = Device.deviceTypeId\
	LEFT JOIN Account ON Account.id = Device.approvedAccountId;';
	db.query(query,
		function (err, rows) {

		if (err) throw err;

		var devices = [];
		var now_time = new Date().getTime();

		rows.forEach(function (item, i) {

			delete item.deviceToken;

			var ws_con = wsApi.getConnectionByDeviceId(item.id);
			if (ws_con) {
				item.isConnected = true;
				item.ipAddress = ws_con.ipAddress;
			} else {
				item.isConnected = false;
				item.ipAddress = null;
			}

			if (req.query.isOnline && !item.isConnected) {
				return; // skip this item
			} else if (filter_approved && item.approvedAt == null) {
				return; // skip this item
			} else if (!filter_approved && item.approvedAt) {
				return;
			}

			try {
				item.commands = JSON.parse(item.commands);
			} catch (e) {
				item.commands = {};
			}

			devices.push(item);

		});

		res.send(devices);

	});

});


/**
 * GET /api/devices/:id - Get the device
 */
router.get('/:id', function (req, res) {

	var id = req.params.id;
	if (id == null) {
		res.status(400).send('Invalid parameter');
		return;
	}

	// Get an item from the device id
	var db = helper.getDB();
	db.query('SELECT * FROM Device WHERE id = ?;', [id], function (err, rows) {

		if (err || rows.length == 0) {
			res.status(400).send('Item was not found ' + id);
			return;
		}

		var item = rows[0];
		delete item.deviceToken;

		var ws_con = wsApi.getConnectionByDeviceId(item.id);
		if (ws_con) {
			item.isConnected = true;
			item.ipAddress = ws_con.ipAddress;
		} else {
			item.isConnected = false;
			item.ipAddress = null;
		}

		try {
			item.commands = JSON.parse(item.commands);
		} catch (e) {
			item.commands = {};
		}

		res.send(item);

	});

});


/**
 * DELETE /api/devices/:id - Delete the device
 */
router.delete('/:id', function (req, res) {

	var id = req.params.id;
	if (id == null) {
		res.status(400).send('Invalid parameter');
		return;
	}

	// Delete an item from the id
	var db = helper.getDB();
	db.query('DELETE FROM Device WHERE id = ?;', [id], function (err, rows) {

		var item = rows[0];
		res.send({
			result: 'Device (ID: ' + id + ') has been deleted.'
		});

	});

});


/**
 * POST /api/devices - Create the device
 */
router.post('/', function (req, res) {

	var name = req.body.name || null;

	// Check the parameters
	if (name == null || !name.match(/^[A-Za-z0-9_\-]+$/)) {
		res.status(400).send('Available characters for name of device: A-Z, a-z, 0-9, underscore, hyphen');
		return;
	}

	// Make a hash string of the device token
	var device_token = 'DEVICETOKEN_' + name + '_' + Math.random(999999) + '_' + new Date().toString();
	device_token = crypto.createHash('sha256').update(device_token).digest('hex');

	// Insert to database
	var db = helper.getDB();
	var now = new Date();
	db.query('INSERT INTO Device (name, deviceToken, createdAt, approvedAt, approvedAccountId) VALUES (?, ?, ?, ?, ?);',
	[name, device_token, now, now, req.headers.sessionAccountId], function (err, result) {

		if (err) {
			res.status(400).send(err.toString());
			return;
		}

		res.send({
			id: result.insertId,
			name: name,
			token: device_token,
			createdAt: now,
			approvedAt: now,
			approvedAccountId: req.headers.sessionAccountId,
			result: 'Device (ID: ' + result.insertId + ') has been created.'
		});

	});

});


/**
 * PUT /api/devices/:id - Update the device
 */
router.put('/:id', function (req, res) {

	var id = req.params.id || -1;
	var name = req.body.name || null;

	// Check the parameters
	if (name == null || !name.match(/^[A-Za-z0-9_\-]+$/)) {
		res.status(400).send('Available characters for name of device: A-Z, a-z, 0-9, underscore, hyphen');
		return;
	}

	// Update on the database
	var db = helper.getDB();
	var now = new Date();
	db.query('UPDATE Device SET name = ? WHERE id = ?;',
	[name, id], function (err, result) {

		if (err) {
			res.status(400).send(err.toString());
			return;
		}

		res.send({
			id: id,
			name: name,
			result: 'Device (ID: ' + id + ') has been updated.'
		});

	});

});


/**
 * POST /api/devices/:id/approve - Approve the device
 */
router.post('/:id/approve', function (req, res) {

	var id = req.params.id || -1;

	// Update on the database
	var db = helper.getDB();
	var now = new Date();
	db.query('UPDATE Device SET approvedAt = ?, approvedAccountId = ? WHERE id = ?;',
	[now, req.headers.sessionAccountId, id], function (err, result) {

		if (err) {
			res.status(400).send(err.toString());
			return;
		}

		res.send({
			id: id,
			result: 'Device (ID: ' + id + ') has been approved.'
		});

	});

});


/**
 * POST /api/devices/:deviceKeyword/exec - Execute the command on the device
 */
router.post('/:deviceKeyword/exec', function (req, res) {

	// Parse the device keyword
	var device_keyword = req.params.deviceKeyword;
	var device_id = null, device_name = null, device_type_id = null;
	if (device_keyword.match(/^([0-9]+)$/)) { // Device ID
		device_id = RegExp.$1;
	} else if (device_keyword.match(/^name=([a-zA-Z0-9_\-\=\*]+)$/)) { // Device Name
		device_name = RegExp.$1;
	} else if (device_keyword.match(/^type=([0-9]+)$/)) { // DeviceType ID
		device_type_id = RegExp.$1;
	} else if (device_keyword.match(/^typeName=([a-zA-Z0-9_\-\=\*]+)+$/)) { // DeviceType Name
		// TODO
	}

	// Check the parameter
	var cmd_name = req.body.cmd;
	if (cmd_name == null) {
		res.status(400).send('command was not defined');
		return;
	}


	// Make a callback function
	var sendCmdToDevices = function (req, res, send_data, device_ids) {

		var processed_device_ids = [], sent_device_ids = [], errors = [];

		device_ids.forEach(function (id, i) {

			var ws_con = wsApi.getConnectionByDeviceId(id);
			if (!ws_con) {
				errors.push('Device ' + id + ' is offline.');
				return; // skip
			}


			// Make an instance of Device model
			Device.getInstanceById(id, function (err, device) {

				if (device == null) {
					errors.push('Could not make an instance of Device model for ID ' + id + '.');
					processed_device_ids.push(id);
					return; // skip
				}

				// Validate the command arguments
				try {
					send_data.args = device.getValidCommandArgs(send_data.cmd, send_data.args);
				} catch (e) {
					errors.push(e.toString());
					return; // skip
				}

				// Send the command
				try {
					ws_con.send(JSON.stringify(send_data));
					sent_device_ids.push(id);
					console.log('sendCmdToDevices - Sent the command', id, send_data);
				} catch (e) {
					console.log('sendCmdToDevices - Could not sent the command', e.toString());
					errors.push('Could not sent the command', e.toString());
				}

				processed_device_ids.push(id);

			});

		});

		// Wait until processed the all clients
		var timer = setInterval(function () {

			if (device_ids.length == processed_device_ids.length) {
				clearInterval(timer);
			}

			// Send a result to the client
			var result = {
				message: 'Your command has sent to ' + sent_device_ids.length + ' devices within Device ID ' + device_ids.join(',') + '.',
				targetDevices: device_ids,
				numOfSentDevices: sent_device_ids.length,
				errors: errors,
				sentData: send_data,
				sentDevices: sent_device_ids
			};

			if (device_ids.length != 0 && sent_device_ids != 0) {
				res.status(400).send(result);
			} else {
				res.send(result);
			}

		}, 5);

	};

	// Build a send data
	var send_data = {
		cmd: cmd_name,
		args: {},
		sentAt: new Date()
	};
	for (var key in req.body) {
		if (key == 'cmd') continue;
		send_data.args[key] = req.body[key];
	}

	// Find the target devices
	var db = helper.getDB();
	if (device_id) {

		sendCmdToDevices(req, res, send_data, [device_id]);
		return;

	} else if (device_name) {

		device_name = device_name.replace('*', '%', 'g');

		// Find the device from the Device Name
		db.query('SELECT * FROM Device WHERE name LIKE ?;', [device_name], function (err, rows) {

			var device_ids = [];
			if (!err) {
				rows.forEach(function (row, i) {
					device_ids.push(row.id);
				});
			}

			sendCmdToDevices(req, res, send_data, device_ids);

		});
		return;

	} else if (device_type_id) {

		// Find the device from the DeviceType ID
		db.query('SELECT * FROM Device WHERE deviceTypeId = ?;', [device_type_id], function (err, rows) {

			var device_ids = [];
			if (!err) {
				rows.forEach(function (row, i) {
					device_ids.push(row.id);
				});
			}

			sendCmdToDevices(req, res, send_data, device_ids);

		});
		return;

	}

	res.status(502).send('Your requested device is not found.');

});


// ----

module.exports = router;
