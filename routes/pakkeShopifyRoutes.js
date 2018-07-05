var express = require('express')
  , router = express.Router();

const crypto            = require('crypto');
const cookie            = require('cookie');
const nonce             = require('nonce')();
const querystring       = require('querystring');
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

/*
*   linea de codigo [  ] Instalacion usuario
*
*/

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
  UserController.getUserByShopName(shop_name).then( user=>{
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
      pakke_api_key: user.key_pake || PAKKE_API_KEY
    }
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
        UserController.getUserByShopName(shop).then( exist => {
          console.log("Existe un usuario para esta la tienda ")
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
  });

  const user_data = {
    shop: req.body.shop.toLowerCase(),
    key_pake: req.body.key_pake,
    token_shopify: ''
  }

  UserController.createUser( user_data ).then( user => {
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
    UserController.getUserByShopName( user_data.shop ).then( user => {
      // envio error al ajax del formulario
      res.redirect('/pakkeShopify/install/authorize/'+ req.body.shop +'/'+user._id);
    }).catch( err => {
      if ( err.error_number == 1 ){
        res.redirect('/pakkeShopify/install/authorize/'+ req.body.shop +'/'+err.data._id);
      }else{
        console.log( err );
      }
    });
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
  const scopes = 'read_products,write_shipping,read_shipping,read_orders,write_orders,read_fulfillments, write_fulfillments';
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

  var stepSetUpLog = {
    'token': { 'status' : false, 'data'   : ''},
    'service_rate_provider': { status: false, data: '' },
    'shopify_webhook_paid': { status: false, data: '' },
  };

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

     stepSetUpLog.token.status = true;
     stepSetUpLog.token.data = accessToken;

     UserController.updateUserByShopName( shop.split('.')[0], accessToken  ).then( response => {
       /*
       *  Instalo el servicio que utilizara Shopify
       *  para calcular el costo de envio con los proveedores de Pakke.
       */

       console.log('user updated', response);

       const service_rate_provider = {
         'name': 'Pakke',
         'callback_url': APP_URL + '/pakkeShopify/shipping_rates_providers_cb',
         'service_discovery': true
       };

       ShopifyController.createService( service_rate_provider, accessToken, shop )
       .then( response => {

         stepSetUpLog.service_rate_provider.status = true;
         stepSetUpLog.service_rate_provider.data = service_rate_provider;

         /* Creando webhook para escuchar cuando se paga una orden
         *  Este webhook sera responsable de crear ordenes en pakke
         */
         const data = {
           shop_name: shop,
           shopify_token : accessToken
         }

         ShopifyController.createWebhook(data).then( result => {
           stepSetUpLog.shopify_webhook_paid.status = true;
           stepSetUpLog.shopify_webhook_paid.data = result;

           console.log( stepSetUpLog );
          res.render('welcome')
         }).catch( err => {
          const logtext= "CREACION DE WEBHOOK PARA ORDEN: NO";
           fs.appendFile('installations.log', logtext, (err) => {
               if (err) throw err;
           });
           res.render('welcome')
         })
       }).catch( err => {
         // TODO: enviar mensaje de error notificando que no se ha podido instalar el servicio ( instalacion manual )
         const logtext= "CREACION DE SERVICIO PARA RATES: NO";
         fs.appendFile('installations.log', logtext, (err) => { if (err){throw err;}});

         console.log("service not installed")
         console.log(err);
         const data = {
           shop_name: shop,
           shopify_token : accessToken
         }

         ShopifyController.createWebhook(data).then( result => {
           const logtext= "CREACION DE WEBHOOK PARA ORDEN: OK \n --- FIN NUEVA INSTALACION ---";
           fs.appendFile('installations.log', logtext, (err) => { if (err){throw err;}});
           // TODO: mensaje de instalacion exitosa
           res.render('welcome')
         }).catch( err => {
           const logtext= "CREACION DE WEBHOOK PARA ORDEN: NO";
           fs.appendFile('installations.log', logtext, (err) => { if(err){ throw err; }})
           });
           // TODO: mensaje de instalacion exitosa
           res.render('welcome')
         })
       })
     }).catch( err=>{
       // TODO: Manajar error de actualizacion de usuario
       const logtext= "ACTUALIZACION DE USUARIO DATA TOKEN: NO";
       fs.appendFile('installations.log', logtext, (err) => { if(err){throw err;}});
   }).catch((error) => {
     console.log(error)
    // res.status(error.statusCode).send(error.error_description);
   });

 } else {
   res.status(400).send('Required parameters missing');
 }

 })

 router.get('/admin', function(req, res){
   console.log("App Admin")
   // TODO: traer informacion del usuario que esta logeado en la tienda. Posible uso del SDK
   res.status(200).render('admin');
 })

/*
*   TODO:
*   Metodo para actualizar el tracking order
*   @params( refid:1231 )
*   @params([ 1, 2, ...])
*
*/
router.post('/webhook/pakke/updateTracking', function(req,res){
  pakke = {
    takcl:'status',
    refId: 123123.
  }
  ShopifyController.updateTracking(pake);
  res.send(JSON.stringify({error:false, message:'pakke webhook send'}))
})


/*
*  Esta ruta devuelve informacion del tracking al customer.
*  TODO:
*  esta vista deberia mostrar lo siguiente:
*
  {
    // Primera fila del layout de pakke ( guia )
    CourierName : 'estafeta',
    CourierService : 'Terrestre consumo',
    TrackingNumber: 213123,
    TrackingStatus: 'delivered',
    // Segunda fila del layout de pakke ( guia )
    ResellerReference: shopify_order_id,
    CoveredAmount<precioBase> : 95,
    ExtrasAmount : 0,
    InsuranceAmount<seguroPrecio>: 0,
    TotalAmount: 95,
    // Tercer fila del layout de pakke, columa 1 / 2 ( guia )
    destination:{
          ReceivedAt
          ReceivedBy: '',
          :
    },
  }
*/
router.get('/track/:order_id/:pakke_api_key', function(req,res){
    var log = {
      result: false,
      error: false,
    }

    const order_id = req.params.order_id;
    const pakke_api_key =  req.params.pakke_api_key;
    if( order_id == '' ){
      log.error = true;
      log.error.message = "No se obtuvo el ID del envio."
      // TODO: manejar error
    }else{

      /*
      * Devolvera a la vista el objeto de respuesta para el metodo /Shipments de Pakke.
      * Este las propiedades de este objeto se utilizaran para cargar la informacion a la vista.
      * TODO: se podra tambien consutlar el metodo /history para obtener la informacion historica
      * de lo sucedido con el envio
      * http://docs.pakke.mx/#courierservice
      */
      PakkeController.getShipmentById( pakke_api_key, order_id).then( tracking_info => {
        console.log( "tracking info", tracking_info );
        res.render("orderTracking", tracking_info );
      }).catch( err => {
        // TODO: manejar error
        console.log("error: mostrar tracking ", err )
      })
    }
})


/*
*   WEBHOOK orden pagada
*   Creacion orden en Pakke
*   Sera necesario obtener el usuario al que le corresponde esta orden para Obtener
*   los accesos necesarios.
*    TODO: guardar n de orden de shopify para asociarlo con el n de orden de pakke
*/

router.post('/webhook/payment', function(req, res){
    console.log('order payment webhook', req.body)
    console.log('order payment headers', req.headers)
    const APP_URL = process.env.APP_URL;
    // se debera crear el parcel ( peso del envio ) a partir de los items de la orden
    var grams = 0;
    // console.log( req.body.line_items );
    req.body.line_items.forEach( ( el) =>{
      grams += el.grams
    })

    const parcel = {
      "Length": 1,
      "Width": 1,
      "Height": 1,
      "Weight": grams / 1000, // convierto a kg
      // "Weight": 10, // convierto a kg

    }

    const shipping_lines = req.body.shipping_lines;
    const customer_shipping_address = req.body.shipping_address;
    const customer_data = req.body.customer;
    const shop_url = req.rawHeaders[5];
    const shop_name = shop_url.split('.')[0];
    const order_id   = req.body.id;




    // console.log('parcel', parcel);
    // console.log("customer_shipping_address", customer_shipping_address);
    // console.log("customer_data", customer_data);
    // console.log("shop_url", shop_url);
    // console.log("shop_name", shop_name);

    // Obtengo informacion del usuario que pertenece esta orden
    UserController.getUserByShopName( shop_name )
    .then( user => {
      // console.log("user", user );
      const api_key_pakke = user.key_pake;
      const token_shopify = user.token_shopify;
      ShopifyController.getFulFillment({
        shopName:shop_name,
        accessToken: token_shopify
      }, order_id ).then( res => {
        res.status(200).send('OK');
      }).catch( err => {
        // Obtengo informacion del servicio que utiliza la orden
        PakkeController.getServiceById( api_key_pakke, shipping_lines[0].code)
        .then( service_data  => {
          // console.log("service data", service_data[0])
          var shipping_provider  =  {
            "CourierCode": service_data[0].CourierCode,
            "CourierServiceId": service_data[0].CourierServiceId,
            "ResellerReference": order_id,
          }
          // console.log("shipping provider", shipping_provider)
          ShopifyController.getShopData(user)
          .then( shop_data_result  => {
              const sender = {
                "Name": shop_data_result.shop_owner || "no name",
                "CompanyName": shop_data_result.name || "no company name",
                "Phone1": shop_data_result.phone || '5545789636',
                "Phone2": "",
                "Email": shop_data_result.email
              };
              const recipient = {
                "Name": customer_shipping_address.first_name,
                "CompanyName": customer_shipping_address.first_name,
                "Phone1": "5555555555",
                "Email": customer_data.email
              };
              const address_from = {
                "ZipCode": shop_data_result.zip,
                "State": "MX-MEX",
                "City": shop_data_result.city,
                "Neighborhood": shop_data_result.province,
                "Address1": shop_data_result.address1,
                "Address2":  shop_data_result.address2,
                "Residential": true
              }
              const address_to = {
                "ZipCode": customer_shipping_address.zip || "06140",
                "State": "MX-MEX",
                "City": customer_shipping_address.city,
                "Neighborhood": customer_shipping_address.province,
                "Address1": customer_shipping_address.address1,
                "Address2":  customer_shipping_address.address2,
                "Residential": false
              }
              const order_data =  {
                shipping_provider: shipping_provider,
                parcel: parcel,
                sender:sender,
                recipient:recipient,
                address_from:address_from,
                address_to:address_to,
                pakke_api_key: api_key_pakke,
                shopify_order_id:order_id
              }
              PakkeController.createOrder( order_data )
                .then( result => {
                  console.log("create order pakke result ", result );
                  const tacking_number   = result.TrackingNumber;
                  const tracking_id      = result.ShipmentId;
                  const shopify_order_id = result.ResellerReference;
                  const parcel           = result.Parcel;

                  // Crear fullfilment en Shopify con tracking de la orden
                  ShopifyController.getLocations({
                    shopify_token : token_shopify,
                    shop_name     : shop_name
                  })
                  .then( location => {
                    ShopifyController.createFulFillment({
                      shopify_token : token_shopify,
                      shop_name     : shop_name
                    }, shopify_order_id, {
                     "location_id": location[0].id,
                     "tracking_number": tacking_number,
                     "notify_customer": true,
                     "tracking_urls": [
                        APP_URL+"/pakkeShopify/track/" + tracking_id + "/" + api_key_pakke,
                      ],
                    }).then( resolve=>{
                      res.status(200).send('OK');
                    }).catch( err => {})
                  }).catch( (err ) =>{} ) // end Get locations
                }).catch( err => {
                  res.status(200).send('OK');
              }) // end create order
            }) // End getShopData
          }) // end getServiceById
        }) // END getUserByShopName
      })
      res.status(200).send('OK')
    })

module.exports = router
