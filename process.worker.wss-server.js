/**
 *	IOCommander v2
 *	(c) 2018 by Siarhei Dudko.
 *
 *	PROCESS
 *  WS/WSS SECURE SERVER
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
	SOCKETIO=require("socket.io"),
	PATH = require('path'),
	FS = require('fs');
	
//подгружаемые модули
var LOGGER = require(PATH.join(__dirname, 'module.logger.js')),
	FUNCTIONS = require(PATH.join(__dirname, 'module.functions.js')),
	PROCSTORE_SERVER = require(PATH.join(__dirname, 'procstore.server.js')),
	PROCSTORE_CONNECTION = require(PATH.join(__dirname, 'procstore.connection.js'));
	
//глобальные переменные
var port = 444,
	sendStorageToWebTimeout = false;
	

if(CONFIG.server.ssl && CONFIG.server.ssl.crt && CONFIG.server.ssl.ca && CONFIG.server.ssl.key){
	var ssl = {
		key: ''+FS.readFileSync(CONFIG.server.ssl.key),
		cert: FS.readFileSync(CONFIG.server.ssl.crt) + '\n' + FS.readFileSync(CONFIG.server.ssl.ca)
	};
	var server=HTTPS.createServer(ssl).listen(port, function() {
		LOGGER.log('wss-сервер запущен на порту:' + port);
	}); 
} else {
	var server=HTTP.createServer().listen(port, function() {
		LOGGER.log('ws-сервер запущен на порту:' + port);
	}); 
}
var io=SOCKETIO.listen(server, { log: true ,pingTimeout: 7200000, pingInterval: 25000, transports:["websocket"]});
io.sockets.on('connection', function (socket) {
	try {
		socket.iocom = {};
		var thisSocketAddressArr = io.sockets.sockets[socket.id].handshake.address.split(':');
		socket.iocom.adress = thisSocketAddressArr[thisSocketAddressArr.length-1];
		if(typeof(PROCSTORE_CONNECTION.getState().iptoban) === 'object'){
			if(typeof(PROCSTORE_CONNECTION.getState().iptoban[FUNCTIONS.replacer(socket.iocom.adress, true)]) === 'object') {
				var ThisSocketAttemp = PROCSTORE_CONNECTION.getState().iptoban[FUNCTIONS.replacer(socket.iocom.adress, true)].attemp;
				var ThisSocketDatetime = PROCSTORE_CONNECTION.getState().iptoban[FUNCTIONS.replacer(socket.iocom.adress, true)].datetime;
			}
		}
		if(typeof(ThisSocketAttemp) !== 'number'){
			ThisSocketAttemp = 0;
		}
		if(typeof(ThisSocketDatetime) !== 'number'){
			ThisSocketDatetime = 0;
		}
		if((ThisSocketAttemp > 5) && ((ThisSocketDatetime + bantimeout) > Date.now())){
			LOGGER.warn('Попытка входа с заблокированного адреса ' + socket.iocom.adress);
			socket.disconnect();
		} else {
			io.sockets.sockets[socket.id].emit('initialize', { value: 'whois' });
			io.sockets.sockets[socket.id].on('login', function (data) {
				if(testUser(data.user, data.password, socket.id)) {
					try {
						try{
							if(typeof(PROCSTORE_CONNECTION.getState().users[FUNCTIONS.replacer(data.user, true)]) !== 'undefined'){
								io.sockets.sockets[PROCSTORE_CONNECTION.getState().users[FUNCTIONS.replacer(data.user, true)]].disconnect();
							}
						} catch(e){
							LOGGER.error("Ошибка закрытия сокета: " + e);
						}
						io.sockets.sockets[socket.id].emit('authorisation', { value: 'true' });
						socket.iocom.login = data.user;
						setUser(socket.iocom.login, 'uid', socket.id, data.version);
						LOGGER.log("Подключение пользователя\nLogin: " + socket.iocom.login + "\nUID: " + socket.id + "\nADDRESS:" + socket.iocom.adress);
						io.sockets.sockets[socket.id].emit('sendtask', PROCSTORE_SERVER.getState().tasks[FUNCTIONS.replacer(socket.iocom.login, true)]);
						io.sockets.sockets[socket.id].on('completetask', function (data) {
							PROCSTORE_SERVER.dispatch({type:'COMPLETE_TASK', payload: {user:socket.iocom.login, task:data.uid, answer:data.answer, tryval:data.tryval}});
						});
					} catch (e) {
						LOGGER.error("Ошибка взаимодействия с пользователем " + socket.iocom.login +": " + e);
					}
				} else if(testAdmin(data.user, data.password, socket.id)) {
					try {
						socket.iocom.login = data.user;
						try{
							if(typeof(PROCSTORE_CONNECTION.getState().users[FUNCTIONS.replacer(socket.iocom.login, true)]) !== 'undefined'){
								io.sockets.sockets[PROCSTORE_CONNECTION.getState().users[FUNCTIONS.replacer(socket.iocom.login, true)]].disconnect();
							}
						} catch(e){
							LOGGER.error("Ошибка закрытия сокета: " + e);
						}
						io.sockets.sockets[socket.id].emit('authorisation', { value: 'true' });
						LOGGER.log("Подключение администратора\nLogin: " + socket.iocom.login + "\nUID: " + socket.id + "\nADDRESS:" + socket.iocom.adress);
						setAdmin(socket.iocom.login, 'uid', socket.id);
						io.sockets.sockets[socket.id].emit('sendServerStorageToAdmin', PROCSTORE_SERVER.getState());
						io.sockets.sockets[socket.id].emit('sendConnStorageToAdmin', PROCSTORE_CONNECTION.getState());
						io.sockets.sockets[socket.id].on('adm_setUser', function (data) {
							if(typeof(data) === 'object'){
								if((typeof(data[0]) === 'string') && (data[0] !== "") && (typeof(data[1]) === 'string') && (data[1] !== "")){
									setUser(data[0], 'password', data[1]);
								}
							}
						});
						io.sockets.sockets[socket.id].on('adm_setAdmin', function (data) {
							if(typeof(data) === 'object'){
								if((typeof(data[0]) === 'string') && (data[0] !== "") && (typeof(data[1]) === 'string') && (data[1] !== "")){
									setAdmin(data[0], 'password', data[1]);
								}
							}
						});
						io.sockets.sockets[socket.id].on('adm_setTask', function (data) {
							if(typeof(data) === 'object'){
								if((typeof(data[0]) === 'string') && (data[0] !== "") && (typeof(data[1]) === 'object')){
									FUNCTIONS.settask(data[0],data[1]);
									try {
										var ReplaceUserName = FUNCTIONS.replacer(data[0], true);
										if(typeof(PROCSTORE_CONNECTION.getState().users[ReplaceUserName]) !== 'undefined'){
											var SocketUserId = PROCSTORE_CONNECTION.getState().users[ReplaceUserName];
											if(typeof(io.sockets.sockets[SocketUserId])  !== 'undefined'){
												io.sockets.sockets[SocketUserId].emit('sendtask', PROCSTORE_SERVER.getState().tasks[ReplaceUserName]);
												LOGGER.log("Задачи пользователю " + data[0] + " отправлены!");
											} else {
												LOGGER.error("Пользователь " + data[0] + " не найден в массиве сокетов (рассинхронизация с хранилищем соединений).");
											}
										} else {
											LOGGER.warn("Пользователь " + data[0] + " не найден в хранилище соединений (не подключен). Отправка будет произведена после подключения.");
										}
										data = undefined;
									} catch(e){
										LOGGER.error("Не могу отправить задание в сокет:" + e);
									} 
								}
							}
						});
						io.sockets.sockets[socket.id].on('adm_delUser', function (data) {
							if(typeof(data) === 'object'){
								if((typeof(data[0]) === 'string') && (data[0] !== "")){
									PROCSTORE_SERVER.dispatch({type:'REMOVE_USER', payload: {user:data[0]}});
									PROCSTORE_CONNECTION.dispatch({type:'REMOVE_USER', payload: {user:data[0]}});
								}
							}
						});
						io.sockets.sockets[socket.id].on('adm_delAdmin', function (data) {
							if(typeof(data) === 'object'){
								if((typeof(data[0]) === 'string') && (data[0] !== "")){
									PROCSTORE_SERVER.dispatch({type:'REMOVE_ADMIN', payload: {user:data[0]}});
									PROCSTORE_CONNECTION.dispatch({type:'REMOVE_USER', payload: {user:data[0]}});
								}
							}
						});
					} catch (e) {
						LOGGER.error("Ошибка взаимодействия с администратором " + socket.iocom.login +": " + e);
					}
				} else {
					io.sockets.sockets[socket.id].emit('authorisation', { value: 'false' });
					socket.disconnect();
					LOGGER.warn("Неверный пароль для пользователя\nLogin: " + socket.iocom.login + "\nUID: " + socket.id);
					PROCSTORE_CONNECTION.dispatch({type:'WRONG_PASS', payload: {address:FUNCTIONS.replacer(socket.iocom.adress, true)}});
				} 
			});
		  
			socket.on('disconnect', function () {
				LOGGER.log("Отключение пользователя"+"\nLogin: " + FUNCTIONS.replacer(socket.iocom.login, false) + "\nUID: " + socket.id);
				PROCSTORE_CONNECTION.dispatch({type:'REMOVE_UID', payload: {uid:socket.id}});
			}); 
		}
	} catch (e){
		LOGGER.error("Ошибка обработки входящего соединения: " + e);
	}
});

try {
	PROCSTORE_SERVER.subscribe(function(){
		if(!sendStorageToWebTimeout){
			sendStorageToWebTimeout = true;
			setTimeout(sendStorageToWeb, 20000, io, 'server');
		}
	});
	PROCSTORE_CONNECTION.subscribe(function(){
		sendStorageToWeb(io, 'connection');
	});
} catch (e) {
	LOGGER.error("Не могу подписать веб-интерфейс на обновления: " + e);
}


//отправка хранилищ в веб
function sendStorageToWeb(io, param){
	try {
		var adminObject = PROCSTORE_SERVER.getState().admins;
		var connObject = PROCSTORE_CONNECTION.getState().users;
		for(var admin in adminObject){
			try {
				var admUid = PROCSTORE_CONNECTION.getState().users[admin];
				if (typeof(admUid) !== 'undefined'){
					switch (param){
						case 'server':
							sendStorageToWebTimeout = false;
							io.sockets.sockets[admUid].emit('sendServerStorageToAdmin', PROCSTORE_SERVER.getState());
							break;
						case 'connection':
							io.sockets.sockets[admUid].emit('sendConnStorageToAdmin', PROCSTORE_CONNECTION.getState());
							break;
						default:
							io.sockets.sockets[admUid].emit('sendServerStorageToAdmin', PROCSTORE_SERVER.getState());
							io.sockets.sockets[admUid].emit('sendConnStorageToAdmin', PROCSTORE_CONNECTION.getState());
							break;
					}
				}
			} catch (e) {
				sendStorageToWebTimeout = false;
				LOGGER.error("Проблема отправки данных в web, администратору " + admin +"!");
			}
		}
	} catch (e){
		sendStorageToWebTimeout = false;
		LOGGER.error("Проблема отправки данных в web!");
	}
}

//функция проверки имени пользователя и пароля
function testUser(user_val, password_val, socketid){
	try{
		PROCSTORE_CONNECTION.dispatch({type:'REMOVE_UID', payload: {uid:socketid}});
		var renameuser = FUNCTIONS.replacer(user_val, true);
		if(typeof(PROCSTORE_SERVER.getState().users) !== 'undefined'){
			if ((PROCSTORE_SERVER.getState().users[renameuser] === password_val) && (typeof(PROCSTORE_SERVER.getState().users[renameuser]) !== 'undefined')){
				return true;
			} else {
				return false;
			}
		} else {
			LOGGER.error("Объект пользователи основного хранилища не существует!");
			return false;
		}
	} catch(e){
		PROCSTORE_CONNECTION.dispatch({type:'REMOVE_UID', payload: {uid:socketid}});
		LOGGER.error("Ошибка проверки имени пользователя и пароля пользователя!");
	}
}

//функция проверки имени пользователя и пароля администратора
function testAdmin(user_val, password_val, socketid){
	try{
		PROCSTORE_CONNECTION.dispatch({type:'REMOVE_UID', payload: {uid:socketid}});
		var renameuser = FUNCTIONS.replacer(user_val, true);
		if(typeof(PROCSTORE_SERVER.getState().admins) !== 'undefined'){
			if ((PROCSTORE_SERVER.getState().admins[renameuser] === password_val) && (typeof(PROCSTORE_SERVER.getState().admins[renameuser]) !== 'undefined')) {
				return true;
			} else {
				return false;
			}
		} else {
			LOGGER.error("Объект администраторы основного хранилища не существует!");
			return false;
		}
	} catch(e){
		PROCSTORE_CONNECTION.dispatch({type:'REMOVE_UID', payload: {uid:socketid}});
		LOGGER.error("Ошибка проверки имени пользователя и пароля администратора!");
		return false;
	}
}

//функция записи в массив пользователей
function setUser(user_val, param_val, value_val, clientver){
	try {
		var renameuser = FUNCTIONS.replacer(user_val, true);
		switch (param_val){
			case 'password':
				PROCSTORE_SERVER.dispatch({type:'ADD_USER', payload: {user:renameuser, password:value_val}});
				LOGGER.log("Регистрация пользователя\nLogin: " + user_val);
				break;
			case 'uid':
				PROCSTORE_CONNECTION.dispatch({type:'ADD_UID', payload: {uid:value_val, user:renameuser, version: clientver}});
				LOGGER.log("Установка идентификатора пользователя\nLogin: " + user_val + "\nUID:" + value_val);
				break;
			default:
				LOGGER.warn("Неизвестная команда: " + param_val);
				break;
		}
	} catch(e) {
		LOGGER.error("Ошибка добавления пользователя в основное хранилище!");
	}
}

//функция записи в массив администраторов
function setAdmin(user_val, param_val, value_val){
	try {
		var renameuser = FUNCTIONS.replacer(user_val, true);
		switch (param_val){
			case 'password':
				PROCSTORE_SERVER.dispatch({type:'ADD_ADMIN', payload: {user:renameuser, password:value_val}});
				LOGGER.log("Регистрация администратора\nLogin: " + user_val);
				break;
			case 'uid':
				PROCSTORE_CONNECTION.dispatch({type:'ADD_UID', payload: {uid:value_val, user:renameuser, version: 'web-interface'}});
				LOGGER.log("Установка идентификатора администратора\nLogin: " + user_val + "\nUID:" + value_val);
				break;
			default:
				LOGGER.warn("Неизвестная команда: " + param_val);
				break;
		}
	} catch(e) {
		LOGGER.error("Ошибка добавления администратора в основное хранилище!");
	}
}
