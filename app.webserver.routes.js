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
var IP2BAN = require(PATH.join(__dirname, 'app.ip2ban.js')),
	V2VERSION = require(PATH.join(__dirname, 'app.webserver.routes.v2.version.js')),
	V2UPLOAD = require(PATH.join(__dirname, 'app.webserver.routes.v2.upload.js'));

var routes = EXPRESS.Router();
var v2route = EXPRESS.Router();

routes.use(IP2BAN.authadmin);	//далее доступ только с авторизацией
routes.all('/v2/*', v2route);	//маршрут 2 версии

v2route.all('/v2/version', V2VERSION);	//маршрут /v2/version
v2route.all('/v2/upload', V2UPLOAD);	//маршрут /v2/upload

module.exports = routes;