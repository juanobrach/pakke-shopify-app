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

        shopify.carrierService.get().then( services => {
          console.log("services found", services )
        }).catch( err => {
          console.log("error finding services", err )
        })

        shopify.carrierService.create(service).then( metafields =>{
            resolve();
          }).catch( err =>{
            reject( err )
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
          resolve(metafields);
        }).catch( err =>{
          reject( err.response.body )
        })
    })
  }

  const deleteProvider = function( providerId ){
    return new Promise( function(resolve, reject){
        const shopify = new Shopify({
          shopName: SHOP_NAME,
          accessToken: '08dd51cda105586b623e2da563c99d2d'
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
  const list_wehbooks = function(user){
    return new Promise( function(resolve, reject){
        const shopify = new Shopify({
          shopName: 'pakkeapi',
          accessToken: '08dd51cda105586b623e2da563c99d2d'
        });

        var options = {
          uri: 'https://pakkeapi.myshopify.com/admin/webhooks.json',
          simple: false,    //  <---  <---  <---  <---
          headers: {
            'X-Shopify-Access-Token':'08dd51cda105586b623e2da563c99d2d',
            'X-Shopify-Shop-Domain' :'pakkeapi.myshopify.com'
          },
          resolveWithFullResponse: false
        };

        request(options).then( result => {
            resolve( result )
        }).catch( err => {
            reject(err)
        })
    })
  }

  const createWebhook = function(data){
    console.log("creando webhook controller")
    const shop_data = data;
    return new Promise( (resolve, reject)=>{
      console.log("data wk", shop_data);

      const shopify = new Shopify({
        shopName: shop_data.shop_name,
        accessToken: shop_data.shopify_token
      });

       var data = {
           "topic": "orders/paid",
           "address": APP_URL +"/pakkeShopify/webhook/payment",
           "format": "json"
       }

       shopify.webhook.create( data ).then( result =>{
         console.log( result )
          resolve( result )
       }).catch( err =>{
         console.log( err )
         reject( err )
       })
    })
  }

  const deleteWebhook = function( webhook_id ){

    return new Promise( (resolve, reject) => {

      const shopify = new Shopify({
        shopName: 'pakkeapi',
        accessToken: '08dd51cda105586b623e2da563c99d2d'
      });

      shopify.webhook.delete( webhook_id ).then( result =>{
        console.log( result )
         resolve( result )
      }).catch( err =>{
        console.log( err )
        reject( err )
      })
    })
  }

  const updateProvider = function( provider_id ){
    return new Promise( (resolve, reject)=>{

      const shopify = new Shopify({
        shopName: 'pakkeapi',
        accessToken: '08dd51cda105586b623e2da563c99d2d'
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

  return {
    updateProvider:updateProvider,
    createWebhook:createWebhook,
    deleteWebhook:deleteWebhook,
    createService: createService,
    listServices: listServices,
    deleteProvider: deleteProvider,
    validateIfShopExists:validateIfShopExists,
    list_wehbooks:list_wehbooks,
    getShopData:getShopData
  }
}
