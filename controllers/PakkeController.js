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
         var providers_object = {}
         var providers = response.Pakke.map( el => {
           return {
             "service_name": el.CourierName,
             "description":  el.CourierServiceName + " " +  el.DeliveryDays,
             "service_code": el.CourierCode,
             "currency":"MXN",
             "total_price": el.TotalPrice ,
           }
         })
         providers_object.rates =  providers;
         resolve( JSON.stringify( providers_object) );
        }).catch((err) => {
          reject(err)
        });
    })
  }


  const createOrder = function( order_data ){

    console.log('order data webhook send:', order_data );


    return new Promise( function( resolve, reject ){


      const options = {
        'method': 'POST',
        'uri': PAKKE_API_URL + '/Shipments',
        'body': {
          "CourierCode": "FDX",
          "CourierServiceId": "FEDEX_EXPRESS_SAVER",
          "ResellerReference": "REF-V6BN9R1HB2OZQ",
          "Parcel": {
           "Length": 1,
           "Width": 1,
           "Height": 1,
           "Weight": 1
          },
          "Sender": {
           "Name": "Arturo",
           "CompanyName": "sanki",
           "Phone1": "5545789636",
           "Phone2": "5514785696",
           "Email": "avillalbazo@next-cloud.mx"
          },
          "Recipient": {
           "Name": "Destino nombre",
           "CompanyName": "empresa destino",
           "Phone1": "5555555555",
           "Email": "destino@prueba.com"
          },
          "AddressFrom": {
           "ZipCode": "11950",
           "State": "MX-MEX",
           "City": "Naucalpan de Juárez(MEX",
           "Neighborhood": "lomas altas",
           "Address1": "calle origen",
           "Address2": "ref origen",
           "Residential": true
          },
          "AddressTo": {
           "ZipCode": "53126",
           "State": "MX-MEX",
           "City": "Naucalpan de Juárez(MEX",
           "Neighborhood": "lomas verdes",
           "Address1": "calle destino",
           "Address2": "ref destino",
           "Residential": false
          }
          },
         'headers': {
           'content-type':'application/json',
           'Authorization': 'NJYc54geWEqW2WDR7BiXoSPk7ThfujFirNKdgISJ2I0Qqb7H7ZrzX7zscR5LKcIl'
         },
         'json': true
       }
       request(options)
       .then( ( response ) => {
         resolve( JSON.stringify( response) );
         reject(err)
        }).catch((err) => {
        });
    })
  }

  return {
    validateApiKey: validateApiKey,
    getProvidersShippingPrices : getProvidersShippingPrices,
    createOrder : createOrder,
  }
}
