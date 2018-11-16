/**
 *	IOCommander v2
 *	(c) 2018 by Siarhei Dudko.
 *
 *	MODULE
 *  FUNCTIONS
 *	Функции приложения
 *
 */

"use strict"

//подгружаемые библиотеки
var LODASH = require('lodash'),
	MKDIRP = require('mkdirp'),
	PATH = require('path'),
	CRYPTO = require('crypto'),
	CONFIG = require('config');

//подгружаемые модули
var LOGGER = require(PATH.join(__dirname, 'module.logger.js')),
	PROCSTORE_SERVER = require(PATH.join(__dirname, 'procstore.server.js'));

//функция сортировки объекта по полю
function sortObjectFunc(ObjectForSort, KeyForSort, TypeKey, reverse){
	try{
		var SortObject = new Object,
			tempObject = new Object,
			tempArray = new Array,
			validaterone = 0,
			validatertwo = 0;
		
		for(var keyobject in ObjectForSort) { //проходим по всем ключам родителям объекта
			if(KeyForSort !== ''){
				if(typeof(ObjectForSort[keyobject][KeyForSort]) !== 'undefined'){ //проверяем что ключ потомок существует
					tempObject[ObjectForSort[keyobject][KeyForSort]] = keyobject; //создаем объект связку ключа потомка и ключа родителя
					tempArray.push(ObjectForSort[keyobject][KeyForSort]); //создаем массив ключей потомков
				}
			} else {
				tempArray.push(keyobject); //создаем массив ключей
			}
			validaterone++; //считаем число ключей объекта, чтобы потом сравнить с длинной массива
		}
		
		function sortNumber(a,b) { //сортируем массив в зависимости от переданного типа
			return a - b;
		}
		if(TypeKey === 'integer'){
			tempArray.sort(sortNumber);
		} else {
			tempArray.sort();
		}
		
		if(reverse){  //если задан параметр, то переворачиваем массив
			tempArray.reverse();
		}
		
		for(var i=0; i<tempArray.length; i++){ //проходим по отсортированному массиву ключей потомков
			if(KeyForSort !== ''){
				SortObject[tempObject[tempArray[i]]] = ObjectForSort[tempObject[tempArray[i]]]; //используем объект связку и старый объект, чтобы получить новый отсортированный объект
			} else {
				SortObject[tempArray[i]] = ObjectForSort[tempArray[i]];
			}
		}
		
		if(KeyForSort !== ''){ //учитываем, что для первого уровня валидация не нужна, т.к. не используется объект связка, где могли быть затерты одинаковые ключи
			for(var keyobject in SortObject){
				validatertwo++; //считаем число ключей нового объекта
			}
		}
		
		if((validaterone === validatertwo) || (KeyForSort === '')){ //если количество ключей не изменилось - выводим новый объект.
			return SortObject;
		} else {
			return ObjectForSort;
		}
	} catch(e){
		LOGGER.warn("FUNCTIONS-> Ошибка переиндексации ключей объекта!");
		return ObjectForSort;
	}
}

//подготовка к старту (проверка папок)
function PreStart(dirarr){
	return new Promise(function (resolve, reject){
		var Step = [];
		for(var i =0; i < dirarr.length; i++){
			Step.push(new Promise(function (_resolve, _reject){
				var thisdir = PATH.join(__dirname, dirarr[i]);
				MKDIRP(thisdir, function (err) {
					if (err){
						_reject('PRESTARTER-> директория '+thisdir+' не создана по причине: '+ err);
					} else {
						_resolve('ok');
					}
				});
			}));
		}
		Promise.all(Step).then(_resolve =>{resolve(_resolve);}).catch(_reject =>{reject(_reject);});
	});
}

//добивает строку пробелами до нужной длинны или обрезает
function correcterString(str, len){
	try{
		if(typeof(str) !== 'undefined'){
			if(typeof(str) !== 'string'){
				var str_t = str.toString();
			} else{
				var str_t = str;
			}
		} else {
			var str_t = 'undefined';
		}
		if(str_t.length < len){
			for(var i=str_t.length; i < len; i++){
				str_t = str_t + ' ';
			}
		} else {
			str_t = str_t.substr(0, len);
		}
		return str_t;
	} catch(e){
		return str;
	}
}

//функция замены "." на "_" и обратно
function replacer(data_val, value_val){
	try {
		if(typeof(data_val) === 'string'){
			if(value_val){
				return data_val.replace(/\./gi,"_");
			} else {
				return data_val.replace(/\_/gi,".");
			}
		} else {
			return 'undefined';
		}
	} catch(e) {
		LOGGER.warn("FUNCTIONS-> Ошибка преобразования имени пользователя!");
	}	
}

//функция подсчета хэша
function Hasher(data){
	try{
		const hash = CRYPTO.createHash('sha256');
		hash.update(data);
		return(hash.digest('hex'));
	} catch(e){
		return "error";
	}
}

//функция генерации UID
function generateUID() { 
	try {
		var d = new Date().getTime();
		if (typeof performance !== 'undefined' && typeof performance.now === 'function'){
			d += performance.now(); 
		}
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
			var r = (d + Math.random() * 16) % 16 | 0;
			d = Math.floor(d / 16);
			return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
		});
	} catch(e) {
		LOGGER.error("FUNCTIONS-> Ошибка генерации uid!");
	}
}

//функция добавления задачи
function setTask(user_val, value_val){
	try {
		if((typeof(value_val.task) === 'object') && (typeof(value_val.uid) !== 'undefined')){
			var renameuser = replacer(user_val, true);
			value_val.task.complete = 'false';
			value_val.task.answer = '';
			value_val.task.datetime = Date.now();
			if(value_val.uid.charAt(14) === '3'){
				value_val.task.datetime = Date.now() + 3000;
			}
			value_val.task.datetimecompl = 0;
			value_val.task.tryval = 0;
			PROCSTORE_SERVER.dispatch({type:'ADD_TASK', payload: {user:renameuser, task:value_val}});
			if(value_val.task.nameTask === 'getFileFromWWW'){
				if(value_val.task.exec === 'true'){
					var typescriptarr = value_val.task.fileName.split('.');
					var typescript = typescriptarr[typescriptarr.length-1].toLowerCase();
					if(typeof(CONFIG.env[typescript]) === 'object'){
						var tempuid = value_val.uid.split("");
						tempuid[14] = '3';
						var newuid = tempuid.join("");
						var newintlink = value_val.task.intLink;
						if(value_val.task.platform === 'win32'){
							newintlink = 'C:' + value_val.task.intLink.replace(/\//gi, '\\');
						}
						tempuid = undefined;
						var nextTask = {uid:newuid, task: {nameTask:'execFile', intLink:CONFIG.env[typescript].link, fileName: CONFIG.env[typescript].com, paramArray:(CONFIG.env[typescript].param + newintlink + value_val.task.fileName).split(" "), platform:value_val.task.platform, dependencies:[value_val.uid], comment:('Выполнение ' + value_val.task.fileName + ' !'), timeoncompl:value_val.task.timeoncompl}}
						setTask(user_val,nextTask);
						nextTask = undefined;
					}
				}
			}
		} else {
			LOGGER.warn("FUNCTIONS-> Некорректный формат задания!");
		}
	} catch(e) {
		LOGGER.error("FUNCTIONS-> Ошибка добавления задания в основное хранилище!");
	}
}

module.exports.sortobj = sortObjectFunc;
module.exports.prestart = PreStart;
module.exports.correcterstr = correcterString;
module.exports.replacer = replacer;
module.exports.hasher = Hasher;
module.exports.guid = generateUID;
module.exports.settask = setTask;