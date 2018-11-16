/**
 *	IOCommander v2
 *	(c) 2018 by Siarhei Dudko.
 *
 *	MODULE
 *  PROCSTORE_CONNECTION
 *	Хранилище состояний процессов
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
var connectionStorage = REDUXCLUSTER.createStore(editConnectionStore);
connectionStorage.mode = "action";

//редьюсер
function editConnectionStore(state = {uids:{}, users:{}, versions:{}, version:'', report:{}, groups:{}, iptoban:{}, fileport:'', memory:'', cpu:''}, action){
	try {
		switch (action.type){
			case 'ADD_UID':
				var useruid = state.users[action.payload.user];
				var state_new = LODASH.clone(state);
				delete state_new.users[action.payload.user]; //на всякий случай чистим объект от старых данных
				delete state_new.uids[useruid];
				state_new.uids[action.payload.uid] = action.payload.user;
				state_new.users[action.payload.user] = action.payload.uid;
				state_new.uids = FUNCTIONS.sortobj(state_new.uids, '', 'string', false);
				state_new.users = FUNCTIONS.sortobj(state_new.users, '', 'string', false);
				if(typeof(action.payload.version) === 'string'){ 
					if(typeof(state_new.versions) !== 'object'){ state_new.versions = {}; }
					state_new.versions[action.payload.user] = action.payload.version;
				}
				return state_new;
				break;
			case 'REMOVE_UID':
				var username = state.uids[action.payload.uid];
				var state_new = LODASH.clone(state);
				delete state_new.uids[action.payload.uid];
				delete state_new.users[username];
				return state_new;
				break;
			case 'REMOVE_USER':
				var useruid = state.users[action.payload.user];
				var state_new = LODASH.clone(state);
				delete state_new.users[action.payload.user];
				delete state_new.uids[useruid];
				return state_new;
				break;
			case 'GEN_REPORT':
				var state_new = LODASH.clone(state);
				state_new.report = action.payload.report;
				return state_new;
				break;
			case 'GEN_GROUP':
				var state_new = LODASH.clone(state);
				state_new.groups = action.payload.groups;
				return state_new;
				break;
			case 'WRONG_PASS':
				var state_new = LODASH.clone(state);
				if(typeof(state_new.iptoban[action.payload.address]) !== 'object'){
					state_new.iptoban[action.payload.address] = {};
					state_new.iptoban[action.payload.address].attemp = 0;
				}
				state_new.iptoban[action.payload.address].datetime = Date.now();
				state_new.iptoban[action.payload.address].attemp = state_new.iptoban[action.payload.address].attemp + 1;
				return state_new;
				break;
			case 'GC_WRONG_PASS_CLEAR':
				var state_new = LODASH.clone(state);
				delete state_new.iptoban[action.payload.address];
				return state_new;
				break;
			case 'PARAMS':
				var state_new = LODASH.clone(state);
				if(typeof(action.payload.fileportval) !== 'undefined'){
					state_new.fileport = action.payload.fileportval;
					state_new.version = action.payload.version;
				}
				return state_new;
				break;
			case 'SERVER_STAT':
				var state_new = LODASH.clone(state);
				if(typeof(action.payload.memory) !== 'undefined'){
					state_new.memory = action.payload.memory;
				}
				if(typeof(action.payload.cpu) !== 'undefined'){
					state_new.cpu = action.payload.cpu;
				}
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
		LOGGER.error("Ошибка при обновлении хранилища состояний:" + e);
	}
	return state;
}

module.exports = connectionStorage;