var assert = require('assert');
var benchmark = require('benchmark');
var crypto = require('crypto');
var hash = require('hash.js');
var elliptic = require('../');
var eccjs = require('eccjs');
var jodid = require('./deps/jodid');

var benchmarks = [];
var maxTime = 10;

function add(op, obj) {
  benchmarks.push({
    name: op,
    start: function start() {
      var suite = new benchmark.Suite;

      console.log('Benchmarking: ' + op);
      Object.keys(obj).forEach(function(key) {
        suite.add(key + '#' + op, obj[key], { maxTime: maxTime })
      });

      suite
        .on('cycle', function(event) {
          console.log(String(event.target));
        })
        .on('complete', function() {
          console.log('------------------------');
          console.log('Fastest is ' + this.filter('fastest').pluck('name'));
        })
        .run();
      console.log('========================');
    }
  });
}

function start() {
  var re = process.argv[2] ? new RegExp(process.argv[2], 'i') : /./;

  benchmarks.filter(function(b) {
    return re.test(b.name);
  }).forEach(function(b) {
    b.start();
  });
}

var str = 'big benchmark against elliptic';

var m1 = hash.sha256().update(str).digest();
var c1 = elliptic.ec(elliptic.curves.secp256k1);
var k1 = c1.genKeyPair();
var s1 = c1.sign(m1, k1);
var ok = '-----BEGIN EC PARAMETERS-----\n' +
         'BgUrgQQACg==\n' +
         '-----END EC PARAMETERS-----\n' +
         '-----BEGIN EC PRIVATE KEY-----\n' +
         'MHQCAQEEIEWQfsvf8TdY+F2ziHut3Fl+LVdCHAQBLxeKn3v79M1LoAcGBSuBBAAK\n' +
         'oUQDQgAEM7DB6MG6T5nGSwougzGIXVypXb81EerftCyqTc7v/rjmLobz5ZJHGALh\n' +
         'ne+0Gdz5ZytFHQCTkUlU85Mz8SPjWg==\n' +
         '-----END EC PRIVATE KEY-----';
assert(c1.verify(m1, s1, k1));

var m2 = eccjs.sjcl.hash.sha256.hash('big benchmark against elliptic');
var c2 = eccjs.sjcl.ecc.curves.k256;
var k2 = eccjs.sjcl.ecc.ecdsa.generateKeys(c2, 0);
var s2 = k2.sec.sign(m2, 0);
assert(k2.pub.verify(m2, s2));

add('sign', {
  elliptic: function() {
    c1.sign(m1, k1);
  },
  sjcl: function() {
    k2.sec.sign(m2, 0);
  },
  openssl: function() {
    crypto.createSign('RSA-SHA256').update(str).sign(ok);
  }
});

var os1 = crypto.createSign('RSA-SHA256').update(str).sign(ok);
var opk = '-----BEGIN PUBLIC KEY-----\n' +
          'MFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEM7DB6MG6T5nGSwougzGIXVypXb81Eerf\n' +
          'tCyqTc7v/rjmLobz5ZJHGALhne+0Gdz5ZytFHQCTkUlU85Mz8SPjWg==\n' +
          '-----END PUBLIC KEY-----';
add('verify', {
  elliptic: function() {
    c1.verify(m1, s1, k1);
  },
  sjcl: function() {
    k2.pub.verify(m2, s2);
  },
  openssl: function() {
    crypto.createVerify('RSA-SHA256').update(str).verify(opk, os1);
  }
});

add('gen', {
  elliptic: function() {
    c1.genKeyPair().getPublic();
  },
  sjcl: function() {
    eccjs.sjcl.ecc.ecdsa.generateKeys(c2, 0);
  }
});

add('ecdh', {
  elliptic: function() {
    c1.genKeyPair().derive(k1.getPublic());
  }
});

var cu1 = elliptic.ec('curve25519');
var ku1 = cu1.genKeyPair();
var kp2 = jodid.eddsa.genKeySeed();

add('curve25519', {
  elliptic: function() {
    var s = ku1.derive(cu1.genKeyPair().getPublic());
  },
  jodid: function() {
    var s = jodid.dh.computeKey(kp2,
                                jodid.dh.publicKey(jodid.eddsa.genKeySeed()));
  }
});

start();
