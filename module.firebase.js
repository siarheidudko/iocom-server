/**
 *	IOCommander v2
 *	(c) 2018 by Siarhei Dudko.
 *
 *	MODULE
 *  FIREBASE
 *	работа с драйвером firebase
 *
 */

"use strict"

//подгружаемые библиотеки
var FIREBASE = require('firebase'),
	PATH = require('path'),
	CONFIG = require('config');
	
//подгружаемые модули
var LOGGER = require(PATH.join(__dirname, 'module.logger.js')),
	FUNCTIONS = require(PATH.join(__dirname, 'module.functions.js')),
	PROCSTORE_SERVER = require(PATH.join(__dirname, 'procstore.server.js'));
	
//глобальные переменные
var SyncFirebaseTimeout = false;
FIREBASE.initializeApp(CONFIG.firebase.config);

//функция авторизации в firebase
function AuthUserFirebase(){
	return new Promise(function (resolve){
		FIREBASE.auth().signInWithEmailAndPassword(CONFIG.firebase.user, CONFIG.firebase.password).then(function() {
			resolve('auth');
		}).catch(function(error) {
			resolve('noauth');
			LOGGER.error("FIREBASE-> Проблема с авторизацией: " + error);
		});
	}, function(error){
		resolve('noauth');
		LOGGER.error("FIREBASE-> Проблема с инициализацией авторизации: " + error);
	});
};

//функция получения данных из firebase
function GetFirebaseData(){
	return new Promise(function (resolve){
		FIREBASE.database().ref('/').once('value').then(function(snapshot) {
			resolve(JSON.stringify(snapshot.val()));
		}, function(error) {
			LOGGER.error("FIREBASE-> Проблема получения снимка: " + error);
		});
	}, function(error){
		LOGGER.error("FIREBASE-> Проблема инициализации получения снимка: " + error);
	});
}

//функция записи авторизации в firebase с последующим вызовом записи SendData()
function FirebaseSync(){
	AuthUserFirebase().then(function(value){
		if(value === 'auth'){
			SendData(); //синхронизируем хранилище
		} else {
			setTimeout(FirebaseSync,60000); //при ошибке запустим саму себя через минуту
			LOGGER.warn("FIREBASE-> Ошибка авторизации:" + value);
		}
	}, function(error){
		LOGGER.warn("FIREBASE-> Ошибка при обновлении:" + error);
		setTimeout(FirebaseSync,60000); //при ошибке запустим саму себя через минуту
	});
}

//функция записи данных в firebase
function SendData(){
	try {
		FIREBASE.database().ref('/').set(PROCSTORE_SERVER.getState()).then(function(value){
			LOGGER.log("FIREBASE-> Синхронизация с firebase успешна!");
		}).catch(function(error){
			LOGGER.error("FIREBASE-> Ошибка записи данных: " + error);
		});
		SyncFirebaseTimeout = false; //вернем начальное состояние флагу синхронизации
	} catch (e){
		LOGGER.warn("FIREBASE-> Проблема инициализации записи: " + e);
		setTimeout(SendData,60000); //при ошибке запустим саму себя через минуту
	}
}

function SyncWorker(){
	PROCSTORE_SERVER.subscribe(function(){
		if(CONFIG.firebase && CONFIG.firebase.user && CONFIG.firebase.password && CONFIG.firebase.config){
			if(!SyncFirebaseTimeout){ //проверяем что флаг ожидания синхронизации еще не установлен
				SyncFirebaseTimeout = true; //установим флаг, что в хранилище есть данные ожидающие синхронизации
				setTimeout(FirebaseSync,60000);//выполним через минуту (т.е. запрос не будет чаще, чем раз в минуту)
			}
		} else {
			LOGGER.warn('FIREBASE-> Настройки некорректны, синхронизация отключена');
		}
	});
}

//грузим данные из firebase в redux при старте, если они не null
function Initialize(){
	return new Promise(function(resolve, reject){
		if(!(CONFIG.firebase && CONFIG.firebase.user && CONFIG.firebase.password && CONFIG.firebase.config)){
			throw new Error('FIREBASE-> Некорректная конфигурация.');
		}
		AuthUserFirebase().then(function(value){
			if(value === 'auth'){
				GetFirebaseData().then(function(value_child){
					if(value_child !== 'null'){
						try{
							var value_child_obj = JSON.parse(value_child);
							if(typeof(value_child_obj.users) === 'undefined'){
								value_child_obj.users = {};
							}
							if(typeof(value_child_obj.tasks) === 'undefined'){
								value_child_obj.tasks = {};
							}
							if(typeof(value_child_obj.admins) === 'undefined'){
								value_child_obj.admins = {'administrator':'61d8c6ba173c4764d9a4aca45dc6faa0294bb4d7a95f204e1b8bc139cafaa6f6'}; //логин: administrator, пароль: 12345678 (по умолчанию при создании БД)
							}
							if((typeof(value_child_obj.users) !== 'undefined') && (typeof(value_child_obj.tasks) !== 'undefined') && (typeof(value_child_obj.admins) !== 'undefined')){
								PROCSTORE_SERVER.dispatch({type:'SYNC', payload: value_child_obj});
							} else {
								LOGGER.error("FIREBASE-> Один из обязательных аргументов отсутствует, база данных будет пересоздана.");
							}
						} catch(e){
							LOGGER.error("FIREBASE-> Повреждение, не могу корректно распарсить полученный объект:" + e);
							value_child_obj = {users:{},tasks:{},admins:{'administrator':'61d8c6ba173c4764d9a4aca45dc6faa0294bb4d7a95f204e1b8bc139cafaa6f6'}};
							PROCSTORE_SERVER.dispatch({type:'SYNC', payload: value_child_obj});
						}
					} else {
						LOGGER.warn("FIREBASE-> Полученный снимок является пустым. Firebase будет перезаписана!");
						value_child_obj = {users:{},tasks:{},admins:{'administrator':'61d8c6ba173c4764d9a4aca45dc6faa0294bb4d7a95f204e1b8bc139cafaa6f6'}};
						PROCSTORE_SERVER.dispatch({type:'SYNC', payload: value_child_obj});
					}
					resolve('okay');
				}, function (error){
					reject("FIREBASE-> Повреждение, не могу загрузить объект в основное хранилище: " + error);
				});
			}
		})
	}, function(error){
		reject("FIREBASE-> Проблема с загрузкой данных: " + error);
	});
}

module.exports.worker = SyncWorker;
module.exports.initialize = Initialize;