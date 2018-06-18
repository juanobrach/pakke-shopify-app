

const express = require('express');
const    path = require('path');
const  router = express.Router();
const    user = require('./UserController.js')();



/*
*  Ruta configurada en el whitelist de la aplicacion de shopify.
*  La configuracion se hace desde el dashboard del desarrollador
*  https://appdomain.com/pakkeShopify/{metodo}/
*/
router.use('/pakkeShopify', require('./pakkeShopifyRoutes'));


/*
*  Ruta para el index de la tienda
*  Aqui se mostrara el wizard para instalar la App
*/

router.get('/', function(req, res) {
  res.render('index','');
})


/*
*  Ruta para hacer pruebas de creacion de usuario
*/

router.get('/get_users', function(req,res){
  user.read().then( response =>{
    res.send(JSON.stringify(response));
  }).catch( error=> {
    res.send(JSON.stringify({
      "valid" : false,
      "message" : "La tienda no existe"
    }));
  })
})

router.get('/create_user_test', function(req, res) {

  const user_id = user.createUser({
    'name':'juan',
    'shop':'pakkeapi'
  }).then( user_id => {
    console.log("user_id ", user_id)
    res.send(
      JSON.stringify(
        user_id
      )
    );
  }).catch( err => {
    console.log("error", err )
    res.send(
      JSON.stringify(
        err
      )
    );
  })
})

router.get('/read_user_test', function(req, res) {
  const user_id = req.query.user_id;
  console.log(user_id);
  const user_data = user.read({
    'id': user_id
  }).then( function( result){
    res.send(
      JSON.stringify(
        result
      )
    );
  }).catch( err => {
    res.send(
      JSON.stringify(
        err
      )
    );
  })
  console.log( user_data );
})


router.get('/update_user_test', function(req, res) {
  const shop = 'pakkeapi';
  const user_data = user.update_by_shop_name( shop ,'aaaaaaaaaa').then( function( result){
    res.send(
      JSON.stringify(
        result
      )
    );
  }).catch( err => {
    res.send(
      JSON.stringify(
        err
      )
    );
  })
  console.log( user_data );
})


module.exports = router
