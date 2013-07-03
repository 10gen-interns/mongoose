
var mongoose = require('../../lib');

var Schema = mongoose.Schema;
var mongo = require('mongodb');

var UserSchema = new Schema({
  name : String,
  age: Number,
  likes: [String],
  address: String
});

var data = {
  name : "name",
  age : 0,
  likes : ["dogs", "cats", "pizza"],
  address : " Nowhere-ville USA"
};

var User = mongoose.model('User', UserSchema);

// now benchmark insert 10k documents

mongoose.connect("mongodb://localhost/mongoose_perf", function (err) {
  if (err) throw err;

  var start = new Date();
  var num = 10000;

  var end = num;
  console.log("Mongoose Test Starting now");

  for (var i=0; i < num; i++) {
    var nData = {};
    nData.name = data.name + i.toString();
    nData.age = data.age + i;
    nData.likes = data.likes.map(function (item) { return item + i.toString() });
    nData.address = i.toString() + data.address;
    User.create(nData, function (err, res) {
      if (err) throw err;
      --end || done();
    });
  }

  function done() {
    var time = (new Date() - start);

    console.log("Mongoose test took %d ms for %d inserts (%d dps)", time, num, num / (time/1000));
    User.remove(function (err) {
      if (err) throw err;
      driverTest(num);
    });
  }
});

function driverTest(num) {
  mongo.connect("mongodb://localhost/mongoose_perf", function (err, db) {
    if (err) throw err;

    var start = new Date();

    var user = db.collection('user');

    var num = 10000;

    var end = num;
    console.log("Driver Test Starting now");

    for (var i=0; i < num; i++) {
      var nData = {};
      nData.name = data.name + i.toString();
      nData.age = data.age + i;
      nData.likes = data.likes.map(function (item) { return item + i.toString() });
      nData.address = i.toString() + data.address;
      user.insert(nData, function (err, res) {
        if (err) throw err;
        --end || finish();
      });
    }

    function finish() {
      var time = (new Date() - start);

      console.log("Driver test took %d ms for %d inserts (%d dps)", time, num, num / (time/1000));
      user.remove({}, function (err) {
        if (err) throw err;
        mongoose.disconnect();
        db.close();
      });
    }
  });
}
