var express = require('express')
  , router = express.Router();

const crypto = require('crypto');
const cookie = require('cookie');
const nonce = require('nonce')();
const querystring = require('querystring');
const request = require('request-promise');
const Shopify = require('shopify-api-node');
const ShopifyController = require('./ShopifyControllers.js')();


var DB  = require('../db');

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const API_SECRET = process.env.SHOPIFY_API_SECRET;
const SHOP_URL = process.env.SHOP_URL;
const SHOP_NAME = process.env.SHOP_NAME;
const APP_URL = process.env.APP_URL;


/*
*  url('/pakkeShopify/install')
*  Ruta de instalacion de la app en Shopify
*  Se pediran permisos al usuario de utilizar la app
*
*/
router.get('/install/authorize', function(req, res) {
  const shop = SHOP_URL;
  const scopes = 'read_products,write_shipping,read_shipping';

  if (shop) {
    console.log( shop );
    const state = nonce();
    const redirectUri = process.env.APP_URL + '/pakkeShopify/install/getAccessTokenCallBack';
    const installUrl = 'https://' + shop +
      '/admin/oauth/authorize?client_id=' + SHOPIFY_API_KEY +
      '&scope=' + scopes +
      '&state=' + state +
      '&redirect_uri=' + redirectUri;

    res.cookie('state', state);
    res.redirect(installUrl);
  } else {
    // Todo mostrar error al cliente y el español
    return res.status(400).send('Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request');
  }
})

/*
*   url( pakkeShopify/install/oAuthCallback )
*   Esta url es para el callback del oAuth de Shopify
*   El callback devolvera un codigo que sera el que nos permita obtener nuestro token permanente
*/

router.get('/install/getAccessTokenCallBack', function(req, res) {
  console.log("preparando callback para obtener el token ")
  const { shop, hmac, code, state } = req.query;
  const stateCookie = cookie.parse(req.headers.cookie).state;

  if (state !== stateCookie) {
    return res.status(403).send('Request origin cannot be verified');
  }

  if (shop && hmac && code) {
    const map = Object.assign({}, req.query);
    delete map['signature'];
    delete map['hmac'];
    const message = querystring.stringify(map);
    const providedHmac = Buffer.from(hmac, 'utf-8');
    const generatedHash = Buffer.from(
      crypto
        .createHmac('sha256', API_SECRET )
        .update(message)
        .digest('hex'),
        'utf-8'
      );
    let hashEquals = false;

    try {
      hashEquals = crypto.timingSafeEqual(generatedHash, providedHmac)
    } catch (e) {
      hashEquals = false;
    };

    if (!hashEquals) {
      return res.status(400).send('HMAC validation failed');
    }
   const accessTokenRequestUrl = 'https://' + shop + '/admin/oauth/access_token';
   const accessTokenPayload = {
     client_id: SHOPIFY_API_KEY,
     client_secret: API_SECRET,
     code,
   };

   request.post( accessTokenRequestUrl, { json: accessTokenPayload })
   .then((accessTokenResponse) => {
     const accessToken = accessTokenResponse.access_token;
     console.log("Token recibido: " + accessToken );
     // TODO: guardar token en base de datos { shop: shop_bame , accessToken: accessToken }
     // TODO: redireccionar a Welcome { explicaciones }
     res.render('welcome')
   })
   .catch((error) => {
     res.status(error.statusCode).send(error.error_description);
   });

 } else {
   res.status(400).send('Required parameters missing');
 }
 router.get('admin', function(req, res){
   console.log("App Admin")
   // TODO: traer informacion del usuario que esta logeado en la tienda. Posible uso del SDK
   res.status(200).render('admin');
 })

 /**
 *  Instalar servicios de pakke en shopify
 *  Esta funcion la deberia ejecutar el cliente desde el dashboard de Shopify
 *  o se ejecutara al mismo tiempo de la instalacion
 */
 router.post('/admin/install_services', function(req, res){
   const services = [];

   // Obtengo los servicios de Pakke
   request({
     method:'get',
     uri: '/pakke/get_services',
     json: true })
    .then( (services )=>{
      if ( services.length > 0 ) {
        services.push(services);
        // Instalo los servicios en shopify
        ShopifyController.createServices(services);

      }else{
        res.send(JSON.stringify({'error':true, 'error_message': error }));
      }
   }).catch( (error)=>{
      res.send(JSON.stringify({'error':true, 'error_message': error }));
   })
  })
})

router.get('/test/list_providers', function(req, res){
  const services = ShopifyController.listServices().then( resolve=>{
    res.send(JSON.stringify(resolve));
  }).catch( error => {
    /*
    *  error.errors.base
    */
    res.send(JSON.stringify(error));
  });
})

router.get('/test/delete_provider', function(req, res){
  const services = ShopifyController.deleteProvider(13644562553).then( resolve=>{
    res.send(JSON.stringify(resolve));
  }).catch( error => {
    /*
    *  error.errors.base
    */
    res.send(JSON.stringify(error));
  });
})


router.get('/test', function(req, res){

    const service = {
           name:'Pakke Rate Provider 3',
           callback_url: APP_URL + '/pakkeShopify/calculate_rates_callback',
           service_discovery: true
    }

  const services = ShopifyController.createServices(  service ).then( resolve=>{
    res.send(JSON.stringify(services));
  }).catch( error => {
    /*
    *  error.errors.base
    */
    res.send(JSON.stringify(error));
  });
})


/*
* Callback que recibe productos y una direccion del customer para calcular costos de envio de
* los diferentes servicios
*/
router.post('/calculate_rates_callback', function(req, res){
  console.log("calculando rates")
  const order_items = req.body.rate.items;

  /* Pakke solo espera conocer la cantidad en kg */
  const totalWeight = order_items.reduce( function( kg, item ){
      return kg + ( item.grams / 1000 )
  },0)
  console.log(totalWeight);

  if( req.body ){
    // Envio datos a pakke para que me calcule el precio
    request({
        method:'POST',
        uri: 'https://seller.pakke.mx/api/v1/Shipments/rates',
        headers: {
          'content-type':'application/json',
          'x-api-key': '3d81a5d2407699edd3c79f93224e50986ec4755c'
        },
        body:{
        	"Parcel": {
        		"Length": 1,
        		"Width": 1,
        		"Height": 1,
        		"Weight": totalWeight
        	}
        },
        json: true,
      }).then( result=>{
        if( result ){
          /*
          *  Si devuelve un array con distintos servicios hay que darle el formato que shopify espera-
          *  https://help.shopify.com/api/reference/shipping_and_fulfillment/carrierservice
          */

          cosnole.log(resullt)

          const servicesPrices = result;

          return servicesPrices.map( function( service ){
              const shopifyObjectResponse = {}
              shopifyObjectResponse['rates'] = {
                 "service_name": "canadapost-overnight",
                 "description": "This is the fastest option by far",
                 "service_code": "ON",
                 "currency": "CAD",
                 "total_price": "1295"
              }
              return shopifyObjectResponse

          })
        }
      }).catch( error=>{
        console.log("error");
        console.log(error.error);
        res.send(JSON.stringify({'error':true, 'error_message': error.error.message }))
      })
  }else{
    res.send( JSON.stringify({'error':true, 'message': 'no fue posible encontrar rates' }) )
  }
})

module.exports = router
