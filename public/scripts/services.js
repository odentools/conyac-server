/**
 * AngularJS Service for DenHubServer API
 */

angular.module('DenHubServerAPI', ['ngResource', 'ngStorage'])


/**
 * Service for Session Management
 */
.factory('SessionService', ['$localStorage', function($localStorage) {

	var sessionToken = null;

	return {


		/**
		 * Get the saved session token
		 * @return {String} Token string
		 */
		getToken: function () {

			try {
				sessionToken = $localStorage.denhubSessionToken;
			} catch (e) { return sessionToken; }

			return sessionToken;

		},


		/**
		 * Save the session token
		 * @param  {String} token Token string
		 */
		saveToken: function (token) {

			sessionToken = token;

			try {
				$localStorage.denhubSessionToken = sessionToken;
			} catch (e) {
				return;
			}

		}


	};

}])


/**
 * Accounts API
 */
.factory('Accounts', ['$resource', function($resource) {

	return $resource(
		'/api/accounts/:id',
		{
			id: '@id'
		},
		{
			signIn: {
				method: 'POST',
				url: '/api/accounts/signin'
			},
			signOut: {
				method: 'POST',
				url: '/api/accounts/signout'
			},
			get: {
				method: 'GET',
				isArray: true
			},
			getCurrentAccount: {
				method: 'GET',
				url: '/api/accounts/@me'
			},
			find: {
				method: 'GET'
			},
			create: {
				method: 'POST'
			}
		}
	);

}])


/**
 * Devices API
 */
.factory('Devices', ['$resource', function($resource) {

	return $resource(
		'/api/devices/:id',
		{
			id: '@id'
		},
		{
			get: {
				method: 'GET',
				isArray: true
			},
			find: {
				method: 'GET'
			},
			create: {
				method: 'POST'
			},
			approve: {
				method: 'POST',
				url: '/api/devices/:id/approve'
			}
		}
	);

}])


/**
 * DeviceTypes API
 */
.factory('DeviceTypes', ['$resource', function($resource) {

	return $resource(
		'/api/deviceTypes/:id',
		{
			id: '@id',
			deviceKeyword: '@deviceKeyword',
			cmd: '@cmd'
		},
		{
			get: {
				method: 'GET',
				isArray: true
			},
			find: {
				method: 'GET'
			},
			create: {
				method: 'POST'
			},
			execCmd: {
				method: 'POST',
				url: '/api/devices/:deviceKeyword/:cmd'
			}
		}
	);

}])


/**
 * APITokens API
 */
.factory('APITokens', ['$resource', function($resource) {

	return $resource(
		'/api/tokens/:id',
		{
			id: '@id'
		},
		{
			get: {
				method: 'GET',
				isArray: true
			},
			find: {
				method: 'GET'
			},
			create: {
				method: 'POST'
			}
		}
	);

}])


/**
 * Interceptor for All Requests
 */
.factory('authHttpRequestInterceptor', ['SessionService', function (SessionService) {

	return {

		request: function (config) {

			var token = SessionService.getToken();
			if (token) config.headers['Authorization'] = 'Bearer CP-' + token;

			return config;

		}

	};

}])

;
