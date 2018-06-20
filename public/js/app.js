$(document).ready( function(){
  // Inicio validacion
  $.validate({
    modules : 'date, security',
    validateOnBlur : true
  });

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
