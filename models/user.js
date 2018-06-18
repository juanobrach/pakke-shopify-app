var mongoose = require('mongoose')
 , Schema = mongoose.Schema;


 var userSchema = new Schema({
    name: String,
    email: String,
    shop: {
      type:String,
      validate: {
          isAsync: true,
          validator: function(value, isValid) {
              const self = this;
              return self.constructor.findOne({ shop: value })
              .exec(function(err, user){
                  if(err){
                      throw err;
                  }
                  else if(user) {
                      if(self.id === user.id) {  // if finding and saving then it's valid even for existing email
                          return isValid(true);
                      }
                      return isValid(false);
                  }
                  else{
                      return isValid(true);
                  }

              })
          },
          message:  'Ya existe un usario con esta tienda'
      },
    },
    key_pake: String,
    token_shopify: String
 });

module.exports = mongoose.model('User', userSchema);
