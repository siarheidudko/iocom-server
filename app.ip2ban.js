/**
 *	IOCommander v2
 *	(c) 2018 by Siarhei Dudko.
 *
 *	MODULE
 *  APP IP2BAN
 *	ip to ban система
 *
 */

"use strict"

//подгружаемые библиотеки
var EXPRESS = require('express'),
	PATH = require('path'),
	CONFIG = require('config');
	
//подгружаемые модули
var LOGGER = require(PATH.join(__dirname, 'module.logger.js')),
	PROCSTORE_SERVER = require(PATH.join(__dirname, 'procstore.server.js')),
	PROCSTORE_CONNECTION = require(PATH.join(__dirname, 'procstore.connection.js')),
	FUNCTIONS = require(PATH.join(__dirname, 'module.functions.js'));

//проверка на блокировку
var ip2banTEST = EXPRESS.Router();
ip2banTEST.use(function (req, res, next) {
	if(CONFIG.server.bantimeout){
		if(typeof(PROCSTORE_CONNECTION.getState().iptoban) === 'object'){
			if(typeof(PROCSTORE_CONNECTION.getState().iptoban[FUNCTIONS.replacer(req.ip, true)]) === 'object') {
				var ThisSocketAttemp = PROCSTORE_CONNECTION.getState().iptoban[FUNCTIONS.replacer(req.connection.remoteAddress, true)].attemp;
				var ThisSocketDatetime = PROCSTORE_CONNECTION.getState().iptoban[FUNCTIONS.replacer(req.connection.remoteAddress, true)].datetime;
			}
		}
		if(typeof(ThisSocketAttemp) !== 'number'){
			ThisSocketAttemp = 0;
		}
		if(typeof(ThisSocketDatetime) !== 'number'){
			ThisSocketDatetime = 0;
		}
		if((ThisSocketAttemp > 5) && ((ThisSocketDatetime + CONFIG.server.bantimeout) > Date.now())){
			res.set({'Content-Type': 'text/plain; charset=utf-8'});
			res.status(403).send(JSON.stringify({
				status: "error",
				message: 'Your ip is locked, wellcome after '+parseInt((CONFIG.server.bantimeout-(Date.now()-ThisSocketDatetime)) / 60000)+' minutes.'
			}));
			LOGGER.warn("Попытка входа на web-сервер с заблокированного адреса " + req.connection.remoteAddress);
		} else {
			next();
		}
	} else {
		next();
	}
});

//авторизация
var ip2banAuthADMIN = EXPRESS.Router();
ip2banAuthADMIN.use(function (req, res, next) {
	var auth = req.get('authorization');
	if(!auth){
		res.set({'WWW-Authenticate': 'Basic realm="Secure Area"', 'Content-Type': 'application/json; charset=utf-8'});
		res.status(401).send(JSON.stringify({
			status: "error",
			message: "Permission denied"
		}));
	} else {
		try{
			var tmp = auth.split(' ');
			var buf = Buffer.from(tmp[1], 'base64');
			var plain_auth = buf.toString();
			var creds = plain_auth.split(':'); 
			var username = FUNCTIONS.replacer(creds[0], true);
			res.locals.username = creds[0];
			var password = creds[1];
			if (((PROCSTORE_SERVER.getState().admins[username] === password) || 
				(PROCSTORE_SERVER.getState().admins[username] === FUNCTIONS.hasher(creds[0]+password+'icommander'))) && 
				(typeof(PROCSTORE_SERVER.getState().admins[username]) !== 'undefined')) {
				next();
			} else {
				PROCSTORE_CONNECTION.dispatch({type:'WRONG_PASS', payload: {address:FUNCTIONS.replacer(req.connection.remoteAddress, true)}});
				res.set({'WWW-Authenticate': 'Basic realm="Secure Area"', 'Content-Type': 'application/json; charset=utf-8'});
				res.status(401).send(JSON.stringify({
					status: "error",
					message: "Permission denied"
				}));
			}
		} catch(e){
			try {
				res.set({'Content-Type': 'text/plain; charset=utf-8'});
			} catch(e){}
			res.status(500).send(JSON.stringify({
				status: "error",
				message: "Internal Server Error"
			}));
			LOGGER.error("Ошибка проверки пароля для доступа к web(POST)-серверу!");
		}
	}
});

//авторизация
var ip2banAuthALL = EXPRESS.Router();
ip2banAuthALL.use(function (req, res, next) {
	var auth = req.get('authorization');
	if(!auth){
		res.set({'WWW-Authenticate': 'Basic realm="Secure Area"', 'Content-Type': 'application/json; charset=utf-8'});
		res.status(401).send(JSON.stringify({
			status: "error",
			message: "Permission denied"
		}));
	} else {
		try{
			var tmp = auth.split(' ');
			var buf = Buffer.from(tmp[1], 'base64');
			var plain_auth = buf.toString();
			var creds = plain_auth.split(':'); 
			var username = FUNCTIONS.replacer(creds[0], true);
			res.locals.username = creds[0];
			var password = creds[1];
			if ((((PROCSTORE_SERVER.getState().admins[username] === password) || 
				 (PROCSTORE_SERVER.getState().admins[username] === FUNCTIONS.hasher(creds[0]+password+'icommander'))) && 
				 (typeof(PROCSTORE_SERVER.getState().admins[username]) !== 'undefined')) ||
				(((PROCSTORE_SERVER.getState().users[username] === password) || 
				 (PROCSTORE_SERVER.getState().users[username] === FUNCTIONS.hasher(creds[0]+password+'icommander'))) && 
				 (typeof(PROCSTORE_SERVER.getState().users[username]) !== 'undefined'))) {
				next();
			} else {
				PROCSTORE_CONNECTION.dispatch({type:'WRONG_PASS', payload: {address:FUNCTIONS.replacer(req.connection.remoteAddress, true)}});
				res.set({'WWW-Authenticate': 'Basic realm="Secure Area"', 'Content-Type': 'application/json; charset=utf-8'});
				res.status(401).send(JSON.stringify({
					status: "error",
					message: "Permission denied"
				}));
			}
		} catch(e){
			try {
				res.set({'Content-Type': 'text/plain; charset=utf-8'});
			} catch(e){}
			res.status(500).send(JSON.stringify({
				status: "error",
				message: "Internal Server Error"
			}));
			LOGGER.error("Ошибка проверки пароля для доступа к web(POST)-серверу!");
		}
	}
});

module.exports.test = ip2banTEST;
module.exports.authadmin = ip2banAuthADMIN;
module.exports.authall = ip2banAuthALL;