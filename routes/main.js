const fs = require("fs");
const express = require("express");
const router = express.Router();
const passport = require("passport");
const postgres = require("../model/postgresModels");
const db = require("../models");
const bcrypt = require("bcrypt");
const AWS = require("aws-sdk");
AWS.config.loadFromPath("../config/ses.json");
const jwt = require("jsonwebtoken");
const saltRounds = 12;
const uuidv1 = require("uuid/v1");
const winston = require("winston");
const passwordSpecial = /[!@#$%^&*)(<>+=._]+/g;
const passwordCapital = /[A-Z]+/g;
const passwordLower = /[a-z]+/g;
const passwordNum = /[0-9]+/g;
const regexpEmail = /^[_A-Za-z0-9-+]+(.[_A-Za-z0-9-]+)*@[A-Za-z0-9-]+(.[A-Za-z0-9]+)*(.[A-Za-z]{2,})$/;

let transporter = new AWS.SES({
  apiVersion: "2010-12-01"
});

const TOKEN_KEY = fs.readFileSync("../config/curbmap.key");

function userContent(user) {
  if (user.username) {
    const userObject = JSON.parse(JSON.stringify(user));
    return {
      success: 1,
      username: userObject.username,
      role: userObject.role,
      badge: userObject.badge,
      score: userObject.score,
      id: userObject.id,
      token: jwt.sign(
        {
          username: userObject.username,
          id: userObject.id,
          active: userObject.active_account,
          role: userObject.role
        },
        TOKEN_KEY,
        { algorithm: "RS384", expiresIn: "1d" }
      ),
      email: userObject.email
    };
  }
  return {};
}

router.post("/login", (req, res, next) => {
  passport.authenticate("local", { session: false }, (err, user, info) => {
    	console.log(req.body)
    console.log(user, err, info)
    try {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ success: info.code });
      }
      req.logIn(user, { session: false }, error => {
        if (error) {
          return next(error);
        }
        res.status(200).json(userContent(user));
      });
    } catch (error) {
      winston.log("error", error);
    }
  })(req, res, next);
});

router.post(
  "/logout",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    req.logout();
    res.status(200).json({ success: true });
  }
);

router.get("/resendauth", (req, res, next) => {
  if (req.query.hasOwnProperty("username") && req.query.username !== "") {
    db.curbmap_users.findOne({
      where: {
        username: req.query.username
      }
    })
      .then(foundUser => {
        if (foundUser !== null && foundUser !== undefined) {
          if (foundUser.auth_token === "") {
            res.json({ success: -1 });
            next();
          } else {
            sendAuth(
              foundUser.username,
              foundUser.user_email,
              foundUser.auth_token
            );
            res.json({ success: 1 });
            next();
          }
        } else {
          res.json({ success: 0 });
          next();
        }
      })
      .catch(() => {
        res.json({ success: 0 });
        next();
      });
  }
});

router.get("/activate", (req, res, next) => {
  if (
    req.query.hasOwnProperty("username") &&
    req.query.username !== "" &&
    req.query.token !== ""
  ) {
    postgres.User.findOne({
      where: {
        username: req.query.username
      }
    })
      .then(foundUser => {
        if (foundUser !== null && foundUser !== undefined) {
          if (foundUser.auth_token === req.query.token) {
            foundUser.auth_token = "";
            foundUser.authorized = 1;
            foundUser.save();
          } else {
            throw "autherror";
          }
        } else {
          throw "nouser";
        }
      })
      .then(() => {
        res.redirect("http://curbmap.com");
      })
      .catch(e => {
        if (e === "autherror") {
          winston.log("main:activate", "wrong token", req.query.username);
          res.render("activate", {
            errortext: "Please make sure you copied the token correctly"
          });
        } else if (e === "nouser") {
          winston.log("main:activate", req.query.username);
          res.render("activate", {
            errortext: "Please check the username again"
          });
        }
        winston.log("main:activate", "no user", req.query.username);
      });
  } else {
    res.render("activate", { errortext: "" });
    next();
  }
});

router.post("/changepassword", (req, res, next) => {
  passport.isAuthenticated(req, res, next, (req, res, next, err) => {
    if (err != null) {
      return res.status(401).json({ success: false });
    } else {
      if (
        req.body.username === undefined ||
        req.body.password === undefined ||
        req.body.newpassword === undefined ||
        req.body.username == "curbmaptest"
      ) {
        res.status(200).json({ success: 0 });
      } else {
        if (req.body.username !== req.user.username) {
          res.status(200).json({ success: -1 });
        } else {
          // user is correct user check passwords
          bcrypt.compare(
            req.body.password,
            req.user.password_hash,
            (err, result) => {
              if (err) {
                winston.log("info", "changepass", {
                  user: req.body.username,
                  err
                });
              } else if (result) {
                // check password meets criteria
                if (passwordMeetsCriteria(req.body.newpassword)) {
                  changePassword(req.user, req.body.newpassword, res);
                } else {
                  res.status(200).json({ success: -3 });
                }
              } else {
                res.status(200).json({ success: -2 });
              }
            }
          );
        }
      }
    }
  });
});

router.post("/submitContact", async (req, res, next) => {
  winston.log("error", req.body);
  if (
    req.body.email &&
    req.body.name &&
    req.body.text &&
    (req.body.email !== "" && req.body.name !== "" && req.body.text !== "")
  ) {
    fs.writeFileSync(
      "./contacts/" + new Date().getTime() + ".contact.json",
      JSON.stringify(req.body)
    );
    return res.status(200).json({ success: true });
  } else {
    return res.status(200).json({ success: false });
  }
});

router.post("/signup", async (req, res, next) => {
  if (
    req.body.username !== "" &&
    req.body.password !== "" &&
    req.body.email !== ""
  ) {
    db.curbmap_users
      .findOne({
        where: {
          username: req.body.username
        }
      })
      .then(foundUser => {
        if (foundUser === null || foundUser === undefined) {
          return db.curbmap_users.findOne({
            where: {
              email: req.body.email
            }
          });
        }
        throw "usernamefound";
      })
      .then(async foundEmail => {
        if (foundEmail === null || foundEmail === undefined) {
          if (passwordMeetsCriteria(req.body.password)) {
            if (emailMeetsCriteria(req.body.email)) {
              try {
                const newUser = await db.curbmap_users.build({
                  username: req.body.username,
                  password: bcrypt.hashSync(req.body.password, saltRounds),
                  email: req.body.email,
                  auth_token: uuidv1()
                });
                await newUser.save();
                return newUser;
              } catch (_) {
                throw "couldnotcreateuser";
              }
            } else {
              throw "emaildoesnotmeetcriteria";
            }
          } else {
            throw "passworddoesnotmeetcriteria";
          }
        } else {
          throw "emailfound";
        }
      })
      .then(newUser => {
        sendAuth(req.body.username, req.body.email, newUser.auth_token);
        res.status(200).send({ success: 1 });
      })
      .catch(error => {
        let value;
        switch (error) {
        case "usernamefound":
          value = -1;
          break;
        case "emailfound":
          value = -2;
          break;
        case "passworddoesnotmeetcriteria":
          value = -3;
          break;
        case "emaildoesnotmeetcriteria":
          value = -4;
          break;
        default:
          value = -5;
          break;
        }
        res.status(400).send({ success: value, error: error });
      });
  } else {
    // no info
    res.status(200).send({ success: 0 });
  }
  next();
});

router.get("/", (req, res, next) => {
  res.render("index");
  next();
});

router.get("/privacy", (req, res, next) => {
  console.log("here");
  res.render("privacy");
});

router.get("/login", (req, res, next) => {
  res.render("index");
  next();
});
router.get("/signup", (req, res, next) => {
  res.render("index");
  next();
});

router.get(
  "/user",
  passport.authenticate("jwt", { session: false }),
  (req, res, next) => {
    return res.status(200).json(userContent(req.user));
  }
);

function sendAuth(username, email, authToken) {
  var params = {
    Destination: {
      CcAddresses: [],
      ToAddresses: [email]
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `<p>Dear ${username},</p><p>to activate your CurbMap account, click the link below.</p><a href="https://curbmap.com/activate?username=${username}&token=${authToken}">Click here</a> <p> Or, paste the following authentication token into your browser when you are at the curbmap site and it requests your authentication: </p><p><b>${authToken}<b></p><p>Sincerely, <br> The CurbMap team</p> <img src="https://curbmap.com/img/curbmap.png">`
        },
        Text: {
          Charset: "UTF-8",
          Data: `Copy and paste this address into your browser to authenticate: https://curbmap.com/activate?username=${username}&token=${authToken}`
        }
      },
      Subject: {
        Charset: "UTF-8",
        Data: "Thank you for signing up with curbmap.com."
      }
    },
    Source: '"curbmap team" <do-not-reply@curbmap.com>',
    ReplyToAddresses: ["do-not-reply@curbmap.com"]
  };
  console.log(params);

  // send mail with defined transport object
  let sentMailPromise = transporter.sendEmail(params).promise();
  sentMailPromise
    .then(data => {
      winston.log("warn", "SES", `sending mail to: ${email}`, {
        messageId: data.MessageId
      });
    })
    .catch(err => {
      if (err) {
        winston.log("error", err);
        return err;
      }
    });
}

function emailMeetsCriteria(email) {
  return email.match(regexpEmail);
}

function passwordMeetsCriteria(password) {
  return (
    password.length >= 9 &&
    password.length <= 40 &&
    password.match(passwordSpecial) &&
    password.match(passwordCapital) &&
    password.match(passwordLower) &&
    password.match(passwordNum)
  );
}

function changePassword(userObject, password, res) {
  userObject.password_hash = bcrypt.hashSync(password, saltRounds);
  userObject
    .save()
    .then(() => {
      res.status(200).json({ success: 1 });
    })
    .catch(err => {
      winston.log("warn", "error in saving: ", userObject.username);
      res.status(200).json({ success: -3 });
    });
}

module.exports = router;
