/**
 *	IOCommander v2
 *	(c) 2018 by Siarhei Dudko.
 *
 *	MODULE
 *  APP WEBSERVER
 *	Приложение express (админка)
 *
 */

"use strict"

//подгружаемые библиотеки
var EXPRESS = require('express'),
	FAVICON = require('serve-favicon'),
	PATH = require('path'),
	COMPRESSION = require('compression');
	
//подгружаемые модули
var LOGGER = require(PATH.join(__dirname, 'module.logger.js')),
	FUNCTIONS = require(PATH.join(__dirname, 'module.functions.js')),
	IP2BAN = require(PATH.join(__dirname, 'app.ip2ban.js')),
	ROUTES = require(PATH.join(__dirname, 'app.webserver.routes.js'));

var app = EXPRESS();
app.disable('x-powered-by');

app.use(function(req, res, next){
	(new Promise(function (resolve, reject){
		res.locals.timesectemp = Date.now();
		res.locals.loggerstr = FUNCTIONS.correcterstr("WEB", 6) + 
				" | " + FUNCTIONS.correcterstr(req.ip, 15) +  //для проброса ip через NAT в хидере использовать req.ips
				" | " + FUNCTIONS.correcterstr(req.method, 7) + 
				" | " + FUNCTIONS.correcterstr(req.originalUrl, 80);
		res.locals.logger = function(){
			var timesec = ((Date.now() - res.locals.timesectemp) / 1000) + "s";
			res.locals.loggerstr = res.locals.loggerstr + 
				" | " + FUNCTIONS.correcterstr(timesec, 10) + 
				" | " + FUNCTIONS.correcterstr(res.statusCode, 3);
			if(res.locals.cachel){
				res.locals.loggerstr = res.locals.loggerstr +
					" | " + FUNCTIONS.correcterstr(res.locals.cachel, 4);
			}
			LOGGER.http(res.locals.loggerstr);
		}
		resolve('next');
	})).then(function(resolve){
		res.on('finish', function(){
			if(res.locals.closer){
				res.locals.closer();
			}
			res.locals.logger();
		});
		next();
	}).catch(function(error){
		LOGGER.error('Ошибка работы APP: '+error);
		res.set({'Content-Type': 'application/json; charset=utf-8'});
		res.status(500).send(JSON.stringify({
			status: "error",
			message: error.message
		}));
	});
});

app.use(COMPRESSION());
app.use(FAVICON(PATH.join(__dirname, 'public', 'favicon.ico')));
app.use(IP2BAN.test);
app.post('*', ROUTES);	//маршруты апи
app.get('*', EXPRESS.static(PATH.join(__dirname, 'public')));	//директория веб-сайта (статические данные)

app.all('*', function(req, res, next){ //маршрутизируем остальные
	res.set({'Content-Type': 'application/json; charset=utf-8'});
	res.status(404).send(JSON.stringify({
		status: "error",
		message: "Not Found"
	}));
});

app.use(function(err, req, res, next) { //обработчик ошибок
	try{
		res.set({'Content-Type': 'application/json; charset=utf-8'});
	} catch(e){}
	res.status(500).send(JSON.stringify({
		status: "error",
		message: err.message
	}));
	LOGGER.error(err);
});

module.exports = app;