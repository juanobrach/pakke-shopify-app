const querystring = require('querystring');
const request = require('request-promise');
const Shopify = require('shopify-api-node');

const SHOP_NAME = process.env.SHOP_NAME;

module.exports = function(){

  const createServices = function(service){

    return new Promise( function(resolve,reject){
        console.log(service);
        console.log("shop: " + SHOP_NAME);

        const shopify = new Shopify({
          shopName: SHOP_NAME,
          accessToken: '87ddda4b78f9668d1a4ac72a9bb4c13d'
        });

        shopify.on('callLimits', limits => console.log(limits));


        shopify.carrierService.create(service).then( metafields =>{
            resolve(metafields.response.body);
          }).catch( err =>{
            reject( err )
          })
    })
  }

  const listServices = function(){
    return new Promise( function(resolve, reject){
        const shopify = new Shopify({
          shopName: SHOP_NAME,
          accessToken: '87ddda4b78f9668d1a4ac72a9bb4c13d'
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
          accessToken: '87ddda4b78f9668d1a4ac72a9bb4c13d'
        });

        shopify.carrierService.delete(providerId).then( metafields =>{
            resolve(metafields);
          }).catch( err =>{
            reject( err.response.body )
          })

    })
  }


  return {
    createServices: createServices,
    listServices: listServices,
    deleteProvider: deleteProvider
  }
}
