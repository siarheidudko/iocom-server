/**
 *	IOCommander v2
 *	(c) 2018 by Siarhei Dudko.
 *
 *	PROCESS
 *  CLUSTER (MASTER) PROCESS
 *	Master процесс
 *
 */

"use strict"

if(typeof(process.env.NODE_ENV) !== 'string'){
	process.env.NODE_ENV === 'development';
}

//подгружаемые библиотеки
var CLUSTER = require('cluster'),
	FS = require('fs'),
	PATH = require('path'),
	CONFIG = require('config'),
	OS = require('os');
	
//подгружаемые модули
var LOGGER = require(PATH.join(__dirname, 'module.logger.js')),
	PROCSTORE_SERVER = require(PATH.join(__dirname, 'procstore.server.js')),
	PROCSTORE_CONNECTION = require(PATH.join(__dirname, 'procstore.connection.js')),
	FUNCTIONS = require(PATH.join(__dirname, 'module.functions.js'));
	
//глобальные переменные
var VERSION = require(PATH.join(__dirname, 'package.json')).version;

//создаю класс, который самостоятельно отслеживает состояние воркеров
var IOCom = function(proc, count){
	var self = this;
	
	if(typeof(count) !== 'number'){
		count = 1;
	}
	
	switch(proc){
		case 'file':
			self.path = PATH.join(__dirname, 'process.worker.https-server-secure.js');
			self.name = "HTTPS-FILE-SERVER";
			break;
		case 'web':
			self.path = PATH.join(__dirname, 'process.worker-https-server-public.js');
			self.name = "HTTPS-WEB-SERVER";
			break;
		case 'socket':
			self.path = PATH.join(__dirname, 'process.worker.wss-server.js');
			self.name = "WEBSOCKET-SERVER";
			break;
		case 'sub':
			self.path = PATH.join(__dirname, 'process.worker.sub.js');
			self.name = "SUB-WORKER";
			break;
		default:
			throw new Error('Не задан тип процесса');
			break;
	}
	
	self.exitHandler = function(exit){
		CLUSTER.setupMaster({
			exec: self.path
		});
		var worker = CLUSTER.fork();
		self.listener(CLUSTER.workers[worker.id]);
		if(exit){
			LOGGER.error(self.name+' умер и был пересоздан!');
		}
	}
	
	self.listener = function(data){
		data.on('exit', self.exitHandler);
	}
	
	for(let i = 0; i < count; i++){
		self.exitHandler();
	}	
};

//проверяем целостность папок
FUNCTIONS.prestart([ 'config', 'mail', 'node_modules', 'public', 'notpublic', 'dmp' ]).then(res=>{
	FS.copyFile(PATH.join(__dirname, "iocomv2-server.dmp"),PATH.join(__dirname, "dmp", (new Date()).toJSON().substr(0,19).replace(/[:]/gi,"-")+".backup"),function(_err){
		if(_err){
			LOGGER.error("DUMP-> Не создана резервная копия: "+_err.message);
		}
		PROCSTORE_SERVER.backup({
			path:PATH.join(__dirname, "iocomv2-server.dmp"),
			key:"iocomv2-server",
			timeout: 300
		}).then(function(val){
			//мастер активирован
			LOGGER.log('IOCommander v'+VERSION+' started.');
			//запуск вспомогательных процессов
			new IOCom("sub", 1);
			setTimeout(function(){	//запускаю с задержкой, чтобы успел получить данные из firebase
				//запуск процессов веб-сокета, пул сокет-серверов не реализован (170 соединений держит без проблем) так что он всегда 1
				new IOCom("socket", 1);
				//запуск процессов веб-сервера
				new IOCom("web", 1);	//админка
				new IOCom("file", 1);	//файловый сервер с авторизацией
			}, 10000);

			//устанавливаю версию приложения
			PROCSTORE_CONNECTION.dispatch({type:'PARAMS', payload: {fileportval:CONFIG.server.streamport, version:VERSION}});

			PROCSTORE_SERVER.createServer({path:PATH.join(OS.tmpdir(), "iocomv2-server.sock"), logins:{"iocomv2":"iocommander"}});
			PROCSTORE_CONNECTION.createServer({path:PATH.join(OS.tmpdir(), "iocomv2-conn.sock"), logins:{"iocomv2":"iocommander"}});
		}).catch(function(err){
			LOGGER.err(err);
		});
	});

}).catch(rej=>{LOGGER.error(rej);});
