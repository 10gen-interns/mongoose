
var start = require('./common')
  , assert = require('assert')
  , mongoose = start.mongoose
  , random = require('../lib/utils').random
  , Schema = mongoose.Schema
  , DocumentObjectId = mongoose.Types.ObjectId

/**
 * Setup
 */

var schema = new Schema({
  pos : { type: [Number], index: '2dsphere' },
  type: String
});

function getModel (db) {
  return db.model('GeoNear', schema, 'geonear'+random());
}

describe('model', function(){
  var mongo24_or_greater = false;
  before(function(done){
    start.mongodVersion(function (err, version) {
      if (err) throw err;

      mongo24_or_greater = 2 < version[0] || (2 == version[0] && 4 <= version[1]);
      if (!mongo24_or_greater) console.log('not testing mongodb 2.4 features');
      done();
    })
  })

  describe('geoNear', function () {
    if (!mongo24_or_greater) return;

    it('works with legacy coordinate points', function (done) {
      var db = start();
      var Geo = getModel(db);
      assert.ok(Geo.geoNear instanceof Function);

      Geo.on('index', function(err){
        if (err) return done(err);

        var geos = [];
        geos[0] = new Geo({ pos : [10,10], type : "place"});
        geos[1] = new Geo({ pos : [15,5], type : "place"});
        geos[2] = new Geo({ pos : [20,15], type : "house"});
        geos[3] = new Geo({ pos : [1,-1], type : "house"});
        var count = geos.length;

        for (var i=0; i < geos.length; i++) {
          geos[i].save(function (err) {
            if (done.err) return;
            if (err) return done(done.err = err);
            --count || next();
          });
        }

        function next() {
          Geo.geoNear([9,9], { spherical : true, maxDistance : .1 }, function (err, results, stats) {
            if (err) {
              db.close();
              return done(err);
            }

            assert.equal(1, results.results.length);
            assert.equal(1, results.ok);

            assert.equal(results.results[0].obj.type, 'place');
            assert.equal(results.results[0].obj.pos.length, 2);
            assert.equal(results.results[0].obj.pos[0], 10);
            assert.equal(results.results[0].obj.pos[1], 10);
            assert.equal(results.results[0].obj.id, geos[0].id);
            assert.ok(results.results[0].obj instanceof Geo);
            Geo.remove(function () {
              db.close();
              done();
            });
          });
        }
      });
    });

    it('works with GeoJSON coordinate points', function (done) {
      var db = start();
      var Geo = getModel(db);
      assert.ok(Geo.geoNear instanceof Function);

      Geo.on('index', function(err){
        if (err) return done(err);

        var geos = [];
        geos[0] = new Geo({ pos : [10,10], type : "place"});
        geos[1] = new Geo({ pos : [15,5], type : "place"});
        geos[2] = new Geo({ pos : [20,15], type : "house"});
        geos[3] = new Geo({ pos : [1,-1], type : "house"});
        var count = geos.length;

        for (var i=0; i < geos.length; i++) {
          geos[i].save(function () {
            --count || next();
          });
        }

        function next() {
          var pnt = { type : "Point", coordinates : [9,9] };
          Geo.geoNear(pnt, { spherical : true, maxDistance : .1 }, function (err, results, stats) {
            if (err) {
              db.close();
              return done(err);
            }

            assert.equal(1, results.results.length);
            assert.equal(1, results.ok);

            assert.equal(results.results[0].obj.type, 'place');
            assert.equal(results.results[0].obj.pos.length, 2);
            assert.equal(results.results[0].obj.pos[0], 10);
            assert.equal(results.results[0].obj.pos[1], 10);
            assert.equal(results.results[0].obj.id, geos[0].id);
            assert.ok(results.results[0].obj instanceof Geo);
            Geo.remove(function () {
              db.close();
              done();
            });
          });
        }
      });
    });

    it('works with lean', function (done) {
      var db = start();
      var Geo = getModel(db);
      assert.ok(Geo.geoNear instanceof Function);

      Geo.on('index', function(err){
        if (err) return done(err);

        var geos = [];
        geos[0] = new Geo({ pos : [10,10], type : "place"});
        geos[1] = new Geo({ pos : [15,5], type : "place"});
        geos[2] = new Geo({ pos : [20,15], type : "house"});
        geos[3] = new Geo({ pos : [1,-1], type : "house"});
        var count = geos.length;

        for (var i=0; i < geos.length; i++) {
          geos[i].save(function () {
            --count || next();
          });
        }

        function next() {
          var pnt = { type : "Point", coordinates : [9,9] };
          Geo.geoNear(pnt, { spherical : true, maxDistance : .1, lean : true }, function (err, results, stats) {
            if (err) {
              db.close();
              return done(err);
            }

            assert.equal(1, results.results.length);
            assert.equal(1, results.ok);

            assert.equal(results.results[0].obj.type, 'place');
            assert.equal(results.results[0].obj.pos.length, 2);
            assert.equal(results.results[0].obj.pos[0], 10);
            assert.equal(results.results[0].obj.pos[1], 10);
            assert.equal(results.results[0].obj._id, geos[0].id);
            assert.ok(!(results.results[0].obj instanceof Geo));
            Geo.remove(function () {
              db.close();
              done();
            });
          });
        }
      });
    });

    it('throws the correct error messages', function (done) {

      var db = start();
      var Geo = getModel(db);

      Geo.on('index', function(err){
        if (err) return done(err);

        var g = new Geo({ pos : [10,10], type : "place"});
        g.save(function() {
          var threw = false;
          Geo.geoNear("1,2", {}, function (e) {
            assert.ok(e);
            assert.equal(e.message, "Must pass either a legacy coordinate array or GeoJSON Point to geoNear");

            Geo.geoNear([1], {}, function (e) {
              assert.ok(e);
              assert.equal(e.message, "If using legacy coordinates, must be an array of size 2 for geoNear");

              Geo.geoNear({ type : "Square" }, {}, function (e) {
                assert.ok(e);
                assert.equal(e.message, "Must pass either a legacy coordinate array or GeoJSON Point to geoNear");

                Geo.geoNear({ type : "Point", coordinates : "1,2" }, {}, function (e) {
                  assert.ok(e);
                  assert.equal(e.message, "Must pass either a legacy coordinate array or GeoJSON Point to geoNear");

                  done();
                });
              });
            });
          });
        });
      });
    });
    it('returns a promise (gh-1614)', function(done){
      var db = start();
      var Geo = getModel(db);

      var pnt = { type : "Point", coordinates : [9,9] };
      var prom = Geo.geoNear(pnt, { spherical : true, maxDistance : .1 }, function (err, results, stats) {
      });
      assert.ok(prom instanceof mongoose.Promise);
      db.close();
      done();
    })

    it('allows not passing a callback (gh-1614)', function (done) {
      var db = start();
      var Geo = getModel(db);
      var g = new Geo({ pos : [10,10], type : "place"});
      g.save(function (err) {
        assert.ifError(err);

        var pnt = { type : "Point", coordinates : [9,9] };
        var promise;
        assert.doesNotThrow(function() {
          promise = Geo.geoNear(pnt, { spherical : true, maxDistance : 100000 });
        });

        function validate(ret, stat) {
          assert.equal(1, ret.results.length);
          assert.equal(ret.results[0].coordinates, [9,9]);
          assert.ok(stat);
        }

        function finish() {
          db.close(done);
        }

        promise.then(validate, assert.ifError).then(finish).end();

      });
    });
  });
});
