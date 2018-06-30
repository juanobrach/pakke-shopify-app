$(document).ready( function(){
  // Inicio validacion
  $.validate({
    modules : 'date, security',
    validateOnBlur : true
  });

  /*
  *  Formulario alta de tienda shopify / pakke  a la aplicacion
  *  se ejecuta esta funcion si se es validado el formulario
  *  views/includes/adminDev.pug
  */
  $('.btn-setup-form-submit').click( function(e){
      e.preventDefault();
      var data = {
        shop: $("input[name='shopify_shop_name']").val(),
        key_pake: $("input[name='pakke_api_key']").val(),
        token_shopify: ''
      }

      $.ajax({
        url:'/pakkeShopify/signup',
        data: data,
        dataType: 'json',
        type:'post',
        success: function(res){
          console.log(res)
          if( !res.error ){
            window.location.replace( res.installUrl )
          }else{
            console.log(res.error_message);

          }
          // TODO: manejar respuesta
        },
        error: function(err){
          console.log(err)
          // TODO: manejar errores
        }
      })
  })

  /*
  * TODO:
  * Formulario para desarrollador.
  * Captura toda la informacion de una tienda especifica si existe en nuestra db
  */

  $(".btn-dev-form-submit").click( function(e){
    e.preventDefault();
    var data = {
      shop_name: $("input[name='shop_name']").val(),
    }

    $.ajax({
      url:'/dev/getUserDataByShopName',
      data: data,
      dataType: 'json',
      type:'post',
      success: function(res){
        console.log(res)
        if( !res.error ){
          console.log( "usuario", res );
          $("input[name='user_name']").val( res.name )
        }else{
          console.log("error",res.error_message);
        }
        // TODO: manejar respuesta
      },
      error: function(err){
        console.log(err)
        // TODO: manejar errores
      }
    })
  })
})
