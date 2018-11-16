/**
 *	IOCommander v2
 *	(c) 2018 by Siarhei Dudko.
 *
 *	PROCESS
 *  CLUSTER (CONSOLE) PROCESS
 *	Console процесс
 *
 */

"use strict"

if(typeof(process.env.NODE_ENV) !== 'string'){
	process.env.NODE_ENV === 'development';
}

//подгружаемые библиотеки
var PATH = require('path'),
	READLINE = require('readline'),
	OS = require('os'),
	CONFIG = require('config');
	
//подгружаемые модули
var LOGGER = require(PATH.join(__dirname, 'module.logger.js')),
	FUNCTIONS = require(PATH.join(__dirname, 'module.functions.js')),
	SENDMAIL = require(PATH.join(__dirname, 'module.sendmail.js')),
	FIREBASE = require(PATH.join(__dirname, 'module.firebase.js')),
	PROCSTORE_SERVER = require(PATH.join(__dirname, 'procstore.server.js')),
	PROCSTORE_CONNECTION = require(PATH.join(__dirname, 'procstore.connection.js'));
	
PROCSTORE_SERVER.stderr = function(err){};
PROCSTORE_CONNECTION.stderr = function(err){};
PROCSTORE_SERVER.createClient({path:PATH.join(OS.tmpdir(), "iocomv2-server.sock"), login:"iocomv2", password:"iocommander"});
PROCSTORE_CONNECTION.createClient({path:PATH.join(OS.tmpdir(), "iocomv2-conn.sock"), login:"iocomv2", password:"iocommander"});

var S = PROCSTORE_SERVER,
	C = PROCSTORE_CONNECTION;

const rl = READLINE.createInterface({
	input: process.stdin,
	output: process.stdout,
	prompt: 'IOCom> '
});

rl.prompt();

var commands = {
	"--help": {
		title: "Вызов текущей справки.",
		exec: help
	},
	"--getServer": {
		title: "Вывести снимок постоянного хранилища. Короткий линк на хранилище S.getState()",
		exec: function(){console.log(PROCSTORE_SERVER.getState());}
	},
	"--getConn": {
		title: "Вывести снимок временного хранилища. Короткий линк на хранилище C.getState()",
		exec: function(){console.log(PROCSTORE_CONNECTION.getState());}
	}
};

var arr = [];
for(const key in commands){
	arr.push({"команда":key, "значение":commands[key].title});
}
function help(){
	console.table(arr, ['команда', 'значение']);
}

rl.on('line', (line) => {
	if(line.substr(0,2) === "--"){
		if(typeof(commands[line]) !== 'undefined'){
			commands[line].exec();
		} else {
			commands["--help"].exec();
		}
	} else {
		try{
			var _s = eval(line);
			if(typeof(_s) !== 'undefined')
				console.log(_s);
		} catch(err){
			LOGGER.error("Ошибка выполнения команды: "+err.message);
			commands["--help"].exec();
		}
	}
	rl.prompt();
}).on('close', () => {
	LOGGER.log('IOCommander Server v2 disconnected!');
	process.exit(0);
});
	