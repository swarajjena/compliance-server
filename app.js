var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var dbStructureRouter = require('./routes/db_structure');
var dbData = require('./routes/db_data');
var dbImport = require('./routes/db_import');
var dbRetrive = require('./routes/db_retrive');

var fileUpload = require("express-fileupload")

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use('/public', express.static(__dirname + '/public'));  
app.use(express.static(__dirname + '/public')); 
app.use(express.json({limit: '50mb'}));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, enctype");
  next();
});

/*app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 },
}));
*/


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/structure',dbStructureRouter);
app.use('/data',dbData);
app.use('/import',dbImport);
app.use('/retrive',dbRetrive);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
