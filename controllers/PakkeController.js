var express = require('express')
  , router = express.Router()

const request = require('request-promise');
const Shopify = require('shopify-api-node');
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const SHOP_NAME = process.env.SHOP_NAME;


/*
*  url( pakke/webhook)
*/
router.get('/webhook', function(req,res){
  console.log("pake webhook");
  // TODO: connectar a la API shopify para hacer un update al trackeo de los envios
  res.send(JSON.stringify({ trackStatus: true }));
})


/*
* Este metodo valida la api key del customer haciendo una consulta basica
* Utilizado por el wizard step 2.
*/
router.post('/validateApiKey', function(req, res){
  res.setHeader('Content-Type', 'application/json');
  const user_api_key = req.body.api_key;

  if( user_api_key.length  <= 0 ){
      res.send(JSON.stringify({ error: true, error_message: 'No puede estar vacia la API key' }));
  }

  request({
    method:'get',
    uri: 'https://seller.pakke.mx/api/v1/PakkeServices',
    headers: {
      'content-type':'application/json',
      'x-api-key': user_api_key
    },
    json: true // Automatically parses the JSON string in the response
  }).then( (result) =>{
    if( result ){
      res.send(JSON.stringify({ 'validated': true }));
    }
  }).catch((error) => {
      res.send(JSON.stringify({ 'error': true, 'error_message': error }));
   })
})

/**
* Signup method : https://seller.pakke.mx/api/v1/Users/signUp
*/
router.post('/signUp', function(req,res){
  res.setHeader('Content-Type', 'application/json');
  request({
    method:'POST',
    uri: 'https://seller.pakke.mx/api/v1/Users/signUp',
    body:{
      "email": req.body.user_email,
      "name": req.body.user_name,
      "password": req.body.user_password,
      "confirm": req.body.user_repeat_password
    },
    json: true
  }).then( (result) =>{
    if( result ){
      // Obtengo la aprobacion del token para activar api key
      // TODO: en la documentacion decia que devolvia la API KEY pero no lo hace
      // TODO: guardar token o public_key en DB.
      const uid = result.uid;
      const token = result.token;
      // const apiKey = result.apiKey;
      request({
        method:'GET',
        uri:'https://seller.pakke.mx/api/v1/Users/confirm',
        qs:{
          uid:uid,
          token:token
        },
        json: true
      }).then( (confirm )=>{
        if( confirm.error ){
          res.send(JSON.stringify({ error: true, error_message: confirm.error.message }));
        }else{
          res.send(JSON.stringify({ validated: true }));
        }
      }).catch( (error)=>{
        console.log(error)
          res.send(JSON.stringify({ error: true, error_message: error }));
      })
    }
  }).catch((error) => {
      res.send(JSON.stringify({ error: true, error_message: error }));
      console.log(error);
   })
})


/*
*  Obtengo los servicios, esta fn es util para cuando se requiera instalarlos
*/
router.get('/get_services', function(req, res){
  request({
    method:'get',
    uri: 'https://seller.pakke.mx/api/v1/PakkeServices',
    headers: {
      'content-type':'application/json',
      'x-api-key': user_api_key
    },
    json: true
  }).then( (result)=>{
    if( result ){
      res.send(JSON.stringify(result));
    }
  }).catch( (error)=>{
      res.send(JSON.stringify({'error':true, 'error_message': error }));
  })
})

module.exports = router;
