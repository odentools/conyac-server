/**
 * Command Queues
 */

'use strict';

var crypto = require('crypto');
var wsApi = require(__dirname + '/../routes/_websocket-api');
var helper = require(__dirname + '/helper');
var common = require(__dirname + '/common');

var singletonInstance;


/**
 * Constructor
 */
var CommandQueues = function () {

	var self = this;

	self.timeLimitOfCmdResponse = 3000;

	self.queues = {};

	self.startCheckLoop();

};


/**
 * Get a singleton instance
 */
CommandQueues.getInstance = function () {

	if (singletonInstance) return singletonInstance;

	singletonInstance = new CommandQueues();
	return singletonInstance;

};


/**
 * Start the checking loop
 */
CommandQueues.prototype.startCheckLoop = function () {

	var self = this;

	self.checkTimer = setInterval(function () {

		for (var cmd_id in self.queues) {

			console.log(self.queues[cmd_id].cmdResponses.length, self.queues[cmd_id].numOfExpectedDevices);

			if (self.queues[cmd_id].cmdResponses.length < self.queues[cmd_id].numOfExpectedDevices) {

				// Check a timeout
				if (new Date().getTime() - self.queues[cmd_id].sentAt.getTime() < self.timeLimitOfCmdResponse) {
					// Safe; Wait for all response of other devices
					return;
				}

				for (var device_id in self.queues[cmd_id].deviceIds) {
					self.queues[cmd_id].cmdResponses.push({
						deviceId: device_id,
						responseError: device_id + ' was Timeout'
					});
				}


			}

			// Notify to sender
			console.log('Notify to sender');
			self.queues[cmd_id].sender.onCommandExecuted(cmd_id, self.queues[cmd_id].cmdResponses);

			// Remove the item from the queues
			self.queues[cmd_id].sender = null;
			delete self.queues[cmd_id];

		}

	}, 100);

};


/**
 * Send a command & Wait for callback
 * @param  {String} cmd_name		Name of the Command
 * @param  {Object} cmd_args		Arguments of the command
 * @param  {CommandSender} sender	ID of sender client
 * @param  {Array} target_ids		ID of the destination devices
 * @param  {Date} sent_date			Sent datetime of the command
 * @return {String} Commadn executed ID
 */
CommandQueues.prototype.fireCommand = function (cmd_name, cmd_args, sender, target_ids, sent_date) {

	var self = this;

	console.log('fireCommand');

	var cmd_id_salt = cmd_name + '|' + new Date().getTime() + '|' + Math.random();
	var cmd_id = crypto.createHash('sha256').update(cmd_id_salt).digest('hex');

	self.queues[cmd_id] = {
		cmdName: cmd_name,
		cmdArgs: cmd_args,
		sender: sender,
		targetIds: target_ids,
		numOfExpectedDevices: target_ids.length,
		cmdResponses: [],
		sentAt: sent_date
	};

	// Make a send data
	var send_data = {
		cmd: cmd_name,
		cmdExecId: cmd_id,
		args: cmd_args,
		sentAt: sent_date
	};

	// Send a data to each devices
	target_ids.forEach(function (device_id, index) {

		var ws_con = common.wsApi.getConnectionByDeviceId(device_id);
		if (ws_con) {

			console.log('CommonQueues - Send a data to ' + device_id);

			try {
				ws_con.send(JSON.stringify(send_data));
			} catch (e) {
				console.log('CommonQueues - Could not sent a data to ' + device_id);
				self.onCommandExecuted(cmd_id, device_id, null, 'Device ' + device_id + ' is offline');
			}

		}

	});

	// Return the command ID
	return cmd_id;

};


/**
 * To notify that the command has been executed
 * @param  {String} cmd_id			ID of the executed command
 * @param  {Integer} device_id		ID of the command executed device
 * @param  {Object} res_success		Successful result of the executed command
 * @param  {Object} res_error		Failed result of the executed command
 */
CommandQueues.prototype.onCommandExecuted = function (cmd_id, device_id, res_success, res_error) {

	var self = this;

	var queue = self.queues[cmd_id] || null;
	if (queue == null) return;

	// Save the response
	self.queues[cmd_id].cmdResponses.push({
		deviceId: device_id,
		responseSuccess: res_success,
		responseError: res_error
	});

};


// ----

module.exports = CommandQueues;
