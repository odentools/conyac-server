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
.controller('WholeCtrl', ['$scope', '$location', '$mdSidenav',
function($scope, $location, $mdSidenav) {


	$scope.toggleMenu = function () {
		$mdSidenav('left').toggle();
	};


	// ----


	$scope.$watch(function () {
		return $location.path();
	}, function (path) {
		$scope.locationPath = path;
	});

}])


// Controller for Dashboard Page
.controller('DashboardPageCtrl', ['$scope', '$location', '$localStorage', 'Accounts',
function($scope, $location, $localStorage, Accounts) {

	// Local storage
	$scope.storage = $localStorage;

	// ----


	// Check the session
	if ($scope.storage.conyacSessionId == null) {
		$location.path('/signin');
	}

}])


// Controller for Tokens Page
.controller('TokensPageCtrl', ['$scope', '$location', '$localStorage', 'Accounts',
function($scope, $location, $localStorage, Accounts) {

	// Local storage
	$scope.storage = $localStorage;

	// ----


	// Check the session
	if ($scope.storage.conyacSessionId == null) {
		$location.path('/signin');
	}

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
					textContent: data.data,
					ok: 'OK'
				});

				$mdDialog
				.show(dialog)
				.finally(function() { // On dialog closed
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
.controller('SigninPageCtrl', ['$scope', '$location', '$localStorage', 'Accounts',
function($scope, $location, $localStorage, Accounts) {

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

				$scope.$storage.conyacSessionId = data.sessionId;
				$location.path('/');

			},
			function(error, status) { // Failed

				$scope.errorText = error.data;

			}
		);

	};


}])

// ----

;
