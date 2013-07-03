
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

// now benchmark random reads, 10k documents

mongoose.connect("mongodb://localhost/mongoose_perf", function (err) {
  if (err) throw err;

  var num = 10000;

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
      --end || cont();
    });
  }

  function cont() {
    var start = new Date();
    console.log("Mongoose Test Starting now");
    end = ids.length;
    for (var i=0; i < ids.length; i++) {
      var ind = Math.round(Math.random() * ids.length);
      User.find({ _id : ids[ind] }, function (err, res) {
        if (err) throw err;
        --end || done(start);
      });
    }
  }

  function done(start) {
    var time = (new Date() - start);

    console.log("Mongoose test took %d ms for %d reads (%d dps)", time, num, num / (time/1000));
    User.remove(function (err) {
      if (err) throw err;
      driverTest(num);
    });
  }
});

function driverTest(num) {
  mongo.connect("mongodb://localhost/mongoose_perf?w=1", function (err, db) {
    if (err) throw err;


    var user = db.collection('user');


    var ids = [];
    var end = num;

    for (var i=0; i < num; i++) {
      var nData = {};
      nData.name = data.name + i.toString();
      nData.age = data.age + i;
      nData.likes = data.likes.map(function (item) { return item + i.toString() });
      nData.address = i.toString() + data.address;
      user.insert(nData, function (err, res) {
        if (err) throw err;
        ids.push(res[0]._id);
        --end || cont();
      });
    }

    function cont() {
      var start = new Date();
      console.log("Driver Test Starting now");
      end = ids.length;
      for (var i=0; i < ids.length; i++) {
        var ind = Math.round(Math.random() * ids.length);
        user.find({ _id : ids[ind] }, function (err, res) {
          if (err) throw err;
          res.toArray(function (err, res) {
            --end || finish(start);
          });
        });
      }
    }

    function finish(start) {
      var time = (new Date() - start);

      console.log("Driver test took %d ms for %d reads (%d dps)", time, num, num / (time/1000));
      user.remove({}, function (err) {
        if (err) throw err;
        mongoose.disconnect();
        db.close();
      });
    }
  });
}
