

const express = require('express');
const    path = require('path');
const  router = express.Router();

/*
*  Ruta para el index de la tienda
*  Aqui se mostrara el wizard para instalar la App
*/

router.get('/', function(req, res) {
  res.render('index','');
})



/*
*  Ruta configurada en el whitelist de la aplicacion de shopify.
*  La configuracion se hace desde el dashboard del desarrollador
*  https://appdomain.com/pakkeShopify/{metodo}/
*/
router.use('/pakkeShopify', require('./pakkeShopifyRoutes'));



/*
*  Ruta para desarrolladores
*/

router.use('/dev', require('./devRoutes') );

module.exports = router
