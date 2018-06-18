const express = require('express');
const    path = require('path');
const  router = express.Router();
const request           = require('request-promise');
const Shopify           = require('shopify-api-node');
const ShopifyController = require('../controllers/ShopifyControllers.js')();
const UserController    = require('../controllers/UserController.js')();
const PakkeController   = require('../controllers/PakkeController.js')();
const fs                = require('fs');

const SHOPIFY_API_KEY   = process.env.SHOPIFY_API_KEY;
const API_SECRET        = process.env.SHOPIFY_API_SECRET;
const SHOP_URL          = process.env.SHOP_URL;
const SHOP_NAME         = process.env.SHOP_NAME;
const APP_URL           = process.env.APP_URL;
const SHOP_TOKEN        = process.env.SHOP_TOKEN;
const PAKKE_API_KEY     = process.env.PAKKE_API_KEY;




// router.get('/get_users', function(req,res){
//   UserController.read().then( response =>{
//     res.send(JSON.stringify(response));
//   }).catch( error=> {
//     res.send(JSON.stringify({
//       "valid" : false,
//       "message" : "La tienda no existe"
//     }));
//   })
// })

router.get('/', (req, res)=>{

    res.render('adminDev','');
})

router.get('/create_user', function(req, res) {

  const user_id = UserController.createUser({
    'name':'juan',
    'shop':'pakkeapi'
  }).then( user_id => {
    console.log("user_id ", user_id)
    res.send(
      JSON.stringify(
        user_id
      )
    );
  }).catch( err => {
    console.log("error", err )
    res.send(
      JSON.stringify(
        err
      )
    );
  })
})


/*
*   Esta fn es para desarrollo, lista los webhooks de un usuario especificado poder
*   su @accessToken
*/
router.get('/get_shopify_webhooks', function(req, res){

  ShopifyController.list_wehbooks().then( webhooks =>{
    console.log('webhooks', webhooks );
    res.send(JSON.stringify(webhooks))
  }).catch( err =>{
    console.log('erros', err );
    res.send(JSON.stringify(err))
  })
})


/*
* Esta fn es de desarrollo para crear los webhooks por un usuario especificado
* por su @accessToken
*/
router.get('/create_shopify_webhook', function( req, res){

    ShopifyController.createWebhook({
      shop_name: 'pakkeapi',
      shopify_token : '08dd51cda105586b623e2da563c99d2d'
    }).then( result => {
      res.send(JSON.stringify(result))
    }).catch( err => {
      res.send(JSON.stringify(err))
    })
})

router.get('/list_providers', function(req, res){
  const services = ShopifyController.listServices().then( resolve=>{
    res.send(JSON.stringify(resolve));
  }).catch( error => {
    /*
    *  error.errors.base
    */
    res.send(JSON.stringify(error));
  });
})

router.get('/delete_provider/:provider_id', function(req, res){

  const services = ShopifyController.deleteProvider(req.params.provider_id).then( resolve=>{
    res.send(JSON.stringify(resolve));
  }).catch( error => {
    /*
    *  error.errors.base
    */
    res.send(JSON.stringify(error));
  });
})

router.get('/update_provider/:provider_id', function(req, res){
  const provider_id = req.params.provider_id;
  const services = ShopifyController.updateProvider(provider_id ).then( resolve=>{
    res.send(JSON.stringify(resolve));
  }).catch( error => {
    /*
    *  error.errors.base
    */
    res.send(JSON.stringify(error));
  });
})


router.get('/delete_webhook/:webhook_id', function( req, res){
  const webhook_id = req.params.webhook_id;
  const webhook_deleted = ShopifyController.deleteWebhook(webhook_id).then( resolve=>{
    res.send( JSON.stringify( resolve ) )
  }).catch( err => {
    res.send( JSON.stringify( err ) )
  })
})

router.get('/createService', function(req, res){
  const service = {
         name:'Pakke re',
         callback_url: APP_URL + '/pakkeShopify/calculate_rates_callback',
         service_discovery: true
  }
  const services = ShopifyController.createService( service, '87ddda4b78f9668d1a4ac72a9bb4c13d', 'pakkeapi' ).then( resolve=>{
    res.send(JSON.stringify(services));
  }).catch( error => {
    /*
    *  error.errors.base
    */
    res.send(JSON.stringify(error));
  });
})



router.get('/create_order_pakke', function(req, res){
    PakkeController.createOrder( ).then(  order =>{
      res.setHeader('Content-Type', 'application/json');
      console.log( order);
      res.send( order  );
    }).catch( function(err){
      res.setHeader('Content-Type', 'application/json');
      res.send( JSON.stringify( err ) )
    })
})

router.post('/getUserDataByShopName', (req, res) => {
  const shop_name = req.body.shop_name;
  UserController.getUserByShopName( shop_name ).then( user => {
    res.send( JSON.stringify(user))
  }).catch( err=> {
    res.send( JSON.stringify( {error:true, error_message:err }))
  })
})

module.exports = router
