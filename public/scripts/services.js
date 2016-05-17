/**
 * AngularJS Service for ConyacServer API
 */

angular.module('ConyacServerAPI', ['ngResource'])


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
				method :'POST',
				url: '/cp-api/accounts/signin'
			},
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

}]);
