$(document).ready( function(){

 var $btnNext = $(".swiper-button-next");
 var $btnPrev = $(".swiper-button-prev");
 var $errContainer = $(".error-container");

 var mySwiper = new Swiper ('.swiper-container', {
    // Optional parameters
    direction: 'horizontal',
    loop: false,

    // If we need pagination
    pagination: {
      el: '.swiper-pagination',
    },

    // Navigation arrows
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
    on:{
      init: function(){
        console.log("swipper initialized")
        if ( this.activeIndex == 0 ){
            this.allowSlidePrev = false;
        }else{
          $($btnNext).hide();
        }
      }
    }
  })

  // Valido la api key
  $("#validate-pake-api-key").on('click', function(e){
    console.log('clicked validate button')
    e.preventDefault();
    $.ajax({
      url:'/pakke/validateApiKey',
      data:{
        api_key: $('#pakke_api_key').val()
      },
      type:'POST',
      dataType:'json',
      success:function( response ){
        console.log("responde validacion ajax")
        if( response.validated  ){
          $($btnNext).attr('disabled',false);
        }else{
          console.log(response)
          $($errContainer).show().child('smal').text(response.error.message)
          $($btnNext).attr('disabled',true);
        }
      },
      error: function(){}
    })
  })

  // Muestro formulario sigup y deshabilito campo api api_key
  $("#signUpCheckbox").change( function(e){
    var status = $(this).val();
    if( status ){
      // deshabilito api api_key
      // $("#pakke_api_key, #validate-pake-api-key").attr('disabled', true);
      $(".sign-up-form-container").slideToggle();

    }else{
      $(".sign-up-form-container").slideToggle();
      // $("#pakke_api_key, #validate-pake-api-key").attr('disabled', false);
    }
  })

  $("#signUpBtn").on('click',function(e){
    e.preventDefault();
    $.ajax({
      url:'/pakke/signUp',
      data:{
        user_name: $('input[name="user_name"]').val(),
        user_email: $('input[name="user_email"]').val(),
        user_password: $('input[name="user_repeat_password"]').val(),
        user_repeat_password: $('input[name="user_repeat_password"]').val()
      },
      type:'POST',
      dataType:'json',
      success:function( response ){
        if( !response.error  ){
          $($btnNext).attr('disabled',true);
          $(".sign-up-form-container").hide();
          const apiKey = response.apiKey;

        }else{
          $($btnNext).attr('disabled',false);
          $('.error-container').show()
          $('.error-container').children('smal').text(response.error_message.error.error.details[0])
          setTimeout( function(){
            $('.error-container').hide()
            $('.error-container').children('smal').text("")
          },15000);
        }
      },
      error: function(){ }// TODO: manage signup errors }
    })
  })
})
