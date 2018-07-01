var assert = require('assert');
var User = require('../models/user.js')
var ShopifyController = require('./ShopifyControllers.js')();

module.exports = function(){

  /*
  *  Crea usuario y devuelve el ID
  */
  const createUser = function( user_data ){
    //use schema.create to insert data into the db
    return new Promise( (resolve, reject) =>{
      const user = new User(user_data).save( (err, user )=>{
          if( err ) reject(err);
          resolve(user)
      });
    })
  }

  /*
  *   Obtener informacion de un usuario
  */
  const getUser = function( user ){
    return new Promise( function(resolve, reject){
      User.findById( user.id ,(err, users) => {
        if (err) return reject(err)
        resolve(users);
      })
    })
  }


  /*
  * Actualizo la informacion de un usuario
  */
  const updateUserByShopName = function( shop, token ){

    return new Promise( (resolve, reject)=>{
      User.update({ shop: shop}, {token_shopify: token}, function(err, numberAffected, rawResponse) {
        if( err ) reject( err );
        resolve(rawResponse);
      })
    })
  }


  /*
  *  Obtengo usuario por nombre de tienda
  *  Esta funcion es util en el formulario de registro
  */
  const getUserByShopName = function( shopName ){
    return new Promise( (resolve, reject)=>{
      console.log("shopName", shopName );
      /*
      *  La funcion LEAN() permite que mongoose nos devuelva un objeto plano
      *  y asi sea posible editarlo.
      * http://mongoosejs.com/docs/api.html#query_Query-lean
      * mongoose will return the document as a plain JavaScript object rather than a mongoose document
      */
       User.findOne({"shop":shopName}).lean().then( user => {
         console.log("user getUserByShop",user)
         var user = user;
         if( user == null ){
           reject({
             error:true,
             error_message:"No existe el usuario",
           })
         }else{
           if ( user.token_shopify.length > 0 ){

             // Obtengo servicios obtenidos
             ShopifyController.listServices({
               shopName: shopName,
               accessToken: user.token_shopify
             }).then( services =>{
               user.service = services[0];
               console.log("services", user);
               ShopifyController.listWebhooks({
                 shopName: shopName,
                 accessToken: user.token_shopify
               }).then( wb => {
                 console.log("wb", wb);
                 user.webhooks = { "payments" : wb };
                 resolve( user );
               })
             })
           }else{
             // Puede que no tenga el access token, permitir continuar con la instalacion
             // sera necesario leer el tipo de error para determinar si se continua la fn de instalacion
             reject({
               error:true,
               error_number:1,
               error_message:"Falta el access token, seguir con la instalacion",
               data: result
             })
           }
         }
       }).catch( err => {
         console.log("err getUserByShop",err)
         reject( {error: true, error_message: err} );
       })
    })
  }

  /*
  * Elimino un usuario
  * Podria ser util en el webhook que desinstala la app
  * TODO: crear metodo eliminar usuario
  */
  const deleteUser = function(){}

  return {
    createUser           : createUser,
    getUser              : getUser,
    updateUserByShopName : updateUserByShopName,
    deleteUser           : deleteUser,
    getUserByShopName    : getUserByShopName
  }
}
