/**
 *	IOCommander v2
 *	(c) 2018 by Siarhei Dudko.
 *
 *	MODULE
 *  LOGGER
 *	Логгер приложения, отправляет ошибки на email
 *
 */

"use strict"

//подгружаемые библиотеки
var CONFIG = require('config'),
	COLORS = require('colors'),
	PATH = require('path'),
	REDUXCLUSTER = require('redux-cluster'),
	OS = require('os'),
	FS = require('fs');
	
//подгружаемые модули
var SENDMAIL = require(PATH.join(__dirname, 'module.sendmail.js'));

//глобальные переменные
var stdout = console;
var loggerStorage = REDUXCLUSTER.createStore(loggerStore);
loggerStorage.stderr = function(err){};

function loggerStore(state = {type:"LOG", text:""}, action){
	try {
		var state_new = {type:action.type, text: action.payload};
		return state_new;
	} catch(e){
		stdout.warn(COLORS.yellow(datetime()+e));
	}
}

if(process.mainModule.filename.indexOf('process.master.js') !== -1){
	FS.unlink(PATH.join(OS.tmpdir(), "iocomv2.sock"), function(err){
		loggerStorage.createServer({path:PATH.join(OS.tmpdir(), "iocomv2.sock"), logins:{"iocomv2":"iocommander"}});
	});
} else {
	loggerStorage.createClient({path:PATH.join(OS.tmpdir(), "iocomv2.sock"), login:"iocomv2", password:"iocommander"});
}

if(process.mainModule.filename.indexOf('process.console.js') !== -1){
	loggerStorage.subscribe(function(){
		var _strObj = loggerStorage.getState();
		switch(_strObj.type){
			case 'LOG':
				stdout.log(COLORS.green(_strObj.text));
				break;
			case 'WARN':
				stdout.warn(COLORS.yellow(_strObj.text));
				break;
			case 'ERROR':
				stdout.error(COLORS.red(_strObj.text));
				break;
			case 'HTTP':
				stdout.log(COLORS.gray(_strObj.text));
				break;
			case 'DEBUG':
				stdout.log(_strObj.text);
				break;
		}
	});
}

//функция метки времени
function datetime() {
	try {
		var dataObject = new Date;
		var resultString;
		if(dataObject.getDate() > 9){
			resultString = dataObject.getDate() + '.';
		} else {
			resultString = '0' + dataObject.getDate() + '.';
		}
		if((dataObject.getMonth()+1) > 9){
			resultString = resultString + (dataObject.getMonth()+1) + '.' + dataObject.getFullYear() + ' ';
		} else {
			resultString = resultString + '0' + (dataObject.getMonth()+1) + '.' + dataObject.getFullYear() + ' ';
		}
		if(dataObject.getHours() > 9){
			resultString = resultString + dataObject.getHours() + ':';
		} else {
			resultString = resultString + '0' + dataObject.getHours() + ':';
		}
		if(dataObject.getMinutes() > 9){
			resultString = resultString + dataObject.getMinutes() + ':';
		} else {
			resultString = resultString + '0' + dataObject.getMinutes() + ':';
		}
		if(dataObject.getSeconds() > 9){
			resultString = resultString + dataObject.getSeconds();
		} else {
			resultString = resultString + '0' + dataObject.getSeconds();
		}
		return resultString + " | ";
	} catch(e){
		return '00.00.0000 00:00:00 | ';
	}
}

//ошибки
function error(_val){
	var val = datetime() + _val;
	stdout.error(COLORS.red(val));
	if(process.mainModule.filename.indexOf('process.console.js') === -1){
		SENDMAIL.send({message:val, theme:_val.toString().split(" ").slice(0, 10).join(" ")}, stdout);
		loggerStorage.dispatch({type:"ERROR" ,payload:val});
	}
}

//предупреждения
function warn(_val){
	var val = datetime() + _val;
	stdout.warn(COLORS.yellow(val));
	if(process.mainModule.filename.indexOf('process.console.js') === -1)
		loggerStorage.dispatch({type:"WARN" ,payload:val});
}

//логи
function log(_val){
	var val = datetime() + _val;
	stdout.log(COLORS.green(val));
	if(process.mainModule.filename.indexOf('process.console.js') === -1)
		loggerStorage.dispatch({type:"LOG" ,payload:val});
}

//http-запросы
function http(_val){
	var val = datetime() + _val;
	stdout.log(COLORS.gray(val));
	if(process.mainModule.filename.indexOf('process.console.js') === -1)
		loggerStorage.dispatch({type: "HTTP",payload: val});
}

//дебаг (object mode)
function debug(_val){
	if(CONFIG.debug){
		stdout.log(_val);
		if(process.mainModule.filename.indexOf('process.console.js') === -1)
			loggerStorage.dispatch({type: "DEBUG",payload: _val});
	}
}

module.exports.error = error;
module.exports.warn = warn;
module.exports.log = log;
module.exports.http = http;
module.exports.debug = debug;