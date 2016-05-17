/**
 * Main Script for Frontend Application
 */

'use strict';

angular.module('ConyacControlPanelApp',
	['ConyacServerAPI', 'ngRoute', 'ngMaterial', 'ngStorage', 'angular-loading-bar'])


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
		when('/devices', {
			templateUrl: 'templates/devices.html',
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
		when('/tokens', {
			templateUrl: 'templates/tokens.html',
			controller: 'TokensPageCtrl'
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

		$scope.locationPath = $location.path();
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
.controller('DashboardPageCtrl', ['$scope', '$location', '$localStorage', 'Accounts',
function($scope, $location, $localStorage, Accounts) {

}])


// Controller for Tokens Page
.controller('TokensPageCtrl', ['$scope', '$location', '$localStorage', 'Accounts',
function($scope, $location, $localStorage, Accounts) {

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


// Controller for Account Editor Page
.controller('AccountEditorPageCtrl', ['$scope', '$location', '$mdDialog', 'Accounts',
function($scope, $location, $mdDialog, Accounts) {

	$scope.account = {};


	/**
	 * Create or Save the account
	 * @param  {Object} account Account data
	 */
	$scope.send = function (account) {

		// Make a dialog
		var dialog = $mdDialog.alert({
			title: 'Creation of Account',
			ok: 'OK'
		});

		// Create the account
		Accounts.create(account, function (data) { // Successful

			// Show a message
			dialog.textContent(data.result);
			$mdDialog.show(dialog);

			// Redirect
			$location.path('/accounts');

		}, function (err, status) { // Failed

			// Show a message
			dialog.textContent('Error: ' + err.data);
			$mdDialog.show(dialog);

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
