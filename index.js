const fs = require('fs');

const pipe = require('pipe');
const dotenv = require('dotenv').config();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const path       = require('path');
const db         = require('./db.js')();
const logger     = require('express-logger');


app.set('view engine', 'pug')
app.set('views', path.join(__dirname, '/views'));
app.use(logger({path: __dirname + '/installs.log'}));
app.use(express.static( __dirname + '/public'));
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

// app.use(require('./middlewares'));
app.use( require('./routes') );

app.listen(3000, () => {
  console.log('App listening on http://localhost:3000');
});
