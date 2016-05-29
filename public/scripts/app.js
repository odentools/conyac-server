/**
 * Main Script for Frontend Application
 */

'use strict';

angular.module('DenHubControlPanelApp',
	['DenHubServerAPI', 'ngRoute', 'ngMaterial', 'ngStorage', 'ngSanitize', 'angular-loading-bar'])


/**
 * Filters
 */


.filter('substring', function() {
	return function(str, start, end) {
		return str.substring(start, end);
	};
})


.filter('zpadding', function() {
	return function(num, digit) {
		while(num.toString().length < digit){
			num = '0' + num.toString();
		}
		return num;
	};
})


/**
 * Configurations
 */


// Configuration for Angular Route
.config(function($routeProvider) {

	$routeProvider.
		when('/dashboard', {
			templateUrl: 'templates/dashboard.html',
			controller: 'DashboardPageCtrl'
		}).
		when('/accounts', {
			templateUrl: 'templates/accounts.html',
			controller: 'AccountsPageCtrl'
		}).
		when('/accounts/new', {
			templateUrl: 'templates/account-editor.html',
			controller: 'AccountEditorPageCtrl'
		}).
		when('/devices', {
			templateUrl: 'templates/devices.html',
			controller: 'DevicesPageCtrl'
		}).
		when('/devices/:id', {
			templateUrl: 'templates/device-editor.html',
			controller: 'DeviceEditorPageCtrl'
		}).
		when('/deviceTypes', {
			templateUrl: 'templates/device-types.html',
			controller: 'DeviceTypesPageCtrl'
		}).
		when('/deviceTypes/:id/commands', {
			templateUrl: 'templates/command-explorer.html',
			controller: 'CommandExplorerPageCtrl'
		}).
		when('/deviceTypes/:id/commands/:cmdName', {
			templateUrl: 'templates/command-explorer.html',
			controller: 'CommandExplorerPageCtrl'
		}).
		when('/tokens', {
			templateUrl: 'templates/tokens.html',
			controller: 'TokensPageCtrl'
		}).
		when('/tokens/:id', {
			templateUrl: 'templates/token-editor.html',
			controller: 'TokenEditorPageCtrl'
		}).
		when('/signin', {
			templateUrl: 'templates/signin.html',
			controller: 'SigninPageCtrl'
		}).
		when('/init', {
			templateUrl: 'templates/init.html',
			controller: 'InitPageCtrl'
		}).
		otherwise({
			redirectTo: '/dashboard'
		})
	;

})

// Configuration for Angular Resource
.config(function ($httpProvider) {

	$httpProvider.interceptors.push('authHttpRequestInterceptor');

})

// Configuration for Angular Material
.config(function ($mdThemingProvider) {

	// Theme setting for Angular Material
	$mdThemingProvider.theme('default')
	.primaryPalette('blue-grey')
	.accentPalette('blue')
	.backgroundPalette('grey');

})


/**
 * Controllers
 */


// Controller for Site
.controller('SessionCtrl', ['$scope', '$window', '$location', '$mdSidenav', 'Accounts', 'SessionService',
function($scope, $window, $location, $mdSidenav, Accounts, SessionService) {

	// Current Account
	$scope.account = null;

	// URL of Current Content
	$scope.currentContent = null;

	/**
	 * Toggle the Sidebar
	 */
	$scope.toggleMenu = function () {

		$mdSidenav('left').toggle();

	};


	/**
	 * Get the current account
	 * @return {[type]} [description]
	 */
	$scope.getCurrentAccount = function () {

		if (!SessionService.getToken()) return;

		Accounts.getCurrentAccount(function (account) { // Successful

			$scope.account = account;

		}, function () { // Failed

			console.log('Could not get the current account.');

			$scope.account = null;
			SessionService.saveToken(null);

			if (!$location.path().match(/^\/signin/)) {
				// Redirect to sign-in page
				$window.location = '/#/signin';
			}

		});

	};


	/**
	 * Sign out
	 */
	$scope.signOut = function() {

		Accounts.signOut(function (result) {

			$scope.account = {};
			SessionService.saveToken(null);
			$window.location = '/';

		}, function (err, status) {

			$scope.account = {};
			SessionService.saveToken(null);
			$window.location = '/';

		});

	};


	// ----

	$scope.getCurrentAccount();

	$scope.$watch(function () {

		if ($location.path().match(/^\/(.+)\//)) {
			$scope.currentContent = RegExp.$1;
		} else if ($location.path().match(/^\/(.+)/)) {
			$scope.currentContent = RegExp.$1;
		} else {
			$scope.currentContent = $location.path();
		}

		return $location.path();

	}, function (old_path, path) {

		if (!SessionService.getToken() && old_path != '/signin' && old_path != path && !path.match(/^\/signin/)) {
			// Redirect to sign-in page
			$window.location = '/#/signin';
		}

	});

	if (!SessionService.getToken() && !$location.path().match(/^\/signin/)) {
		// Redirect to sign-in page
		$window.location = '/#/signin';
	}

}])


// Controller for Dashboard Page
.controller('DashboardPageCtrl', ['$scope', '$location', '$mdDialog', '$interval', '$sanitize', 'Devices',
function($scope, $location, $mdDialog, $interval, $sanitize, Devices) {

	// Update Information
	$scope.updatedAt = null;
	$scope.errorText = null;

	// Online Devices
	$scope.onlineDevices = [];

	// Notification - Unapproved Devices
	$scope.unapprovedDevices = [];


	/**
	 * Get a list of devices
	 */
	$scope.getDashboardItems = function () {

		Devices.get({ approved: false },function (items) {
			$scope.unapprovedDevices = items;

			Devices.get({ isOnline: true },function (items) {
				$scope.onlineDevices = items;

				// Update the update information
				$scope.updatedAt = new Date();
				$scope.errorText = null;

			}, function (err, status) {
				$scope.errorText = err.statusText || err.status;
			});

		}, function (err, status) {
			$scope.errorText = err.statusText || err.status;
		});

	};


	/**
	 * Approve the Unapproved device
	 * @param  {Object} device Device data
	 * @param  {Event} $event  Click event of Angular Material
	 */
	$scope.approveDevice = function (device, $event) {

		// Show an dialog
		var dialog = $mdDialog.confirm({
			title: 'Approval of Device - ' + device.name,
			htmlContent: $sanitize('Would you approve this device?<br/>CAUTION: You shouldn\'t approve an unknown device.'),
			ok: 'APPROVE',
			cancel: 'CANCEL'
		});

		$mdDialog.show(dialog).then(function () { // OK

			Devices.approve({
				id: device.id
			}, function (data) {

				$scope.getDashboardItems();

			}, function (err, status) {
				console.warn(err);
			});

		}, function () { // Cancel

			return;

		});

	};


	/**
	 * Delete the unapproved device
	 * @param  {Number} id      Device ID
	 * @param  {Event}  $event  Click event of Angular Material
	 */
	$scope.deleteUnapprovedDevice = function (id, $event) {

		$event.stopPropagation();

		var dialog = $mdDialog.alert({
			title: 'Reject of Unapproved Device',
			ok: 'OK'
		});

		// Delete the item
		Devices.delete({
			id: id
		}, function (data) { // Successful

			// Show a message
			dialog.textContent(data.result);
			$mdDialog.show(dialog);

			// Reload
			$scope.getUnapprovedDevices();

		}, function (err, status) { // Failed

			// Show a message
			dialog.textContent('Error: ' + err.data);
			$mdDialog.show(dialog);

		});

	};


	// ----

	$scope.getDashboardItems();

	// Start a interval timer for updating
	var interval = $interval(function () {
		$scope.getDashboardItems();
	}, 5000);

	$scope.$on('$destroy', function () {
		$interval.cancel(interval);
	});

}])


// Controller for Tokens Page
.controller('TokensPageCtrl', ['$scope', '$mdDialog', 'APITokens',
function($scope, $mdDialog, APITokens) {

	// API Tokens
	$scope.apiTokens = [];


	/**
	 * Get the item list
	 */
	$scope.getApiTokens = function () {

		APITokens.get(function (items) {
			$scope.apiTokens = items;
		}, function (err, status) {
			console.log(err);
		});

	};


	/**
	 * Delete the item
	 * @param  {Number} id Item ID
	 */
	$scope.deleteApiToken = function (id) {

		// Show an dialog
		var dialog = $mdDialog.confirm({
			title: 'Deletion of API Token (ID: ' + id + ')',
			textContent: 'Would you delete this token?',
			ok: 'OK',
			cancel: 'CANCEL'
		});

		$mdDialog.show(dialog).then(function() { // OK

			// Delete the item
			APITokens.delete({
				id: id
			}, function (data) { // Successful

				// Show a message
				dialog = $mdDialog.alert({
					title: 'Deletion of API Token',
					textContent: data.result,
					ok: 'OK'
				});
				$mdDialog.show(dialog);

				// Reload
				$scope.getApiTokens();

			}, function (err, status) { // Failed

				// Show a message
				dialog = $mdDialog.alert({
					title: 'Deletion of API Token',
					textContent: 'Error: ' + err.data,
					ok: 'OK'
				});
				$mdDialog.show(dialog);

			});

		});

	};


	// ----

	$scope.getApiTokens();

}])


// Controller for Token Editor Page
.controller('TokenEditorPageCtrl', ['$scope', '$routeParams', '$location', '$mdDialog', 'APITokens',
function($scope, $routeParams, $location, $mdDialog, APITokens) {

	$scope.apiToken = {
		name: null,
		scope: 'DEVICE_API'
	};
	$scope.errorText = null;


	/**
	 * Get the item from server
	 * @param  {Number} id
	 */
	$scope.getApiToken = function (id) {

		// Get the item on the server
		APITokens.find({id: id}, function (data) { // Successful

			// Done
			$scope.apiToken = data;

		}, function (err, status) { // Failed

			var msg = err.data || 'Could not add the item.';
			var dialog = $mdDialog.alert({
				title: 'API Token',
				ok: 'OK'
			});
			dialog.textContent(msg);
			$mdDialog.show(dialog).then(function () {

				// Redirect
				$location.path('/tokens');

			});

		});

	};


	/**
	 * Create or Update the api token
	 * @param  {Object} api_token APIToken data
	 */
	$scope.send = function (api_token) {

		// Create the API Token
		APITokens.create(api_token, function (data) { // Successful

			// Show a message
			$scope.errorText = null;
			var dialog = $mdDialog.alert({
				title: 'API Token',
				ok: 'OK'
			});
			dialog.textContent(data.result);
			$mdDialog.show(dialog);

			// Done
			if ($scope.apiToken.id) {
				// Redirect
				$location.path('/tokens');
			} else {
				$scope.apiToken = data;
			}

		}, function (err, status) { // Failed

			// Show the error
			$scope.errorText = err.data || 'Could not create the item.';

		});

	};


	// ----

	if ($routeParams.id != null && $routeParams.id != 'new') {
		$scope.apiToken.id = $routeParams.id;
		$scope.getApiToken($routeParams.id);
	}


}])


// Controller for Device Manager Page
.controller('DevicesPageCtrl', ['$scope', '$mdDialog', 'Devices',
function($scope, $mdDialog, Devices) {

	// Devices
	$scope.devices = [];


	/**
	 * Get the item list
	 */
	$scope.getDevices = function () {

		Devices.get(function (items) {
			$scope.devices = items;
		}, function (err, status) {
			console.log(err);
		});

	};


	/**
	 * Delete the item
	 * @param  {Number} id Device ID
	 */
	$scope.deleteDevice = function (id) {

		// Show an dialog
		var dialog = $mdDialog.confirm({
			title: 'Deletion of Device (ID: ' + id + ')',
			textContent: 'Would you delete this device?',
			ok: 'OK',
			cancel: 'CANCEL'
		});

		$mdDialog.show(dialog).then(function() { // OK

			// Delete the item
			Devices.delete({
				id: id
			}, function (data) { // Successful

				// Show a message
				dialog = $mdDialog.alert({
					title: 'Deletion of Device',
					textContent: data.result,
					ok: 'OK'
				});
				$mdDialog.show(dialog);

				// Reload
				$scope.getDevices();

			}, function (err, status) { // Failed

				// Show a message
				dialog = $mdDialog.alert({
					title: 'Deletion of Device',
					textContent: 'Error: ' + err.data,
					ok: 'OK'
				});
				$mdDialog.show(dialog);

			});

		});

	};


	// ----

	$scope.getDevices();

}])


// Controller for Device Editor Page
.controller('DeviceEditorPageCtrl', ['$scope', '$routeParams', '$location', '$mdDialog', 'Devices',
function($scope, $routeParams, $location, $mdDialog, Devices) {

	$scope.device = {};
	$scope.errorText = null;


	/**
	 * Get the device from server
	 * @param  {Number} id
	 */
	$scope.getDevice = function (id) {

		// Get the item on the server
		Devices.find({id: id}, function (data) { // Successful

			// Done
			$scope.device = data;

		}, function (err, status) { // Failed

			var msg = err.data || 'Could not add the item.';
			var dialog = $mdDialog.alert({
				title: 'Device',
				ok: 'OK'
			});
			dialog.textContent(msg);
			$mdDialog.show(dialog).then(function () {

				// Redirect
				$location.path('/devices');

			});

		});

	};


	/**
	 * Create or Update the device
	 * @param  {Object} device Device data
	 */
	$scope.send = function (device) {

		// Create the item on the server
		Devices.create(device, function (data) { // Successful

			// Show a message
			$scope.errorText = null;
			var dialog = $mdDialog.alert({
				title: 'Device Manager',
				ok: 'OK'
			});
			dialog.textContent(data.result);
			$mdDialog.show(dialog);

			// Done
			if ($scope.device.id) {
				// Redirect
				$location.path('/devices');
			} else {
				$scope.device = data;
			}

		}, function (err, status) { // Failed

			// Show the error
			$scope.errorText = err.data || 'Could not add the item.';

		});

	};


	// ----

	if ($routeParams.id != null && $routeParams.id != 'new') {
		$scope.device.id = $routeParams.id;
		$scope.getDevice($routeParams.id);
	}

}])


// Controller for Device Type Manager Page
.controller('DeviceTypesPageCtrl', ['$scope', '$mdDialog', 'DeviceTypes',
function($scope, $mdDialog, DeviceTypes) {

	// DeviceTypes
	$scope.deviceTypes = [];


	/**
	 * Get the item list
	 */
	$scope.getDeviceTypes = function () {

		DeviceTypes.get(function (items) {
			$scope.deviceTypes = items;
		}, function (err, status) {
			console.log(err);
		});

	};


	// ----

	$scope.getDeviceTypes();

}])


// Controller for Command Explorer Page
.controller('CommandExplorerPageCtrl', ['$scope', '$mdDialog', '$routeParams', '$sanitize', 'DeviceTypes',
function($scope, $mdDialog, $routeParams, $sanitize, DeviceTypes) {

	// DeviceType
	$scope.deviceType = {};

	// Object for try the commands
	$scope.tryCmds = {};

	// Filter
	$scope.cmdName = $routeParams.cmdName || null;

	/**
	 * Get the device type
	 * @param {Number} id  ID
	 */
	$scope.getDeviceType = function (id) {

		DeviceTypes.find({id: id},
		function (data) {

			var commands = {};

			for (var cmd_name in data.commands) {

				if ($scope.cmdName && cmd_name != $scope.cmdName) continue;

				commands[cmd_name] = data.commands[cmd_name];

				// Initialize the tryCmds object
				$scope.tryCmds[cmd_name] = {
					args: {},
					result: null,
					isSuccessful: false
				};

				// Set a default value of the arguments
				var received_args = data.commands[cmd_name].args;
				for (var arg_name in received_args) {
					$scope.tryCmds[cmd_name].args[arg_name] = received_args[arg_name].default;
				}

			}

			data.commands = commands;
			$scope.deviceType = data;

		}, function (err, status) {
			console.log(err);
		});

	};


	/**
	 * Execute the command on the server
	 * @param {String} cmd_name  Command name
	 * @param {Object} cmd_args  Command arguments
	 */
	$scope.execCmd = function (cmd_name, cmd_args) {

		cmd_args.cmd = cmd_name;
		cmd_args.deviceKeyword = 'type=' + $scope.deviceType.id;


		DeviceTypes.execCmd(cmd_args,
		function (data) {

			$scope.tryCmds[cmd_name].isSuccessful = true;
			$scope.tryCmds[cmd_name].result = data.message;

		}, function (err, status) {

			var content = null;
			if (err.data.errors) {
				var errors = [];
				err.data.errors.forEach(function (err ,i) {
					errors.push('<li>' + err.replace(new RegExp('\\n', 'g'), '&nbsp;&nbsp;-&nbsp;&nbsp;') + '</li>');
				});
				content = $sanitize(err.data.message + '<br/><br/>' + errors.join(''));
			} else {
				content = err.data;
			}

			$scope.tryCmds[cmd_name].isSuccessful = false;
			$scope.tryCmds[cmd_name].result = content;

		});

	};


	// ----

	if ($routeParams.id) {
		$scope.getDeviceType($routeParams.id);
	}

}])


// Controller for Accounts Page
.controller('AccountsPageCtrl', ['$scope', '$mdDialog', 'Accounts',
function($scope, $mdDialog, Accounts) {

	// Accounts
	$scope.accounts = [];


	/**
	 * Get the accounts list
	 */
	$scope.getAccounts = function () {

		Accounts.get(function (items) {
			$scope.accounts = items;
		}, function (err, status) {
			console.log(err);
		});

	};


	/**
	 * Delete the account
	 * @param  {Number} id Account ID
	 */
	$scope.deleteAccount = function (id) {

		// Show an dialog
		var dialog = $mdDialog.confirm({
			title: 'Deletion of Account (ID: ' + id + ')',
			textContent: 'Would you delete this account?',
			ok: 'OK',
			cancel: 'CANCEL'
		});

		$mdDialog.show(dialog).then(function() { // OK

			// Delete the account
			Accounts.delete({
				id: id
			}, function (data) { // Successful

				// Show a message
				dialog = $mdDialog.alert({
					title: 'Deletion of Account',
					textContent: data.result,
					ok: 'OK'
				});
				$mdDialog.show(dialog);

				// Reload
				$scope.getAccounts();

			}, function (err, status) { // Failed

				// Show a message
				dialog = $mdDialog.alert({
					title: 'Deletion of Account',
					textContent: 'Error: ' + err.data,
					ok: 'OK'
				});
				$mdDialog.show(dialog);

			});

		});

	};


	// ----

	$scope.getAccounts();

}])


// Controller for Device Editor Page
.controller('DeviceEditorPageCtrl', ['$scope', '$routeParams', '$location', '$mdDialog', 'Devices',
function($scope, $routeParams, $location, $mdDialog, Devices) {

	$scope.device = {};
	$scope.errorText = null;


	/**
	 * Get the device from server
	 * @param  {Number} id
	 */
	$scope.getDevice = function (id) {

		// Get the item on the server
		Devices.find({id: id}, function (data) { // Successful

			// Done
			$scope.device = data;

		}, function (err, status) { // Failed

			var msg = err.data || 'Could not add the item.';
			var dialog = $mdDialog.alert({
				title: 'Device',
				ok: 'OK'
			});
			dialog.textContent(msg);
			$mdDialog.show(dialog).then(function () {

				// Redirect
				$location.path('/devices');

			});

		});

	};


	/**
	 * Create or Update the device
	 * @param  {Object} device Device data
	 */
	$scope.send = function (device) {

		// Create the item on the server
		Devices.create(device, function (data) { // Successful

			// Show a message
			$scope.errorText = null;
			var dialog = $mdDialog.alert({
				title: 'Device Manager',
				ok: 'OK'
			});
			dialog.textContent(data.result);
			$mdDialog.show(dialog);

			// Done
			if ($scope.device.id) {
				// Redirect
				$location.path('/devices');
			} else {
				$scope.device = data;
			}

		}, function (err, status) { // Failed

			// Show the error
			$scope.errorText = err.data || 'Could not add the item.';

		});

	};


	// ----

	if ($routeParams.id != null && $routeParams.id != 'new') {
		$scope.device.id = $routeParams.id;
		$scope.getDevice($routeParams.id);
	}

}])


// Controller for Account Editor Page
.controller('AccountEditorPageCtrl', ['$scope', '$location', '$mdDialog', 'Accounts',
function($scope, $location, $mdDialog, Accounts) {

	$scope.account = {};
	$scope.errorText = null;


	/**
	 * Create or Save the account
	 * @param  {Object} account Account data
	 */
	$scope.send = function (account) {

		// Create the account
		Accounts.create(account, function (data) { // Successful

			// Show a message
			$scope.errorText = null;
			var dialog = $mdDialog.alert({
				title: 'Creation of Account',
				ok: 'OK'
			});
			dialog.textContent(data.result);
			$mdDialog.show(dialog);

			// Redirect
			$location.path('/accounts');

		}, function (err, status) { // Failed

			// Show the error
			$scope.errorText = err.data || 'Could not create the item.';

		});

	};


}])


// Controller for Initialization Page
.controller('InitPageCtrl', ['$scope', '$location', '$mdDialog', 'Accounts',
function($scope, $location, $mdDialog, Accounts) {


	/**
	 * Create the account
	 * @param  {Object} account Account model
	 */
	$scope.createAccount = function(account) {

		Accounts.create(account,
			function (data) { // Successful

				// Show an dialog
				var dialog = $mdDialog.alert({
					title: 'Create account',
					textContent: data.result,
					ok: 'OK'
				});

				$mdDialog.show(dialog).finally(function() { // On dialog closed
					// Redirect to top page
					$location.path('/');
				});

			}, function (error, status) { // Failed

				$scope.errorText = error.data;

			}
		);

	};


}])


// Controller for Signin Page
.controller('SigninPageCtrl', ['$scope', '$window', '$localStorage', 'Accounts', 'SessionService',
function($scope, $window, $localStorage, Accounts, SessionService) {

	// Local storage
	$scope.$storage = $localStorage;

	// ----


	/**
	 * Signin with the account
	 * @param  {Object} account Account model
	 */
	$scope.signin = function(account) {

		Accounts.signIn(account,
			function(data) { // Successful

				SessionService.saveToken(data.sessionId);
				$window.location = '/';

			},
			function(error, status) { // Failed

				$scope.errorText = error.data;

			}
		);

	};


}])

// ----

;
