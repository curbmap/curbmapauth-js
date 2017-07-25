'use strict';
let express = require('express');
let session = require('express-session');
let path = require('path');
let favicon = require('serve-favicon');
let logger = require('morgan');
let cookieParser = require('cookie-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
let bodyParser = require('body-parser');
let cors = require('cors');
let RedisStore = require('connect-redis')(session);
let redis = require('redis').createClient(50005, '127.0.0.1');
let bcrypt = require('bcrypt');
let postgres = require('./model/postgresModels');
require('dotenv').config({path: '../curbmap.env'});
const nodemailer = require('nodemailer');
let smtpTransport = require('nodemailer-smtp-transport');
const auth = {
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS
};

let transporter = nodemailer.createTransport(smtpTransport({
  service: 'SES',
  auth: auth
}));
redis.auth(process.env.REDIS_PASSWORD);

let app = express();
app.redisclient = redis;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

// CORS setup
let whitelist = ['*'];
let corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf('*') !== -1 || whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
};
app.options('*', cors(corsOptions)); // include before other routes
app.use(cors(corsOptions));
app.use(logger('dev'));
app.use(cookieParser());
app.use(session({
  store: new RedisStore({
    host: '127.0.0.1',
    port: 50005,
    prefix: 'curbmap:sessions:',
    client: redis,
    ttl: 13000
  }),
  resave: false,
  saveUninitialized: false,
  secret: process.env.REDIS_SECRET
}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user, cb) {
  cb(null, user.username)
});

passport.deserializeUser(function (username, cb) {
  findUser(username, cb)
});

function findUser(username, cb) {
  postgres.User.findOne({where: {username: username}}).then(
    function (foundUser) {
      console.log(username);
      if (foundUser !== null) {
        return cb(null, foundUser);
      } else {
        return cb(null, false)
      }
    }
  );
}

passport.authMiddleware = require('./auth/authMiddleware');

// We will add other Strategies, such as FB strategy
passport.use(new LocalStrategy(
  function (username, password, done) {
    findUser(username, function (nullvalue, userObject) {
      if (userObject !== false) {
        bcrypt.compare(password, userObject.password_hash, function (err, res) {
          if (err) {
            return done(err)
          }
          else if (res === true) {
            return done(null, userObject)
          } else {
            return done(null, false)
          }
        })
      } else {
        return done(null, false)
      }
    })
  }
));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

require('./routes/index').userResources(app, transporter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
});

module.exports = app;
