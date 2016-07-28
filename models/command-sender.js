/**
 * Command Sender
 */

'use strict';

var helper = require(__dirname + '/helper');


/**
 * Constructor
 * @param {Ws} Instance of WebSocket connection
 */
var CommandSender = function (ws_instance) {

	this.httpReq = null;
	this.httpRes = null;
	this.wsInstance = null;

};


/**
 * Make an instance from the http request
 * @param  {Request} req	Request object of Express.js
 * @param  {Response} res	Response object of Express.js
 * @return {CommandSender}     Instance
 */
CommandSender.getInstanceByHttpReq = function(req, res) {

	var instance = new CommandSender();
	instance.httpReq = req;
	instance.httpRes = res;

	return instance;

};


/**
 * Make an instance from the WebSocket connection
 * @param  {Ws} ws_instance		WebSocket connection
 * @return {CommandSender}     Instance
 */
CommandSender.getInstanceByWs = function(ws_instance) {

	var instance = new CommandSender();
	instance.wsInstance = ws_instance;

	return instance;

};


/**
 * To notify that the command has been executed
 * @param  {String} cmd_id			ID of the executed command
 * @param  {Array} responses		Array of the reponses of each devices
 */
CommandSender.prototype.onCommandExecuted = function (cmd_id, responses) {

	var self = this;

	console.log('onCommandExecuted');

	// Listup the devices
	var device_ids = [];
	responses.forEach(function (cmd_response, index) {
		device_ids.push(cmd_response.deviceId);
	});

	// Listup the execution successful or failed devices
	var success_device_ids = [], failed_device_ids = [], success_responses = [], error_responses = [];
	responses.forEach(function (cmd_response, index) {
		if (cmd_response.responseSuccess) {
			success_device_ids.push(cmd_response.deviceId);
			success_responses.push(cmd_response.responseSuccess);
		} else {
			failed_device_ids.push(cmd_response.deviceId);
			error_responses.push(cmd_response.responseError);
		}
	});

	// Make a send data
	var message = 'Your command has sent to ' + success_device_ids.length + ' devices within Device ID ' + device_ids.join(',') + '.';
	var response_data = {
		cmdExecId: cmd_id,
		devices: device_ids,
		successDevices: success_device_ids,
		successResponses: success_responses,
		errorDevices: failed_device_ids,
		errorResponses: error_responses,
		summaryMessage: message
	};

	// Send a response to the sender
	if (self.wsInstance) { // WebSocket connection

		try {
			self.wsInstance.send(JSON.stringify({
				cmd: '_sendCmdResponse',
				args: response_data
			}));
		} catch (e) {
			console.warn('CommandSender - onCommandExecuted - Could not sent a response: ' + e);
		}

	} else if (self.httpReq && self.httpRes) { // HTTP request

		if (0 < success_responses.length) {
			self.httpRes.send(response_data);
		} else {
			self.httpRes.status(400).send(response_data);
		}

	}

};


// ----

module.exports = CommandSender;
