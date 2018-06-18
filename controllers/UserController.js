var assert = require('assert');
var User = require('../models/user.js')

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
  const read = function( user ){
    return new Promise( function(resolve, reject){
      User.findById( user.id ,(err, users) => {
        if (err) return reject(err)
        resolve(users);
      })
    })
  }


  const findByShopName = function( shop ){
    return new Promise( function(resolve, reject){
      console.log('buscando usuario');
      console.log('shop name', shop);
      User.findOne( {'shop': shop }, (err, user) => {
        if(err){
          reject(err)
        }else{
          resolve(user);
        }
      })
    })
  }

  /*
  * Actualizo la informacion de un usuario
  */
  const update_by_shop_name = function( shop, token ){

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
  const getUserByShop = function( shopName ){
    return new Promise( (resolve, reject)=>{
       User.findOne({"shop":shopName}).then( result => {
         console.log("result getUserByShop",result)
          if ( result.token_shopify.lenght > 0 ){
            resolve(result);
          }else{
            // Puede que no tenga el access token, permitir continuar con la instalacion
            reject({ error:true, error_message:"Falta el access token, seguir con la instalacion"})
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
    createUser : createUser,
    read   : read,
    update_by_shop_name : update_by_shop_name,
    delete : deleteUser,
    findByShopName: findByShopName,
    getUserByShop:getUserByShop
  }
}
