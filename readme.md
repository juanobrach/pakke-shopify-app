# Pakke Shopify


# Instalacion

  - npm install
  - configurar archivo .env(.template)
  - node index.js


Servidor:
  - Al no contar con un servidor se utiliza 'ngrok' para poder liberar un entorno local a un dominio HTTPS. La version gratuita  no permite una url fija, es importante luego de configurar la Aplicacion asegurarse que los usuarios y configuraciones apunten a la URL actual proporcionada por ngrok.
  -
  Configuracion Shopify:
  - La Aplicacion en primer lugar es dada de alta en el dashboard http://partners.shopify.com/
  - Se deberan crear las URL's permitidas (whithelist). Es importante respetar las URI'S ya que son las esperadas por la aplicacion.
  1 App URL :
   https://{domain.com}/pakkeShopify/admin
  2 Whitelisted redirection URL
   https://{domain.com}/pakkeShopify/install/getAccessTokenCallBack
  https://{domain.com}/pakkeShopify/shipping_rates_providers_cb


Instalar aplicacion en una tienda
La ruta principal de la aplicacion siempre llevara al formulario de instalacion.
Se necesitara un nombre de tienda valido y una api key de Pakke valida para poder continuar.

El proceso de instalacion primero llevara al usuario a shopify para aceptar los permisos que nos dara. Luego de nuestra parte se :

1 instalara un proveedor de shippings al cual llamaremos 'Pakke'.
2 Se creara un webhook en shopify para que nos avise cuando una orden cambia a estado "pagado".
3 Se creara un callback de respuesta para enviarle los precios y servicios de Pakke al customer de una tienda en el momento del checkout.


### Tracking de una orden

TODO: sera necesario completar el flujo de cambio de estado del tracking una vez obtengamos respuestas de Pakke respecto al webhook que notifica esos estados a nuestro sistema.

Por el momento se podra cambiar el estado de una orden con las siguientes rutas.
#### Crear un estado de envio para una orden
```
https://{dominio}/dev/create_fulfilment/{nombretienda}/{token_shopify_tienda}/{id_orden}
```
https://f2456a99.ngrok.io/dev/create_fulfilment/demopakke/4d03234c364a5915f3c98a86e924e7d8/537494421622



#### Cambiar estado de tracking en orden
```
/dev/create_fulfilmentEvent/{nombretienda}/{tokken_obtenido}/{id_orden}/{id_fulFillment}/{status}
```
https://f2456a99.ngrok.io/dev/create_fulfilmentEvent/demopakke/4d03234c364a5915f3c98a86e924e7d8/537494421622/512378863734/delivered

Notar que las URL de prueba son para la tienda. (pedir credenciales si es necesario)
