/**
 *	IOCommander v2
 *	(c) 2018 by Siarhei Dudko.
 *
 *	MODULE
 *  APP ROUTES
 *	ip to ban система
 *
 */

"use strict"

//подгружаемые библиотеки
var EXPRESS = require('express'),
	PATH = require('path'),
	CONFIG = require('config'),
	UPLOADFILES = require('express-uploadfiles');

var v2upload = EXPRESS.Router();

const _settings = {
	path: PATH.join(__dirname, 'notpublic'),
	usekeyasname: true
};

var uploadfiles = UPLOADFILES(_settings);

v2upload.all('*', uploadfiles.upload);

module.exports = v2upload;