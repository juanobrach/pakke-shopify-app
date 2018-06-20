var express = require('express')
  , router = express.Router()

const request = require('request-promise');
const Shopify = require('shopify-api-node');
const API_KEY = process.env.SHOPIFY_API_KEY;
const API_SECRET = process.env.SHOPIFY_API_SECRET;
const SHOP_NAME = process.env.SHOP_NAME;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const APP_URL = process.env.APP_URL;
const PAKKE_API_URL = process.env.PAKKE_API_URL;


module.exports = function(){

  const validateApiKey = function validateApiKey(){
    return new Promise( ( resolve, reject )=>{
      request({
        method:'get',
        uri: PAKKE_API_URL + '/Couriers',
        headers: {
          'content-type':'application/json',
          'Authorization': user_api_key
        },
        json: true // Automatically parses the JSON string in the response
      }).then( (result) =>{
        if( result ){
            resolve(JSON.stringify({ error: false}) );
        }
      }).catch((error) => {
          reject(JSON.stringify({
            "valid" : true,
            "message" : "La api es incorrecta, intente mas tarde o ingrese una nueva."
          }));
       })
    })
  }

  const getProvidersShippingPrices = function( data ){
    console.log('data', data);
    return new Promise( function( resolve, reject ){
      const options = {
        'method': 'POST',
        'uri': PAKKE_API_URL + '/Shipments/rates',
        'body': {
            "ZipCode": data.zip_code ,
            "Parcel": {
              "Length": 1,
              "Width": 1,
              "Height": 1,
              "Weight": data.shipping_total_weight,
              "VolumetricWeight": data.shipping_total_weight
            }
          },
         'headers': {
           'content-type':'application/json',
           'Authorization': data.pakke_api_key
         },
         'json': true
       }
       request(options)
       .then( ( response ) => {
         console.log(response);
         var providers_object = {}
         var providers = response.Pakke.map( el => {
           return {
             "service_name": el.CourierName,
             "description":  el.CourierServiceName + " " +  el.DeliveryDays,
             "service_code": el.CourierServiceId,
             "currency":"MXN",
             // TODO: fix en la devolucion, pareciera que al total se lo divide por 100.
             "total_price": el.TotalPrice * 100,
           }
         })
         providers_object.rates =  providers;
         resolve( JSON.stringify( providers_object) );
        }).catch((err) => {
          reject(err)
        });
    })
  }


  /*
  *   Esta funcion se encarga de crear una orden en pakke.
  *   Sera necesario guardar la orden de shopify relacionada con la orden a crear de Pakke.
  *   Cuando se quiera cambiar el tracking sera necesario para identificar el destino del webhook // QUESTION:
  *   ofrece Pakke dando aviso a los cambios en el estado del envio
  *    @pake_api_key ( order_data.user )
  */
  const createOrder = function( order_data ){

    return new Promise( function( resolve, reject ){


      const options = {
        'method': 'POST',
        'uri': PAKKE_API_URL + '/Shipments',
        'body': {
          // order_data.shipping_provider
          "CourierCode": "FDX",
          "CourierServiceId": "FEDEX_EXPRESS_SAVER",
          "ResellerReference": "REF-V6BN9R1HB2OZQ",

          // order_data.parcel
          "Parcel": order_data.parcel,

          // order_data.order.sender
          "Sender": order_data.sender,
          // order_data.recipient
          "Recipient": order_data.recipient,

          // order_data.address_from
          "AddressFrom": order_data.address_from,

          // order_data.address_to
          "AddressTo": order_data.address_to,
          },
         'headers': {
           'content-type':'application/json',
           'Authorization': order_data.api_key_pakke || 'NJYc54geWEqW2WDR7BiXoSPk7ThfujFirNKdgISJ2I0Qqb7H7ZrzX7zscR5LKcIl'
         },
         'json': true
       }
       request(options)
       .then( ( response ) => {
         resolve(  response );
        }).catch((err) => {
          console.log('error')
          reject(err)
        });
    })
  }

  const getServiceById = ( user_api_key , service_id ) => {
    return new Promise( ( resolve, reject )=>{
      request({
        method:'get',
        uri: PAKKE_API_URL + '/CourierServices',
        headers: {
          'content-type':'application/json',
          'Authorization': user_api_key
        },
        json: true // Automatically parses the JSON string in the response
      }).then( (result) =>{
        if( result ){
            const service = result.filter( function(obj){ return obj.CourierServiceId == "FEDEX_STANDARD_OVERNIGHT" })
            resolve(  service );
        }
      }).catch((error) => {
          reject(JSON.stringify(error));
      })
    })
  }

  return {
    validateApiKey: validateApiKey,
    getProvidersShippingPrices : getProvidersShippingPrices,
    getServiceById: getServiceById,
    createOrder : createOrder,
  }
}
