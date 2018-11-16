/**
 *	IOCommander v2
 *	(c) 2018 by Siarhei Dudko.
 *
 *	MODULE
 *  SENDMAIL
 *	Отправка сообщений на email. Функция SendMailOne - складирует сообщения в папку /mail, воркер SendMailWorker забирает и отправляет.
 *
 */

"use strict"

//подгружаемые библиотеки
var CONFIG = require('config'),
	LODASH = require('lodash'),
	NODEMAILER = require('nodemailer'),
	CRYPTO=require("crypto"),
	FS=require("fs"),
	PATH = require('path');
	
//подгружаемые модули
var LOGGER = require(PATH.join(__dirname, 'module.logger.js'));

//глобальные переменные
var stdout = {};
Object.assign(stdout, LOGGER);
stdout.error = LOGGER.warn;	//error убираю, чтобы не зацикливать
var run = 0;


//валидация конфига email
function ConfValidator(){
	try{
		if( (typeof(CONFIG.email.host) === 'string') &&
			(typeof(CONFIG.email.port) === 'number') &&
			(typeof(CONFIG.email.login) === 'string') &&
			(typeof(CONFIG.email.password) === 'string') &&
			(typeof(CONFIG.email.mailto) === 'string') ){
				return true;
			} else {
				return false;
			}
	} catch(err){
		if(CONFIG.debug){
			stdout.error('SENDMAIL-> ошибка валидации конфига: '+err);
		}
		return false;
	}
}

if(ConfValidator()){
	var _secure = false;
	if (CONFIG.email.port === 465) { _secure = true; }
	let transporter = NODEMAILER.createTransport({
		host: CONFIG.email.host,
		port: CONFIG.email.port,
		secure: _secure, // true for 465, false for other ports
		auth: {
			user: CONFIG.email.login, 
			pass: CONFIG.email.password 
		}
	});

	var SendMail = function (_obj){
		var obj = LODASH.clone(_obj);
		if(typeof(obj.mailto) === 'undefined'){
			obj.mailto = CONFIG.email.mailto;
		}
		if(typeof(obj.theme) === 'undefined'){
			obj.theme = obj.message.toString().split(" ").slice(0, 10).join(" ");
		}
		let mailOptions = {
			from: '"IOCommander Server" <'+CONFIG.email.login+'>', // адрес отправителя
			to: obj.mailto, // адреса получателей, через запятую
			subject: obj.theme, // тема
			text: obj.message, // текст
			//html: obj.message // html body
		};

		// send mail with defined transport object
		transporter.sendMail(mailOptions, (error, info) => {
			run = 0;
			if (error) {
				return stdout.error('SENDMAIL-> ошибка отправки почты: '+error);
			} else {
				stdout.log('SENDMAIL->Сообщение отправлено с id: %s', info.messageId);
			}
		});
	}
} else {
	var SendMail = function (_obj){
		return stdout.warn('SENDMAIL-> настройки почты некорректны, уведомления отключены');
	}
}

//добавить сообщение в очередь
function SendMailOne(_obj, _stdout){
	if(typeof(_stdout) === 'object'){
		for(const key in _stdout){
			if(typeof(_stdout[key]) === 'function'){
				stdout[key] = _stdout[key];
			}
		}
	}
	if(typeof(_obj) === 'object'){
		if(typeof(_obj.message) === 'string'){
			try{
				const hash = CRYPTO.createHash('sha1');
				var data = JSON.stringify(_obj);
				hash.update(data);
				FS.writeFile(PATH.join(__dirname, 'mail', Date.now()+'-'+hash.digest('hex')+'.mail'), data, (err) => {
					try{
						if (err) {
							throw err;
						}
					} catch(e){
						stdout.error('SENDMAIL-> ошибка записи сообщения в очередь шаг2: '+e);
					}
				});
			} catch(err){
				stdout.error('SENDMAIL-> ошибка записи сообщения в очередь шаг1: '+err);
			}
		}
	}
}

//парсит очередь сообщений
function goQUERY(){
	if((run+300000) < Date.now()){
		run = Date.now();
		FS.readdir(PATH.join(__dirname, 'mail'), function(err,mailall){
			try{
				if(err){
					throw err;
				} else {
					if(typeof(mailall[0]) !== 'undefined'){
						var message = mailall[0];
						FS.readFile(PATH.join(__dirname, 'mail', message), "utf8", (err1, data) => {
							try{
								if(err1){
									throw err1;
								} else {
									SendMail(JSON.parse(data));
								}
							} catch(e){
								stdout.error('SENDMAIL-> ошибка загрузки сообщения из очереди: '+e);
								run = 0;
							}
							FS.unlink(PATH.join(__dirname, 'mail', message), (err2) => {
								if(err2){
									stdout.error('SENDMAIL-> ошибка удаления сообщения из очереди: '+err2);
								}
							});
						});
					} else {
						run = 0;
					}
				}
			} catch(e){
				stdout.error('SENDMAIL-> ошибка чтения директории сообщений: '+e);
				run = 0;
			}
		});
	}
}

var SendMailWorker = function(){setInterval(goQUERY, 1000);}

module.exports.send = SendMailOne;
module.exports.worker = SendMailWorker;