var mongoose = require('mongoose');
module.exports = function(){
  const host = process.env.DB_HOST;
  const db_name = process.env.DB_NAME;

  const url = 'mongodb://'+host+'/' + db_name;
  mongoose.connect(url);
  var db = mongoose.connection;
  db.on('error', console.error.bind(console, 'connection error:'));
  db.once('open', function() {
    console.log('DB conection OK', url)
  });
}
