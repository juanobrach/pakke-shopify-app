$(document).ready( function(){
  // Inicio validacion
  $.validate({
    modules : 'date, security',
    validateOnBlur : true
  });

  $('.btn-setup-form-submit').click( function(e){
      e.preventDefault();
      var data = {
        name: $("input[name='user_name']").val(),
        email:$("input[name='user_email']").val(),
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

})
