/**
 * Device Model
 */

'use strict';

var sSpecValidator = require('s-spec');
var helper = require(__dirname + '/helper');


/**
 * Constructor
 */
var Device = function (device) {

	this.id = device.id;
	this.commands = device.commands;

};


/**
 * Get an instance by the Device ID
 * @param  {Number} id          Device ID
 * @param  {Function} callback  Callback function (error, device)
 */
Device.getInstanceById = function (id, callback) {

	var db = helper.getDB();
	db.query('SELECT * FROM Device WHERE id = ?;', [id], function (err, rows) {

		if (err) {
			callback(err, null);
			return;
		} else if (rows.length == 0) {
			callback(new Error('Device not found'), null);
			return;
		}

		var device = new Device(rows[0]);
		callback(null, device);

	});

};


/**
 * Get the valid command arguments through validation from the command arguments
 * @param  {String} cmd_name  Command name
 * @param  {Object} args      Arguments of the command
 * @return {Object} Valid args
 * @throws {Error} It throws error when the command arguments has an invalid value
 */
Device.prototype.getValidCommandArgs = function (cmd_name, args) {

	var self = this;

	// Get the specifications of the command
	if (self.commands[cmd_name]) {
		throw new Error('Command not found: ' + cmd_name);
	}
	var cmd_specs = self.commands[cmd_name];

	// Get the valid arguments
	var valid_args = {};
	for (var arg_name in cmd_specs) {
		var spec = cmd_specs[arg_name];
		if (!sSpecValidator.isValid(cmd_specs[arg_name])) {
			throw new Error('Command argument invalid: ' + arg_name);
		}
		valid_args[arg_name] = sSpecValidator.getValidValue(spec, args[arg_name]);
	}

	return valid_args;

};


/**
 * Get an instance by the Device Token string
 * @param  {String} token Device Token string
 * @param  {Function} callback Callback function (error, device)
 */
Device.execCommand = function (token, callback) {

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


// ----

module.exports = Device;
