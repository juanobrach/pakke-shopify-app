var express = require('express')
  , router = express.Router()

const request = require('request-promise');
const Shopify = require('shopify-api-node');
const API_KEY = process.env.SHOPIFY_API_KEY;
const API_SECRET = process.env.SHOPIFY_API_SECRET;
const SHOP_NAME = process.env.SHOP_NAME;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;


router.get('/list', function(req,res){
  const shopify = new Shopify({
    shopName: SHOP_NAME,
    accessToken: ''+SHOPIFY_ACCESS_TOKEN+''
  });

  shopify.carrierService.list().then( carriers => {
    console.log(carriers)

    return res.send(carriers);
  }).catch(err => {
    console.error(err)
    return res.send(err);
  });
})
// Instalar shipping rates de Pakke al instalar la app en la tienda
router.get('/', function(req, res) {
  const options = {
    'method': 'POST',
    'uri': shopRequestUrl,
    'body': {
       'carrier_service': {
         'name': 'FEDEX',
         'callback_url': forwardingAddress + '/shopify/shipping_rates',
         'service_discovery': true,
        }
      },
     'headers': shopRequestHeaders,
     'json': true // Automatically stringifies the body to JSON
   }
   request(options)
   .then((shopResponse) => {
     res.status(200).write(shopResponse).end();
   })
   .catch((error) => {
      res.status(422).send(error).end()
   });
})

module.exports = router;
