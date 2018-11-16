/**
 *	IOCommander v2
 *	(c) 2018 by Siarhei Dudko.
 *
 *	PROCESS
 *  HTTP/HTTPS PUBLIC SERVER
 *	Worker процесс
 *
 */

"use strict"

if(typeof(process.env.NODE_ENV) !== 'string'){
	process.env.NODE_ENV === 'development';
}

//подгружаемые библиотеки
var CONFIG = require('config'),
	HTTP = require('http'),
	HTTPS = require('https'),
	PATH = require('path'),
	FS = require('fs');

//подгружаемые модули
var LOGGER = require(PATH.join(__dirname, 'module.logger.js')),
	PROCSTORE_SERVER = require(PATH.join(__dirname, 'procstore.server.js')),
	PROCSTORE_CONNECTION = require(PATH.join(__dirname, 'procstore.connection.js')),
	APP = require(PATH.join(__dirname, 'app.webserver.js'));
	
//глобальные переменные	
var timeout = 120000;	//таймаут соединения в мс

if(CONFIG.server.ssl && CONFIG.server.ssl.crt && CONFIG.server.ssl.ca && CONFIG.server.ssl.key){ //выбираю тип сервера
	var ssl = {
		key: ''+FS.readFileSync(CONFIG.server.ssl.key),
		cert: FS.readFileSync(CONFIG.server.ssl.crt) + '\n' + FS.readFileSync(CONFIG.server.ssl.ca)
	};
	var server = HTTPS.createServer(ssl, APP).setTimeout(timeout).listen(CONFIG.server.port, '0.0.0.0');
	LOGGER.log('https-сервер запущен на порту:' + CONFIG.server.port);
} else { 
	var server = HTTP.createServer(APP).setTimeout(timeout).listen(CONFIG.server.port, '0.0.0.0');
	LOGGER.log('http-сервер запущен на порту:' + CONFIG.server.port);
}