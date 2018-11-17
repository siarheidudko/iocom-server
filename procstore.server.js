/**
 *	IOCommander v2
 *	(c) 2018 by Siarhei Dudko.
 *
 *	MODULE
 *  PROCSTORE_SERVER
 *	Хранилище состояний процессов (использует IPC), передача методом worker->master->workers[]
 */

"use strict"

//подгружаемые библиотеки
var REDUXCLUSTER = require('redux-cluster'),
	PATH = require('path'),
	LODASH = require('lodash');
	
//подгружаемые модули
var LOGGER = require(PATH.join(__dirname, 'module.logger.js')),
	FUNCTIONS = require(PATH.join(__dirname, 'module.functions.js'));

//инициализируем хранилище
var serverStorage = REDUXCLUSTER.createStore(editServerStore);
serverStorage.mode = "action";
serverStorage.resync = 1000;

//редьюсер
function editServerStore(state = {users:{}, admins:{'administrator':'61d8c6ba173c4764d9a4aca45dc6faa0294bb4d7a95f204e1b8bc139cafaa6f6'}, tasks: {}}, action){
	try{
		switch (action.type){
			case 'ADD_USER':
				var state_new = LODASH.clone(state);
				state_new.users[action.payload.user] = action.payload.password;
				state_new.users = FUNCTIONS.sortobj(state_new.users, '', 'string', false);
				return state_new;
				break;
			case 'REMOVE_USER':
				var state_new = LODASH.clone(state);
				delete state_new.users[action.payload.user];
				delete state_new.tasks[action.payload.user];
				LOGGER.log("Удаление пользователя\nLogin: " + action.payload.user);
				return state_new;
				break;
			case 'ADD_ADMIN':
				var state_new = LODASH.clone(state);
				state_new.admins[action.payload.user] = action.payload.password;
				state_new.admins = FUNCTIONS.sortobj(state_new.admins, '', 'string', false);
				return state_new;
				break;
			case 'REMOVE_ADMIN':
				var state_new = LODASH.clone(state);
				delete state_new.admins[action.payload.user];
				LOGGER.log("Удаление администратора\nLogin: " + action.payload.user);
				return state_new;
				break;
			case 'ADD_TASK':
				var state_new = LODASH.clone(state);
				if(typeof(state_new.tasks[action.payload.user]) === 'undefined'){
					state_new.tasks[action.payload.user] = {};
				}
				state_new.tasks[action.payload.user][action.payload.task.uid] = action.payload.task.task;
				return state_new;
				break;
			case 'COMPLETE_TASK':
				var state_new = LODASH.clone(state);
				state_new.tasks[action.payload.user][action.payload.task].complete = 'true';
				state_new.tasks[action.payload.user][action.payload.task].datetimecompl = Date.now();
				state_new.tasks[action.payload.user][action.payload.task].answer = action.payload.answer;
				state_new.tasks[action.payload.user][action.payload.task].tryval = action.payload.tryval;
				return state_new;
				break;
			case 'SYNC':
				var state_new = action.payload;
				state_new.users = FUNCTIONS.sortobj(state_new.users, '', 'string', false);
				state_new.admins = FUNCTIONS.sortobj(state_new.admins, '', 'string', false);
				return state_new;
				break;
			case 'GC_TASK':
				var state_new = LODASH.clone(state);
				delete state_new.tasks[action.payload.user][action.payload.task];
				return state_new;
				break;
			case 'GC_USER':
				var state_new = LODASH.clone(state);
				delete state_new.tasks[action.payload.user];
				return state_new;
				break;
			case 'GC_TASK_REPLANSW':
				var state_new = LODASH.clone(state);
				var thisanswr = state_new.tasks[action.payload.user][action.payload.task].answer;
				state_new.tasks[action.payload.user][action.payload.task].answer =  '...' + thisanswr.substring(thisanswr.length - 1001,thisanswr.length - 1);
				return state_new;
				break;
			case 'SYNC_STORE':
				var state_new = LODASH.clone(action.payload);
				return state_new;
				break;
			default:
				break;
		}
	} catch(e){
		LOGGER.error("Ошибка при обновлении основного хранилища:" + e);
	}
	return state;
}

module.exports = serverStorage;