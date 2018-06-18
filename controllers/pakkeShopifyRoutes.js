var express = require('express')
  , router = express.Router();

const crypto            = require('crypto');
const cookie            = require('cookie');
const nonce             = require('nonce')();
const querystring       = require('querystring');
const request           = require('request-promise');
const Shopify           = require('shopify-api-node');
const ShopifyController = require('./ShopifyControllers.js')();
const User              = require('./UserController.js')();
const PakkeController   = require('./PakkeController.js')();
const fs                = require('fs');

const SHOPIFY_API_KEY   = process.env.SHOPIFY_API_KEY;
const API_SECRET        = process.env.SHOPIFY_API_SECRET;
const SHOP_URL          = process.env.SHOP_URL;
const SHOP_NAME         = process.env.SHOP_NAME;
const APP_URL           = process.env.APP_URL;


/*
*   Al instalar un shipping rate provider se le asigna un callback_url.
*   Este callback es requerido por shopify al llegar al checkout.
*   Nos envia aqui la orden y nosotros debemos enviarle a pakke el peso total de todos los productos
*   @return ( shiping providers con sus precios )
*/
router.post('/shipping_rates_providers_cb', function(req, res){
  console.log("Calculando rates");
  var total_weight = 0;
  // Obtengo el nombre de la tienda para buscar el API key de pakke correspondiente
  const shop_name = req.rawHeaders[5].split('.')[0]
  console.log('shop name', shop_name );
  User.findByShopName(shop_name).then( user=>{
    if( !req.body.rate.items ){
      // TODO: sistema de notificacion de errores
      res.send( JSON.stringify({error:true, message:'no existen items en la orden'}) )
    }else{
      console.log('items', req.body.rate.items );
        var grams = 0;
       req.body.rate.items.forEach( ( el) =>{
        grams += el.grams
      })
    }

    const data = {
      shipping_total_weight: grams / 1000,
      zip_code: req.body.rate.destination.postal_code,
      pakke_api_key: user.key_pake
    }
    console.log(data);
    PakkeController.getProvidersShippingPrices( data  ).then(  shipping_providers =>{
      res.setHeader('Content-Type', 'application/json');
      console.log( shipping_providers);
      res.send( shipping_providers  );
    }).catch( function(err){
      res.setHeader('Content-Type', 'application/json');
      res.send( JSON.stringify( err ) )
    })
  }).catch( err => {
      // TODO: manejar error si no encuentra el usuario
      console.log("no encuentra el usuario")
  })
})

/*
*   Este metodo valida que la tienda shopify exista.
*
*/
router.post('/validate_shop_url', function(req, res) {
  const shop = req.body.shopify_shop_name;
  console.log(shop)
  if (shop) {
      ShopifyController.validateIfShopExists(shop).then( result => {
        console.log("la tienda existe" ,shop)
        // Valido que no exista ya un usuario con esta tienda
        User.getUserByShop(shop).then( exist => {
          res.send(JSON.stringify({
            "valid": false,
            "message": "Ya existe un usuario con esta tienda"
          }))
        }).catch( notExist => {
          res.send(JSON.stringify({
            "valid" : true,
            "message" : ""
          }));
        })
      }).catch( error=> {
        res.send(JSON.stringify({
          "valid" : false,
          "message" : "La tienda no existe"
        }));
      })
  } else {
    // Todo mostrar error al cliente y el español
    res.send(JSON.stringify({'error':true, 'error_message': 'El nombre de la tienda no puede estar vacio' }));
  }
})



router.post( '/validateApiKeyPakke', function( req, res){
    const apiKey = req.body.pakke_public_key;

    if( apiKey ){
      PakkeControler.validateApiKey( apiKey ).then( function(result){
        res.send(JSON.stringify({'error': false }))
      }).catch( error => {
        res.send(JSON.stringify({
          "valid" : true,
          "message" : "La API key no es valida o no esta habilitada realizar consultas"
        }));
      })
    }else {
      res.send(JSON.stringify({'error': true }))
    }
})


/*
*   Este metodo lo ocupa el formulario principal. La mision es capturar informacion del cliente
*   Para luego poder identificar en distintos eventos a que tienda corresponderan las acciones.
*/
router.post('/signup', function(req, res){
  const logtext= "--- nueva instalacion ---";
  fs.appendFile('installations.log', logtext, (err) => {
      if (err) throw err;
      console.log('The lyrics were updated!');
  });

  const user_data = {
    name: req.body.name,
    email: req.body.email,
    shop: req.body.shop,
    key_pake: req.body.key_pake,
    token_shopify: ''
  }

  User.createUser( user_data ).then( user => {
    console.log("user_id_response ", user );
    res.redirect('/pakkeShopify/install/authorize/'+ req.body.shop +'/'+user._id);
    const logtext= "USUARIO CREADO: OK";
    fs.appendFile('installations.log', logtext, (err) => {
        if (err) throw err;
    });
  }).catch( err=>{
    // TODO: manejar error
    const logtext= "USUARIO CREADO: NO";
    fs.appendFile('installations.log', logtext, (err) => {
        if (err) throw err;
    });
    // envio error al ajax del formulario
    res.send(JSON.stringify({error:true, error_message: err.errors.shop.message}))
  })
})

/*
*  url('/pakkeShopify/install')
*  Ruta de instalacion de la app en Shopify
*  Se pediran permisos al usuario de utilizar la app
*
*/
router.get('/install/authorize/:shop_name/:user_id', function(req, res) {
  const shop = req.params.shop_name;
  const user_id = req.params.user_id;
  const scopes = 'read_products,write_shipping,read_shipping,read_orders';
  if (shop) {

    const state = nonce();
    const redirectUri = APP_URL + '/pakkeShopify/install/getAccessTokenCallBack'
    const installUrl = 'https://' + shop +
      '.myshopify.com/admin/oauth/authorize?client_id=' + SHOPIFY_API_KEY +
      '&scope=' + scopes +
      '&state=' + state +
      '&redirect_uri=' + redirectUri;

    res.cookie('state', state);
    res.send( JSON.stringify({ error:false, installUrl:installUrl }) );
  } else {
    // Todo mostr ar error al cliente y el español
    res.send( JSON.stringify({ error:true, message:'Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request' }) );
  }
})

/*
*   url( pakkeShopify/install/oAuthCallback )
*   Esta url es para el callback del oAuth de Shopify
*   El callback devolvera un codigo que sera el que nos permita obtener nuestro token permanente
*   Ademas, sera necesario al momento de confirmar el token permantente la isntalacion del servicio que ofrecera
*   calcular los costos de envio que ofrece Pake.
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
      const logtext= "TOKEN SHOPIFY: NO";
      fs.appendFile('installations.log', logtext, (err) => {
          if (err) throw err;
          console.log('The lyrics were updated!');
      });
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
     console.log("shop",shop);
     const logtext= "TOKEN SHOPIFY: OK";
     fs.appendFile('installations.log', logtext, (err) => {
         if (err) throw err;
     });
     User.update_by_shop_name( shop.split('.')[0], accessToken  ).then( response => {
       /*
       *  Instalo el servicio que utilizara Shopify
       *  para calcular el costo de envio con los proveedores de Pakke.
       */

       const logtext= "USUARIO ACTUALIZADO DATA TOKEN: OK";
       fs.appendFile('installations.log', logtext, (err) => {
           if (err) throw err;
       });

       console.log('user updated', response);
       const shipping_rate_provider = {
         'name': 'Pakke',
         'callback_url': APP_URL + '/pakkeShopify/shipping_rates_providers_cb',
         'service_discovery': true
       }

       ShopifyController.createService( shipping_rate_provider, accessToken, shop )
       .then( response => {

         const logtext= "CREACION DE SERVICIO PARA RATES: OK \n";
         fs.appendFile('installations.log', logtext, (err) => {
             if (err) throw err;
         });

         /* Creando webhook para escuchar cuando se paga una orden
         *  Este webhook sera responsable de crear ordenes en pakke
         */
         const data = {
           shop_name: shop,
           shopify_token : accessToken
         }

         ShopifyController.createWebhook(data).then( result => {
           const logtext= "CREACION DE WEBHOOK PARA ORDEN: OK";
           fs.appendFile('installations.log', logtext, (err) => {
               if (err) throw err;
           });
           res.render('welcome')
         }).catch( err => {
          const logtext= "CREACION DE WEBHOOK PARA ORDEN: NO";
           fs.appendFile('installations.log', logtext, (err) => {
               if (err) throw err;
               console.log('The lyrics were updated!');
           });
           res.render('welcome')
         })
       }).catch( err => {
         // TODO: enviar mensaje de error notificando que no se ha podido instalar el servicio ( instalacion manual )
         const logtext= "CREACION DE SERVICIO PARA RATES: NO";
         fs.appendFile('installations.log', logtext, (err) => { if (err){throw err;}});

         console.log("service not installed")
         console.log(err);
         ShopifyController.createWebhook(data).then( result => {
           const logtext= "CREACION DE WEBHOOK PARA ORDEN: OK \n --- FIN NUEVA INSTALACION ---";
           fs.appendFile('installations.log', logtext, (err) => { if (err){throw err;}});
           res.render('welcome')
         }).catch( err => {
           const logtext= "CREACION DE WEBHOOK PARA ORDEN: NO";
           fs.appendFile('installations.log', logtext, (err) => { if(err){ throw err; }})
           });
           res.render('welcome')
         })
       })
     }).catch( err=>{
       // TODO: Manajar error de actualizacion de usuario
       const logtext= "ACTUALIZACION DE USUARIO DATA TOKEN: NO";
       fs.appendFile('installations.log', logtext, (err) => { if(err){throw err;}});
   }).catch((error) => {
     console.log(error)
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
     json: true }).then( (services )=>{
      if ( services.length > 0 ) {
        // Instalo los servicios en shopify
        services.push(services);
      }else{
        res.send(JSON.stringify({'error':true, 'error_message': error }));
      }
   }).catch( (error)=>{
      res.send(JSON.stringify({'error':true, 'error_message': error }));
   })
  })
})

router.post('/order_paid_webhook', function(req,res){
  console.log("Webhook order paid");
  console.log(req.body);

S

})


/*
*   Esta fn es para desarrollo, lista los webhooks de un usuario especificado poder
*   su @accessToken
*/
router.get('/dev/get_shopify_webhooks', function(req, res){

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
router.get('/dev/create_shopify_webhook', function( req, res){

    ShopifyController.createWebhook({
      shop_name: 'pakkeapi',
      shopify_token : '08dd51cda105586b623e2da563c99d2d'
    }).then( result => {
      res.send(JSON.stringify(result))
    }).catch( err => {
      res.send(JSON.stringify(err))
    })
})

router.get('/dev/list_providers', function(req, res){
  const services = ShopifyController.listServices().then( resolve=>{
    res.send(JSON.stringify(resolve));
  }).catch( error => {
    /*
    *  error.errors.base
    */
    res.send(JSON.stringify(error));
  });
})

router.get('/dev/delete_provider/:provider_id', function(req, res){

  const services = ShopifyController.deleteProvider(req.params.provider_id).then( resolve=>{
    res.send(JSON.stringify(resolve));
  }).catch( error => {
    /*
    *  error.errors.base
    */
    res.send(JSON.stringify(error));
  });
})

router.get('/dev/update_provider/:provider_id', function(req, res){
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


router.get('/dev/delete_webhook/:webhook_id', function( req, res){
  const webhook_id = req.params.webhook_id;
  const webhook_deleted = ShopifyController.deleteWebhook(webhook_id).then( resolve=>{
    res.send( JSON.stringify( resolve ) )
  }).catch( err => {
    res.send( JSON.stringify( err ) )
  })
})

router.get('/dev', function(req, res){
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


/*
* Callback que recibe productos y una direccion del customer para calcular costos de envio de
* los diferentes servicios
*/
router.post('/calculate_rates_callback', function(req, res){
  console.log("calculando rates")
  const order_items = req.body.rate.items;

  console.log("order items", req.body);
  /* Pakke solo espera conocer la cantidad en kg */
  const totalWeight = order_items.reduce( function( kg, item ){
      return kg + ( item.grams / 1000 )
  },0)

  console.log("total weight", totalWeight);

  if( req.body ){
    // Envio datos a pakke para que me calcule el precio
    PakkeController.getProvidersShippingPrices( result ).then( response =>{
      cosnole.log('pakke response ',resullt)
      res.send( JSON.stringify(result ) )
    }).catch( err => {
      res.send( JSON.stringify({'error':true, 'message': 'no fue posible encontrar rates' }) )
    })
  }else{
    res.send( JSON.stringify({'error':true, 'message': 'no fue posible encontrar rates' }) )
  }
})



router.get('/dev/create_order_pakke', function(req, res){
    PakkeController.createOrder( ).then(  order =>{
      res.setHeader('Content-Type', 'application/json');
      console.log( order);
      res.send( order  );
    }).catch( function(err){
      res.setHeader('Content-Type', 'application/json');
      res.send( JSON.stringify( err ) )
    })
})


router.post('/webhook/payment', function(req, res){
  console.log('order payment webhook')
  const items = req.body.line_items;
  const shipping_provider = req.body.shipping_lines;
  const shipping_address = req.body.shipping_address;
  const shop_url = req.rawHeaders[5];
  const shop_name = shop_url.split('.')[0];
  console.log(shop_name)
  const options = {
    url:''
  };
  req( option ).then( res => {

  }).catch( err => {

  })
})

module.exports = router
