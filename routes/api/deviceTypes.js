/**
* Routes for /api/devices
 */

var express = require('express');
var router = express.Router();

var crypto = require('crypto'),	async = require('async'), SSpecParser = require('s-spec/models/parser');

var wsApi = require(__dirname + '/../_websocket-api'),
	helper = require(__dirname + '/../../models/helper');

/**
 * GET /api/deviceTypes - Get a list of the devices
 */
router.get('/', function (req, res) {

	var db = helper.getDB();
	db.query('SELECT DeviceType.*, COUNT(*) AS numOfDevices FROM DeviceType RIGHT OUTER JOIN Device \
ON Device.deviceTypeId = DeviceType.id GROUP BY Device.deviceTypeId;',
		function (err, rows) {

		if (err) throw err;

		var device_types = [];

		rows.forEach(function (item, i) {
			device_types.push(item);
		});

		res.send(device_types);

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

	// Get an item from the device type id
	var db = helper.getDB();
	db.query('SELECT * FROM DeviceType WHERE id = ?;', [id], function (err, rows) {

		if (err || rows.length == 0) {
			res.status(400).send('Item was not found ' + id);
			return;
		}

		var item = rows[0];

		try {
			item.commands = JSON.parse(item.commands);
		} catch (e) {
			item.commands = {};
		}

		// Parse the commands
		for (var cmd_name in item.commands) {
			var cmd = item.commands[cmd_name];
			for (var arg_name in cmd.args) {

				var arg = cmd.args[arg_name];
				try {
					var sspec = new SSpecParser(arg);
					arg = sspec;
					if (arg.type == 'STRING' || arg.type == 'TEXT') {
						arg.htmlInputType = 'text';
					} else if (arg.type == 'NUMBER' || arg.type == 'INTEGER' || arg.type == 'FLOAT') {
						arg.htmlInputType = 'number';
					} else if (arg.type == 'BOOLEAN') {
						arg.htmlInputType = null;
					}
				} catch (e) {
					arg = {};
				}

				cmd.args[arg_name] = arg;

			}
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
 * POST /api/devices/id - Update the device
 */
router.post('/:id', function (req, res) {

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


// ----

module.exports = router;
