var MongoClient = require('mongodb').MongoClient;


const host = process.env.DB_HOST;
const db_name = process.env.DB_NAME;



module.exports = {
  db: function(){
    return MongoClient.connect( host + db_name , function (err, client) {
      if (err) throw err
      return client;
    })
  }
}
