const express = require("express");
require("dotenv").config({ path: "../curbmap.env" });
const path = require("path");
const favicon = require("serve-favicon");
const logger = require("morgan");
const cors = require("cors");
const fs = require("fs");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const postgres = require("./model/postgresModels");
const passportJWT = require("passport-jwt");
const JWTStrategy = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;
const EXTRACT_KEY = fs.readFileSync("../curbmap.pub");

const app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(favicon(path.join(__dirname, "public/home", "favicon.ico")));

// CORS setup
const whitelist = ["*"];
const corsOptions = {
  origin(origin, callback) {
    if (whitelist.indexOf("*") !== -1 || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  }
};
app.options("*", cors(corsOptions)); // include before other routes
app.use(cors(corsOptions));
app.use(logger("dev"));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(passport.initialize());

passport.serializeUser((user, cb) => {
  cb(null, user.username);
});

passport.deserializeUser((username, cb) => {
  deserializeUser(username, cb);
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

function deserializeUser(username, cb) {
  // always going to look with username and must exist from session
  postgres.User.findOne({
    where: {
      username
    }
  }).then(foundUser => {
    if (foundUser != null) {
      return cb(null, foundUser);
    } else {
      return cb(null, false);
    }
  });
}

function findUser(username, cb) {
  postgres.User.findOne({
    where: {
      username
    }
  })
    .then(foundUser => {
	console.log(foundUser)
      if (foundUser !== null && foundUser.auth_token.length == 0) {
        throw new SuccessUsernameError("success", 1, foundUser, cb);
      } else if (foundUser !== null) {
        throw new FailedAuthorizedError("failed", -1, foundUser, cb);
      }
      return postgres.User.findOne({
        where: {
          user_email: username
        }
      });
    })
    .then(foundUser => {
      if (foundUser != null && foundUser.auth_token.length == 0) {
        throw new SuccessEmailError("success", 1, foundUser, cb);
      } else if (foundUser != null) {
        throw new FailedAuthorizedError("failed", -1, foundUser, cb);
      }
      throw new FailedFindError("failed", -2, foundUser, cb);
    })
    .catch(error => {
      if (
        error instanceof SuccessEmailError ||
        error instanceof SuccessUsernameError
      ) {
        return error.callback(1, error.userObject);
      } else if (error instanceof FailedFindError) {
        return error.callback(-2, false);
      } else if (error instanceof FailedAuthorizedError) {
        return error.callback(-1, false);
      }
    });
}

passport.use(
  new LocalStrategy((username, password, done) => {
    findUser(username, (code, userObject) => {
	console.log(code, userObject)
      if (userObject !== false) {
        bcrypt.compare(password, userObject.password_hash, (err, res) => {
          if (err) {
            return done(err);
          } else if (res === true) {
            return done(null, userObject);
          }
          return done(null, false, { code: 0 });
        });
      } else {
        return done(null, false, { code });
      }
    });
  })
);

passport.use(
  new JWTStrategy(
    {
      jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
      secretOrKey: EXTRACT_KEY,
      algorithms: ["RS384"]
    },
    (jwtPayload, cb) => {
      return cb(null, jwtPayload);
    }
  )
);

app.use(express.static(path.join(__dirname, "public")));
const main = require("./routes/main")
app.use("/", main);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
});

module.exports = app;
