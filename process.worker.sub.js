/**
 *	IOCommander v2
 *	(c) 2018 by Siarhei Dudko.
 *
 *	PROCESS
 *  SUB-PROCESS
 *	Worker процесс
 *
 */

"use strict"

if(typeof(process.env.NODE_ENV) !== 'string'){
	process.env.NODE_ENV === 'development';
}

//подгружаемые библиотеки
var PATH = require('path'),
	OS = require('os'),
	FS = require('fs');

//подгружаемые модули
var// FIREBASE = require(PATH.join(__dirname, 'module.firebase.js')),
	LOGGER = require(PATH.join(__dirname, 'module.logger.js')),
	FUNCTIONS = require(PATH.join(__dirname, 'module.functions.js')),
	SENDMAIL = require(PATH.join(__dirname, 'module.sendmail.js')),
	PROCSTORE_SERVER = require(PATH.join(__dirname, 'procstore.server.js')),
	PROCSTORE_CONNECTION = require(PATH.join(__dirname, 'procstore.connection.js'));
	
//глобальные переменные
var GenerateReportTimeout = false,
	GenerateGroupTimeout = false;
/*
//подключаю FIREBASE
FIREBASE.initialize().then(function(resolve){
	if(resolve === 'okay'){
		//FIREBASE.worker();
	}
}).catch(function(error){
	LOGGER.error(error);
});*/

setInterval(function(){
	FS.copyFile(PATH.join(__dirname, "iocomv2-server.dmp"),PATH.join(__dirname, "dmp", (new Date()).toJSON().substr(0,19).replace(/[:]/gi,"-")+".backup"),function(_err){
		if(_err){
			LOGGER.error("DUMP-> Не создана резервная копия: "+_err.message);
		}
	});
}, 3600000);

//подключаю отправку ошибок на email
SENDMAIL.worker();

//запускаю сборщик мусора раз в час
setInterval(GarbageCollector,3600000);

//запускаю статистику использованных ресурсов системы
setInterval(StatisticProcess, 10000);

PROCSTORE_SERVER.subscribe(function(){
	if(!GenerateReportTimeout){
		GenerateReportTimeout = true;
		setTimeout(GenerateReport, 15000);
	}
	if(!GenerateGroupTimeout){
		GenerateGroupTimeout = true;
		setTimeout(GenerateGroup, 1000);
	}
});

//функция вывода статистики использованных ресурсов
function StatisticProcess(){
	try {
		let FreeMem = Math.floor((OS.freemem() / 1024) / 1024);
		let TotalMem = Math.floor((OS.totalmem() / 1024) / 1024);
		let UsedMem = TotalMem - FreeMem;
		let MBStat = ('Used Memory: ' + UsedMem + '/' + TotalMem + ' MB');
		let CPUStat = ('Load Averages: ' + OS.loadavg()[0].toString().substring(0,4) + '/1m |' + OS.loadavg()[1].toString().substring(0,4) + '/5m |' + OS.loadavg()[2].toString().substring(0,4) + '/15m');
		PROCSTORE_CONNECTION.dispatch({type:'SERVER_STAT', payload: {memory:MBStat, cpu:CPUStat}});
	} catch(e){
		LOGGER.error("Проблема с получением ресурсов системы!");
	}
}

//функция генерации груп
function GenerateGroup(){
	try{
		var tempStorage = PROCSTORE_SERVER.getState().users;
		var groupStorage = {};
		groupStorage['all'] = [];
		groupStorage['servers'] = [];
		groupStorage['cashbox'] = [];
		for(var keyObject in tempStorage){
			try{
				var replaceKeyObject = FUNCTIONS.replacer(keyObject, false);
				var groupNameArr = replaceKeyObject.split('.');
				var groupName = groupNameArr[0];
				if(typeof(groupStorage[groupName]) === 'undefined'){
					groupStorage[groupName] = [];
				}
				groupStorage[groupName].push(replaceKeyObject);
				var cashboxarr = ['k1','k2','k3','k4','k5','k6','k7','k8','k9','k0'];
				if(replaceKeyObject.substr(-4,4) === 'serv'){
					groupStorage['servers'].push(replaceKeyObject);
				} else if(cashboxarr.indexOf(replaceKeyObject.substr(-2,2)) !== -1){
					groupStorage['cashbox'].push(replaceKeyObject);
				}
				groupStorage['all'].push(replaceKeyObject);
			} catch(e){
				LOGGER.error("Ошибка добавления пользователя " + keyObject + " в группы!");
			}
		}
		PROCSTORE_CONNECTION.dispatch({type:'GEN_GROUP', payload: {groups:FUNCTIONS.sortobj(groupStorage, '', 'string', false)}});
		GenerateGroupTimeout = false;
	} catch(e){
		LOGGER.error("Ошибка генерации групп пользователей: " + e);
		setTimeout(GenerateGroup, 1000);
	}
}

//функция генерации отчетов по таскам
function GenerateReport(){
	try {
		var tempStorage = PROCSTORE_SERVER.getState().tasks;
		var reportStore = {};
		var reportSortStore = {};
		for(var keyObject in tempStorage){
			try {
				for(var keyTask in tempStorage[keyObject]){
					try {
						if(typeof(reportStore[keyTask]) === 'undefined'){
							reportStore[keyTask] = {complete:[],incomplete:[],objects:{}};
						}
						if(tempStorage[keyObject][keyTask].complete === 'true'){
							reportStore[keyTask].complete.push(keyObject);
						} else {
							reportStore[keyTask].incomplete.push(keyObject);
						}
						if(typeof(reportStore[keyTask].objects[keyObject]) === 'undefined'){
							reportStore[keyTask].objects[keyObject] = {};
						}
						if(typeof(tempStorage[keyObject][keyTask].datetime) !== 'undefined'){
							reportStore[keyTask].objects[keyObject].datetime = tempStorage[keyObject][keyTask].datetime;
						}
						if(typeof(tempStorage[keyObject][keyTask].timeoncompl) !== 'undefined'){
							reportStore[keyTask].objects[keyObject].datetimeout = (new Date(tempStorage[keyObject][keyTask].timeoncompl)).getTime();
						}
						if(typeof(tempStorage[keyObject][keyTask].tryval) !== 'undefined'){
							reportStore[keyTask].objects[keyObject].tryval = tempStorage[keyObject][keyTask].tryval;
							if(typeof(reportStore[keyTask].errors) !== 'number'){
								reportStore[keyTask].errors = 0;
							}
							if(tempStorage[keyObject][keyTask].tryval === 100){
								reportStore[keyTask].errors = reportStore[keyTask].errors + 1;
							}
						}
						if(typeof(tempStorage[keyObject][keyTask].datetimecompl) !== 'undefined'){
							reportStore[keyTask].objects[keyObject].datetimecompl = tempStorage[keyObject][keyTask].datetimecompl;
						}
						if(typeof(tempStorage[keyObject][keyTask].complete) !== 'undefined'){
							reportStore[keyTask].objects[keyObject].complete = tempStorage[keyObject][keyTask].complete;
						}
						if(typeof(tempStorage[keyObject][keyTask].answer) !== 'undefined'){
							reportStore[keyTask].objects[keyObject].answer = tempStorage[keyObject][keyTask].answer;
						}
						if(typeof(tempStorage[keyObject][keyTask].datetime) !== 'undefined'){
							reportStore[keyTask].datetime = tempStorage[keyObject][keyTask].datetime;
						}
						switch(tempStorage[keyObject][keyTask].nameTask){
							case 'getFileFromWWW':
								reportStore[keyTask].text = "Скачать файл " + tempStorage[keyObject][keyTask].extLink + " в " + tempStorage[keyObject][keyTask].intLink + tempStorage[keyObject][keyTask].fileName;
								break;
							case 'execFile':
								var thisparams = '';
								if(typeof(tempStorage[keyObject][keyTask].paramArray) === 'object'){
									thisparams = tempStorage[keyObject][keyTask].paramArray.join(' ');
								}
								reportStore[keyTask].text = "Запустить скрипт " + tempStorage[keyObject][keyTask].intLink + tempStorage[keyObject][keyTask].fileName + ' ' + thisparams;
								break;
							case 'execCommand':
								reportStore[keyTask].text = "Выполнить команду " + tempStorage[keyObject][keyTask].execCommand;
								break;
						}
						var thisdependencies = '';
						if(typeof(tempStorage[keyObject][keyTask].dependencies) === 'object'){
							thisdependencies = tempStorage[keyObject][keyTask].dependencies.join(' ');
						}
						reportStore[keyTask].dependencies = thisdependencies;
						if(typeof(tempStorage[keyObject][keyTask].comment) !== 'undefined'){
							reportStore[keyTask].comment = tempStorage[keyObject][keyTask].comment;
						}
					} catch(e){
						LOGGER.error("Не обработан таск " + keyTask + " для " + keyObject + " при генерации отчета!");
					}
				}
			} catch(e){
				LOGGER.error("Ошибка генерации отчета по таскам для " + keyObject + "!");
			}
		}
		for(var keyTask in reportStore){
			reportStore[keyTask].objects = FUNCTIONS.sortobj(reportStore[keyTask].objects, '', 'string', false)
		}
		PROCSTORE_CONNECTION.dispatch({type:'GEN_REPORT', payload: {report:FUNCTIONS.sortobj(reportStore, 'datetime', 'integer', true)}});
		GenerateReportTimeout = false;
	} catch(e){
		LOGGER.error("Ошибка генерации отчетов по таскам!");
		setTimeout(GenerateReport, 15000);
	}
}

//функция очистки хранилища
function GarbageCollector(){
	var lifetime = 86400000 * 10; //устанавливаю срок хранения выполненых задач в 10 дней
	var lifetimetwo = 86400000 * 100; //устанавливаю срок хранения задач в 100 дней
	var actualStorage = PROCSTORE_SERVER.getState();
	var bannedStorage = PROCSTORE_CONNECTION.getState().iptoban; 
	GenerateReportTimeout = false;	//сбрасываю переменные таймаута (на всякий случай, т.к. раз столкнулся с их зависанием в отношении отправки в веб)
	GenerateGroupTimeout = false;
	try{
		try{
			for(var key_object in actualStorage.tasks){
				try{
					if(typeof(actualStorage.users[key_object]) === 'undefined'){
						PROCSTORE_SERVER.dispatch({type:'GC_USER', payload: {user:key_object}});
						LOGGER.warn("Найдены задания для несуществующего объекта (" + FUNCTIONS.replacer(key_object, false) + "), удаляю!");
					} else {
						for(var key_task in actualStorage.tasks[key_object]){
							try {
								if((actualStorage.tasks[key_object][key_task].complete == 'true') && (actualStorage.tasks[key_object][key_task].datetime < (Date.now()-lifetime))){
									PROCSTORE_SERVER.dispatch({type:'GC_TASK', payload: {user:key_object, task:key_task}});
									LOGGER.warn("Найдены выполненые задания с истекшим сроком (" + key_task + "), удаляю!");
								} else if(actualStorage.tasks[key_object][key_task].datetime < (Date.now()-lifetimetwo)){
									PROCSTORE_SERVER.dispatch({type:'GC_TASK', payload: {user:key_object, task:key_task}});
									LOGGER.warn("Найдены задания старше 100 дней (" + key_task + "), удаляю!");
								} else {
									try {
										if(actualStorage.tasks[key_object][key_task].answer.length > 1003){
											PROCSTORE_SERVER.dispatch({type:'GC_TASK_REPLANSW', payload: {user:key_object, task:key_task}});
											LOGGER.warn("Найден слишком длинный ответ в задании " + key_task + "(" + FUNCTIONS.replacer(key_object, false) + "), обрезаю!");
										}
									} catch(e){
										LOGGER.error("Ошибка обрезки ответа для задания " + key_task + " в объекте "  + FUNCTIONS.replacer(key_object, false) + " сборщиком мусора!");
									}
								}
							} catch (e){
								LOGGER.error("Ошибка обработки задания " + key_task + " в объекте "  + FUNCTIONS.replacer(key_object, false) + " сборщиком мусора!");
							}
						}
					}
				} catch(e){
					LOGGER.error("Ошибка обработки объекта "  + FUNCTIONS.replacer(key_object, false) + " сборщиком мусора!");
				}
			}
		} catch(e){
			LOGGER.error("Ошибка обработки сборщиком мусора постоянного хранилища: "  + e);
		}
		try {
			for(var key_ipaddr in bannedStorage){
				try {
					if(typeof(bannedStorage[key_ipaddr]) === 'object'){
						if(typeof(bannedStorage[key_ipaddr].datetime) !== 'undefined'){
							if((bannedStorage[key_ipaddr].datetime + bantimeout) < Date.now()){
								PROCSTORE_CONNECTION.dispatch({type:'GC_WRONG_PASS_CLEAR', payload: {address:key_ipaddr}});
							}
						}
					}
				} catch(e){
					LOGGER.error("Ошибка обработки IP адреса "  + FUNCTIONS.replacer(key_ipaddr, false) + " сборщиком мусора!");
				}
			}
		} catch(e){
			LOGGER.error("Ошибка обработки сборщиком мусора хранилища соединений: "  + e);
		}
		try{
			FS.readdir(PATH.join(__dirname, "notpublic"), function(err, items) {
				try{
					if (err) {
						throw err;
					} else {
						for (var i=0; i<items.length; i++) {
							try {
								var unlink = true;
								for(var key_object in actualStorage.tasks){
									if(typeof(actualStorage.tasks[key_object][items[i]]) !== 'undefined'){
										unlink = false;
									}
								}
								if(unlink){
									try{
										FS.unlinkSync(PATH.join(__dirname, "notpublic", items[i]));
										LOGGER.warn("Cборщиком мусора удален файл "  + items[i] + ' !');
									} catch(e){
										LOGGER.error("Ошибка удаления сборщиком мусора файла "  + items[i] + ' !');
									}
								}
							}catch(e){
								LOGGER.error("Ошибка обработки сборщиком мусора файла "  + items[i] + ' !');
							}
						}
					}
				} catch(e){
					LOGGER.error("Ошибка чтения сборщиком мусора директории с файлами: "  + e);
				}
			});
		} catch(e){
			LOGGER.error("Ошибка обработки сборщиком мусора хранилища файлов: "  + e);
		}
	} catch(e){
		LOGGER.error("Неустранимая ошибка в работе сборщика мусора: "  + e);
	}
}