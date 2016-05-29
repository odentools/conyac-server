/**
* Routes for /api/devices
 */

var express = require('express');
var router = express.Router();

var crypto = require('crypto'),	async = require('async');
var wsApi = require(__dirname + '/../_websocket-api'), helper = require(__dirname + '/../../models/helper');

/**
 * GET /api/deviceTypes - Get a list of the devices
 */
router.get('/', function (req, res) {

	var db = helper.getDB();
	db.query('SELECT DeviceType.*, COUNT(*) AS numOfDevices FROM DeviceType RIGHT OUTER JOIN Device \
ON Device.deviceTypeId = DeviceType.id GROUP BY Device.deviceTypeId;',
		function (err, rows) {

		if (err) throw err;

		console.log(rows);

		var devices = [];
		var now_time = new Date().getTime();

		rows.forEach(function (item, i) {

			delete item.deviceToken;

			var ws_con = wsApi.getConnectionByDeviceId(item.id);
			item.typeName = 'AAA';
			if (ws_con) {
				item.isConnected = true;
				item.ipAddress = ws_con.ipAddress;
			} else {
				item.isConnected = false;
				item.ipAddress = null;
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
