/**
 * Initialization Script
 */

var helper = require(__dirname + '/../models/helper');

var SQL_QUERIES = [

	// KVS
	'CREATE TABLE Kvs (\
		kvKey VARCHAR(255) NOT NULL PRIMARY KEY,\
		KvValue TEXT,\
		updatedAt DATETIME NOT NULL\
	);',

	// Account
	'CREATE TABLE Account (\
		id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,\
		name VARCHAR(20) NOT NULL UNIQUE,\
		pw TEXT NOT NULL,\
		role SET(\'USER\', \'MODERATOR\', \'ADMIN\'),\
		createdAt DATETIME NOT NULL\
	);',

	// Session
	'CREATE TABLE Session (\
		id VARCHAR(64) NOT NULL PRIMARY KEY,\
		accountId INT NOT NULL,\
		createdAt DATETIME NOT NULL,\
		FOREIGN KEY (accountId) REFERENCES Account(id),\
		INDEX (id),\
		INDEX (accountId)\
	);',

	// Device Type
	'CREATE TABLE DeviceType (\
		id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,\
		base_name VARCHAR(64) NOT NULL,\
		name VARCHAR(64) NOT NULL UNIQUE,\
		commands TEXT\
	);',

	// API Token
	'CREATE TABLE ApiToken (\
		id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,\
		name VARCHAR(20),\
		token VARCHAR(64) NOT NULL,\
		createdAccountId INT,\
		createdAt DATETIME NOT NULL,\
		FOREIGN KEY (createdAccountId) REFERENCES Account(id),\
		UNIQUE (name),\
		UNIQUE (token)\
	);',

	// API Hook
	'CREATE TABLE ApiHook (\
		id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,\
		name TEXT,\
		code TEXT,\
		createdAccountId INT,\
		createdAt DATETIME NOT NULL\
	);',

	// Relation for API Hook and API Token
	'CREATE TABLE RelationApiTokenHook (\
		id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,\
		apiTokenId INT NOT NULL,\
		apiHookId INT NOT NULL,\
		FOREIGN KEY (apiTokenId) REFERENCES ApiToken(id),\
		FOREIGN KEY (apiHookId) REFERENCES ApiHook(id)\
	);',

	// ACL for DeviceType from API Token
	'CREATE TABLE DeviceTypeAcl (\
		id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,\
		deviceCommandName VARCHAR(255),\
		deviceTypeId INT NOT NULL,\
		apiTokenId INT NOT NULL,\
		FOREIGN KEY (deviceTypeId) REFERENCES DeviceType(id),\
		FOREIGN KEY (apiTokenId) REFERENCES ApiToken(id),\
		UNIQUE (deviceCommandName, deviceTypeId, apiTokenId)\
	);',

	// Device
	'CREATE TABLE Device (\
		id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,\
		name VARCHAR(20) NOT NULL UNIQUE,\
		deviceToken VARCHAR(64) NOT NULL UNIQUE,\
		deviceTypeId INT,\
		commands TEXT,\
		createdAt DATETIME NOT NULL,\
		approvedAt DATETIME,\
		approvedAccountId INT NOT NULL,\
		lastConnectedAt DATETIME,\
		FOREIGN KEY (deviceTypeId) REFERENCES DeviceType(id),\
		FOREIGN KEY (approvedAccountId) REFERENCES Account(id)\
	);',

	// KVS for Device
	'CREATE TABLE DeviceKvs (\
		kvKey VARCHAR(255) NOT NULL,\
		KvValue TEXT,\
		deviceId INT NOT NULL,\
		updatedAt DATETIME NOT NULL,\
		FOREIGN KEY (deviceId) REFERENCES Device(id),\
		UNIQUE (kvKey, deviceId)\
	);'

];


// ----


var db = helper.getDB();

dropDatabase(function () {

	console.log('Executing queries...\n');
	execQuery(SQL_QUERIES, function () {
		console.log('Completed.');
		process.exit(0);
	});

});

return;


// ----


function dropDatabase(callback) {

	db.query('SELECT DATABASE();', function (err, rows) {

		if (err) throw err;

		var row = rows[0];
		var db_name = row['DATABASE()'];

		SQL_QUERIES.unshift('USE \`' + db_name + '\`;');
		SQL_QUERIES.unshift('CREATE DATABASE \`' + db_name + '\`;');
		SQL_QUERIES.unshift('DROP DATABASE IF EXISTS \`' + db_name + '\`;');

		callback();

	});

}


function execQuery(queries, callback) {

	if (queries.length == 0) {
		callback();
		return;
	}

	var query = queries[0].replace(/[\n\t]/g, ' ');
	console.log('  * ' + query + '\n');
	db.query(query, function (err, rows) {

		if (err) throw err;

		queries.shift();
		execQuery(queries, callback);

	});

}
