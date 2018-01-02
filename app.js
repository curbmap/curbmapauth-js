const express = require('express');
const session = require('express-session');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bodyParser = require('body-parser');
const cors = require('cors');
const RedisStore = require('connect-redis')(session);
const redis = require('redis').createClient(50005, '127.0.0.1');
const bcrypt = require('bcrypt');
const postgres = require('./model/postgresModels');
require('dotenv').config({path: '../curbmap.env'});
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');

const auth = {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
};

const transporter = nodemailer.createTransport(smtpTransport({service: 'SES', auth}));
redis.auth(process.env.REDIS_PASSWORD);

const app = express();
app.redisclient = redis;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

// CORS setup
const whitelist = ['*'];
const corsOptions = {
    origin(origin, callback) {
        if (whitelist.indexOf('*') !== -1 || whitelist.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
};
app.options('*', cors(corsOptions)); // include before other routes
app.use(cors(corsOptions));
app.use(logger('dev'));
app.use(cookieParser());
app.use(session({
    store: new RedisStore({host: '127.0.0.1', port: 50005, prefix: 'curbmap:sessions:', client: redis, ttl: 13000}),
    resave: false,
    saveUninitialized: false,
    secret: process.env.REDIS_SECRET
}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, cb) => {
    cb(null, user.username);
});

passport.deserializeUser((username, cb) => {
    findUser(username, cb);
});

class SuccessUsernameError {
    constructor(message, code, userObject, callback) {
        this.code = code;
        this.userObject = userObject;
        this.callback = callback;
        this.message = message;
        this.success = 1;
    }
}

class SuccessEmailError {
    constructor(message, code, userObject, callback) {
        this.code = code;
        this.userObject = userObject;
        this.callback = callback;
        this.message = message;
        this.success = 1;
    }
}

class FailedFindError {
    constructor(message, code, userObject, callback) {
        this.code = code;
        this.userObject = userObject;
        this.callback = callback;
        this.message = message;
        this.success = 0;
    }
}

class FailedAuthorizedError {
    constructor(message, code, userObject, callback) {
        this.code = code;
        this.userObject = userObject;
        this.callback = callback;
        this.message = message;
        this.success = 0;
    }
}

class FailedLoginError {
    constructor(message, code, userObject, callback) {
        this.code = code;
        this.userObject = userObject;
        this.callback = callback;
        this.message = message;
        this.success = 0;
    }
}

function findUser(username, cb) {
    postgres
        .User
        .findOne({where: {
                username
            }})
        .then((foundUser) => {
            if (foundUser !== null && foundUser.auth_token.length == 0) {
                throw new SuccessUsernameError("success", 1, foundUser, cb)
            } else if (foundUser !== null) {
                throw new FailedAuthorizedError("failed", -1, foundUser, cb)
            }
            return postgres
                .User
                .findOne({
                    where: {
                        user_email: username
                    }
                })
        })
        .then((foundUser) => {
            if (foundUser != null && foundUser.auth_token.length == 0) {
                throw new SuccessEmailError("success", 1, foundUser, cb)
            } else if (foundUser != null) {
                throw new FailedAuthorizedError("failed", -1, foundUser, cb)
            }
            throw new FailedFindError("failed", -2, foundUser, cb)
        })
        .catch((error) => {
            if (error instanceof SuccessEmailError || error instanceof SuccessUsernameError) {
                return error.callback(1, error.userObject)
            } else if (error instanceof FailedFindError) {
                return error.callback(-2, false)
            } else if (error instanceof FailedAuthorizedError) {
                return error.callback(-1, false)
            }
        })
});
}

passport.authMiddleware = require('./auth/authMiddleware');

// We will add other Strategies, such as FB strategy
passport
.use(new LocalStrategy(((username, password, done) => {
findUser(username, (code, userObject) => {
    if (userObject !== false) {
        bcrypt.compare(password, userObject.password_hash, (err, res) => {
            if (err) {
                return done(err);
            } else if (res === true) {
                return done(null, userObject);
            }
            return done(null, false, {code: 0});
        });
    } else {
        return done(null, false, {code});
    }
});
})));

app
.use(bodyParser.json());
app
.use(bodyParser.urlencoded({extended: false}));
app
.use(express.static(path.join(__dirname, 'public')));

require('./routes/index')
.userResources(app, transporter);

// catch 404 and forward to error handler
app
.use((req, res, next) => {
const err = new Error('Not Found');
err.status = 404;
next(err);
});

// error handler
app
.use((err, req, res, next) => {
// set locals, only providing error in development
res.locals.message = err.message;
res.locals.error = req
    .app
    .get('env') === 'development'
    ? err
    : {};

// render the error page
res.status(err.status || 500);
});

module.exports = app;
