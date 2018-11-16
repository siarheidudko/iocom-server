/**
 *	IOCommander v2
 *	(c) 2018 by Siarhei Dudko.
 *
 *	MODULE
 *  APP ROUTES
 *	ip to ban система
 *
 */

"use strict"

//подгружаемые библиотеки
var EXPRESS = require('express'),
	PATH = require('path'),
	CONFIG = require('config');
	
//подгружаемые модули
var PROCSTORE_CONNECTION = require(PATH.join(__dirname, 'procstore.connection.js'));

var v2version = EXPRESS.Router();

v2version.all('*', function(req, res, next){
	res.set({'Content-Type': 'application/json; charset=utf-8'});
	res.status(200).send(JSON.stringify({
		status:"ok",
		message: "IOCommander v"+PROCSTORE_CONNECTION.getState().version+" running on port "+CONFIG.server.port
	}));
});

module.exports = v2version;