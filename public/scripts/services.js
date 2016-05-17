/**
 * AngularJS Service for ConyacServer API
 */

angular.module('ConyacServerAPI', ['ngResource', 'ngStorage'])


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
				sessionToken = $localStorage.conyacSessionToken;
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
				$localStorage.conyacSessionToken = sessionToken;
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
		'/cp-api/accounts/:id',
		{
			id: '@id'
		},
		{
			signIn: {
				method: 'POST',
				url: '/cp-api/accounts/signin'
			},
			signOut: {
				method: 'POST',
				url: '/cp-api/accounts/signout'
			},
			get: {
				method: 'GET',
				isArray: true
			},
			getCurrentAccount: {
				method: 'GET',
				url: '/cp-api/accounts/@me'
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
			if (token) config.headers['Authorization'] = 'Bearer ' + token;

			return config;

		}

	};

}])

;
