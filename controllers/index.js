var express = require('express'),
    path = require('path'),
    router = express.Router()

router.use('/pakkeShopify', require('./pakkeShopify'));
router.use('/pakke', require('./PakkeController'));
router.use('/carriers', require('./CarrierServicesController'));


/*
*  Ruta para el index de la tienda
*  Aqui se mostrara el wizard para instalar la App
*/

router.get('/', function(req, res) {
  res.render('index','');
})

module.exports = router
