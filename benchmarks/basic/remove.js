
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

// now benchmark delete 10k documents
var output = {};
mongoose.connect("mongodb://localhost/mongoose_perf", function (err) {
  if (err) throw err;

  var num = 10000;
  var start;
  output.mongoose = {};

  var end = num;
  var ids = [];
  for (var i=0; i < num; i++) {
    var nData = {};
    nData.name = data.name + i.toString();
    nData.age = data.age + i;
    nData.likes = data.likes.map(function (item) { return item + i.toString() });
    nData.address = i.toString() + data.address;
    User.create(nData, function (err, res) {
      if (err) throw err;
      ids.push(res.id);
      --end || del();
    });
  }

  function del() {
    var dCnt = ids.length;
    start = new Date();
    for (var i=0; i < ids.length; i++) {
      User.remove({ _id : ids[i] }, function (err) {
        if (err) throw err;
        --dCnt || done();
      });
    }
  }

  function done() {
    var time = (new Date() - start);

    output.mongoose.time = time;
    output.mongoose.numberDeleted = num;
    output.mongoose.dps = num / (time/1000);
    driverTest(num);
  }
});

function driverTest(num) {
  mongo.connect("mongodb://localhost/mongoose_perf", function (err, db) {
    if (err) throw err;
    output.driver = {};
    var start;

    var user = db.collection('user');

    var num = 10000;

    var end = num;
    var ids = [];
    for (var i=0; i < num; i++) {
      var nData = {};
      nData.name = data.name + i.toString();
      nData.age = data.age + i;
      nData.likes = data.likes.map(function (item) { return item + i.toString() });
      nData.address = i.toString() + data.address;
      user.insert(nData, function (err, res) {
        if (err) throw err;
        ids.push(res[0]._id);
        --end || del();
      });
    }

    function del() {
      start = new Date();
      var dCnt = ids.length;
      for (var i=0; i < ids.length; i++) {
        user.remove({ _id : ids[i] }, function (err) {
          if (err) throw err;
          --dCnt || finish();
        });
      }
    }

    function finish() {
      var time = (new Date() - start);

      output.driver.time = time;
      output.driver.numberDeleted = num;
      output.driver.dps = num / (time/1000);
      mongoose.disconnect();
      db.close();
      console.log(output);
    }
  });
}
