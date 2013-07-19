
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
var output = {};
mongoose.connect("mongodb://localhost/mongoose_perf", function (err) {
  if (err) throw err;

  var start = new Date();
  var num = 10000;
  output.mongoose = {};

  var end = num;

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

    output.mongoose.time = time;
    output.mongoose.numberInserted = num;
    output.mongoose.dps = num / (time/1000);
    User.remove(function (err) {
      if (err) throw err;
      driverTest(num);
    });
  }
});

function driverTest(num) {
  mongo.connect("mongodb://localhost/mongoose_perf", function (err, db) {
    if (err) throw err;
    output.driver = {};
    var start = new Date();

    var user = db.collection('user');

    var num = 10000;

    var end = num;

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

      output.driver.time = time;
      output.driver.numberInserted = num;
      output.driver.dps = num / (time/1000);
      user.remove({}, function (err) {
        if (err) throw err;
        mongoose.disconnect();
        db.close();
      });
      console.log(output);
    }
  });
}
