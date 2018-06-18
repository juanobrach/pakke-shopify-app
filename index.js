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
app.use(require('./controllers'));

/*
*  Devuelve los diferentes shipping rates que ofrece pakke
*/
app.post('/pakkeShopify/shipping_rates', ( req, res ) => {
  return res.send({
    "rates": [
       {
           "service_name": "canadapost-overnight",
           "service_code": "ON",
           "total_price": "1295",
           "description": "This is the fastest option by far",
           "currency": "CAD",
           "min_delivery_date": "2013-04-12 14:48:45 -0400",
           "max_delivery_date": "2013-04-12 14:48:45 -0400"
       },
       {
           "service_name": "fedex-2dayground",
           "service_code": "2D",
           "total_price": "2934",
           "currency": "USD",
           "min_delivery_date": "2013-04-12 14:48:45 -0400",
           "max_delivery_date": "2013-04-12 14:48:45 -0400"
       },
       {
           "service_name": "fedex-priorityovernight",
           "service_code": "1D",
           "total_price": "3587",
           "currency": "USD",
           "min_delivery_date": "2013-04-12 14:48:45 -0400",
           "max_delivery_date": "2013-04-12 14:48:45 -0400"
       },
     ]
  })
})



app.listen(3000, () => {
  console.log('Example app listening on port 3000!');
});
