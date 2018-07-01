const querystring = require('querystring');
const request = require('request-promise');
const Shopify = require('shopify-api-node');

const SHOP_NAME = process.env.SHOP_NAME;
const APP_URL   = process.env.APP_URL;

module.exports = function(){
  const createService = function(service, shopifyToken, shopName){
    return new Promise( function(resolve,reject){
        console.log("service", service );
        console.log("token", shopifyToken );
        console.log("shop name" , shopName );

        const shopify = new Shopify({
          shopName: shopName || SHOP_NAME,
          accessToken: shopifyToken || SHOP_TOKEN
        });

        /*
        *  Valido que no exista algun servicio previo a otra instalacion para esta tienda
        */

        shopify.carrierService.list().then( services => {
          console.log("services found", services )
          if( services.length > 0 ){
            shopify.carrierService.delete( services[0].id ).then( _s =>{
              shopify.carrierService.create(service).then( metafields =>{
                  resolve();
                }).catch( err =>{
                  reject( err )
                })
            });
          }else{
            shopify.carrierService.create(service).then( metafields =>{
              resolve();
            }).catch( err =>{
              reject( err )
            })
          }
        }).catch( err => {
          shopify.carrierService.create(service).then( metafields =>{
              resolve();
            }).catch( err =>{
              reject( err )
            })
        })
    })
  }



  const listServices = function( shopData ){
    return new Promise( function(resolve, reject){
        const shopify = new Shopify({
          shopName:  shopData.shopName || 'pakkeapi',
          accessToken: shopData.accessToken || '08dd51cda105586b623e2da563c99d2d'
        });
        shopify.carrierService.list().then( metafields =>{
          resolve(  metafields );
        }).catch( err =>{
          reject( err.response.body )
        })
    })
  }

  const deleteProvider = function( shop_data, providerId ){
    return new Promise( function(resolve, reject){
        const shopify = new Shopify({
          shopName: shop_data.shop_name,
          accessToken: shop_data.shopify_token
        });

        shopify.carrierService.delete(providerId).then( metafields =>{
            resolve(metafields);
          }).catch( err =>{
            reject( err.response.body )
          })

    })
  }

  const validateIfShopExists = function( shopName ){
    console.log("shop name: "+ shopName)
    return new Promise( function(resolve, reject){
        var options = {
          uri: 'https://'+ shopName +'.myshopify.com',
          simple: false,    //  <---  <---  <---  <---
          headers: {
            'User-Agent': 'Request-Promise'
          },
          resolveWithFullResponse: true
        };
        request( options ).then( ( response ) => {
          if( response.statusCode == 404 ){
            reject(response.statusCode)
          }else{
            resolve(true);
          }
        }).catch( err=>{
          console.log(err);
          reject( err )
        })
    })
  }

 /*
 *  Esta funcion es solo para desarrollo. El accessToken depende del usuario que se quiera probar.
 */
  const listWebhooks = function(shop_data){
    return new Promise( function(resolve, reject){
        var options = {
          uri: 'https://'+shop_data.shopName+'.myshopify.com/admin/webhooks.json',
          simple: false,    //  <---  <---  <---  <---
          headers: {
            'X-Shopify-Access-Token':shop_data.accessToken,
            'X-Shopify-Shop-Domain' : shop_data.shopName + '.myshopify.com'
          },
          resolveWithFullResponse: false
        };

        request(options).then( result => {
            resolve( JSON.stringify( result ) )
        }).catch( err => {
            reject(err)
        })
    })
  }

  const createWebhook = function(data){
    console.log("creando webhook controller")
    const shop_data = data;
    return new Promise( (resolve, reject)=>{

      const shopify = new Shopify({
        shopName: shop_data.shop_name,
        accessToken: shop_data.shopify_token
      });


       var data = {
           "topic": "orders/paid",
           "address": APP_URL +"/pakkeShopify/webhook/payment",
           "format": "json"
       }
       console.log("data wk", data);

       /*
       *  Valido que no exista un webhook
       */
       shopify.webhook.list().then( response  => {
         console.log( "response" , response );
          shopify.webhook.delete( response.webhooks[0].id ).then( response => {
            shopify.webhook.create( data ).then( result =>{
               resolve( result )
            }).catch( err =>{
              reject( err )
            })
          })
       }).catch( r => {
         shopify.webhook.create( data ).then( result =>{
            resolve( result )
         }).catch( err =>{
           reject( err )
         })
       })
    })
  }

  const deleteWebhook = function( shop_data, webhook_id ){

    return new Promise( (resolve, reject) => {

      const shopify = new Shopify({
        shopName: shop_data.shop_name,
        accessToken: shop_data.shopify_token
      });

      shopify.webhook.delete( webhook_id ).then( result =>{
         resolve( result )
      }).catch( err =>{
        console.log( err )
        reject( err )
      })
    })
  }

  const updateProvider = function( shop_data, provider_id ){
    return new Promise( (resolve, reject)=>{

      const shopify = new Shopify({
        shopName: shop_data.shop_name,
        accessToken: shop_data.shopify_token
      });

      console.log('Provider id', provider_id);

       shopify.carrierService.update( provider_id, { callback_url: APP_URL+'/pakkeShopify/shipping_rates_providers_cb'} ).then( result =>{
         console.log( result )
          resolve( result )
       }).catch( err =>{
         console.log( err )
         reject( err )
       })
    })
  }

  const getShopData = function( user ){
    return new Promise( (resolve, reject)=>{
      const shopify = new Shopify({
        shopName: user.shop,
        accessToken: user.token_shopify
      });


       shopify.shop.get().then( result =>{
          resolve( result )
       }).catch( err =>{
         console.log( err )
         reject( err )
       })
    })
  }

  const getFulFillment = ( shop_data, order_id ) =>{
      return new Promise( (resolve, reject ) =>{
        const shopify = new Shopify({
          shopName: shop_data.shop_name,
          accessToken: shop_data.shopify_token
        });

        console.log("obteniendo fullfilment : " + order_id );
         shopify.fulfillment.list(order_id).then( result =>{
           console.log("respuesta", result );
            resolve( result )
         }).catch( err =>{
           console.log( err )
           reject( err )
         })
      })
  }

  /*
  *   Shopify soporta 5 estados para la notificacion de un envio
  *   [ confirmed, in_transit, out_for_delivery,  delivered, failure ]
  *    Como esta fn se ejecuta luego de crear la orden el Pakke (carrierService ) podemos iniciar
  *   un fullFilment en estado 'confirmed'.
  */
  const createFulFillment = ( shop_data, order_id, fullFilmentOptions ) =>{
    return new Promise( (resolve, reject ) =>{

      const shopify = new Shopify({
        shopName: shop_data.shop_name,
        accessToken: shop_data.shopify_token
      });

      console.log("creando fullfilment orden: ", order_id );
       shopify.fulfillment.create(order_id, fullFilmentOptions ).then( result =>{
         console.log("respuesta", result );
          resolve( result )
       }).catch( err =>{
         console.log( err )
         reject( err )
       })
    })
  }


  const updateFulFillment = ( shop_data, order_id, fulfillment_id, fullFilmentOptions ) =>{
    return new Promise( (resolve, reject ) =>{
      const shopify = new Shopify({
        shopName: shop_data.shop_name,
        accessToken: shop_data.shopify_token
      });


      console.log("creando fullfilment orden: ", order_id );
       shopify.fulfillment.update(order_id, fulfillment_id, fullFilmentOptions ).then( result =>{
         console.log("respuesta", result );
          resolve( result )
       }).catch( err =>{
         console.log( err )
         reject( err )
       })
    })
  }

  const listfulfillmentEvent = ( shop_data, order_id, fulfillment_id ) =>{
    return new Promise( (resolve, reject ) =>{
      const shopify = new Shopify({
        shopName: shop_data.shop_name,
        accessToken: shop_data.shopify_token
      });

      console.log("creando fullfilment orden: ", order_id );
       shopify.fulfillmentEvent.list(order_id, fulfillment_id).then( result =>{
         console.log("respuesta", result );
          resolve( result )
       }).catch( err =>{
         console.log( err )
         reject( err )
       })
    })
  }


  const createFulfillmentEvent = ( shop_data, order_id, fulfillment_id, fulfillment_status ) =>{
    return new Promise( (resolve, reject ) =>{
      const shopify = new Shopify({
        shopName: shop_data.shop_name,
        accessToken: shop_data.shopify_token
      });

      console.log("creando fullfilment evento en la orden : ", order_id );
       shopify.fulfillmentEvent.create(order_id, fulfillment_id, fulfillment_status).then( result =>{
         console.log("respuesta", result );
          resolve( result )
       }).catch( err =>{
         console.log( err )
         reject( err )
       })
    })
  }

  const getLocations = ( shop_data ) =>{
    console.log("obteniendo locaciones");
      return new Promise( (resolve, reject ) =>{
        const shopify = new Shopify({
          shopName: shop_data.shop_name,
          accessToken: shop_data.shopify_token
        });


         shopify.location.list().then( result =>{
           console.log( result );
            resolve( result )
         }).catch( err =>{
           console.log( err )
           reject( err )
         })
      })
  }


  return {
    updateProvider:updateProvider,
    createWebhook:createWebhook,
    deleteWebhook:deleteWebhook,
    createService: createService,
    listServices: listServices,
    deleteProvider: deleteProvider,
    validateIfShopExists:validateIfShopExists,
    listWebhooks:listWebhooks,
    getShopData:getShopData,
    getFulFillment: getFulFillment,
    listfulfillmentEvent:listfulfillmentEvent,
    createFulfillmentEvent:createFulfillmentEvent,
    createFulFillment : createFulFillment,
    updateFulFillment : updateFulFillment,
    getLocations:getLocations
    // createTrackig ( norden de shopify corresponda )
    // updateTracking
  }
}
