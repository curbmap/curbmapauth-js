"use strict";
const passport = require('passport');
require('dotenv').config({path: '../../curbmap.env'});
const postgres = require('../model/postgresModels');
const util = require('util');
const bcrypt = require('bcrypt');
const saltRounds = 12;
const uuidv1 = require('uuid/v1');

const passwordSpecial = /[!@#$%^&*)(<>+=._\-]+/g;
const passwordCapital = /[A-Z]+/g;
const passwordLower = /[a-z]+/g;
const passwordNum = /[0-9]+/g;
const regexpEmail = /^[_A-Za-z0-9-+]+(.[_A-Za-z0-9-]+)*@[A-Za-z0-9-]+(.[A-Za-z0-9]+)*(.[A-Za-z]{2,})$/;
function userResources(app, transporter) {
    app.post('/login', passport.authenticate('local'), function(req, res) {
        req.session.role = req.user.role;
        req.session.userid = req.user.id_user;
        res.json(userContent(req.user, req.sessionID));
    });

    app.get('/resendauth', (req, res, next) => {
        if (req.query.hasOwnProperty('username') && req.query.username !== "") {
            postgres.User.findOne({where: {username: req.query.username}})
                .then((foundUser) => {
                    if (foundUser !== null && foundUser !== undefined) {
                        if (foundUser.auth_token === "") {
                            res.json({success: -1});
                            next();
                        } else {
                            sendAuth(transporter, foundUser.username, foundUser.user_email, foundUser.auth_token);
                            res.json({success: 1});
                            next();
                        }
                    } else {
                        res.json({success: 0});
                        next();
                    }
                }).catch((e) => {
                    res.json({success: 0});
                    next();
            })
        }
    });

    app.get('/activate', function(req, res, next) {
        if (req.query.hasOwnProperty('username') && req.query.username !== "" && req.query.token !== "") {
            postgres.User.findOne({where: {username: req.query.username}})
                .then((foundUser) => {
                    if (foundUser !== null && foundUser !== undefined) {
                        if (foundUser.auth_token === req.query.token) {
                            foundUser.auth_token = "";
                            foundUser.authorized = 1;
                            foundUser.save()
                        } else {
                            throw "autherror"
                        }
                    } else {
                        throw "nouser"
                    }
                })
                .then(() => {
                    res.redirect('http://curbmap.com');
                })
                .catch((e) => {
                    if (e === "autherror") {
                        console.log("error");
                        res.render('activate', {errortext: "Please make sure you copied the token correctly"});
                    } else if (e === "nouser") {
                        console.log("error no user");
                        res.render('activate', {errortext: "Please check the username again"});
                    }
                console.log(e);
            })
        } else {
            res.render('activate', {errortext: ""});
            next();
        }
    });


    app.post('/signup', function (req, res, next) {
        if (req.body.username !== "" && req.body.password !== "" && req.body.email !== "") {
            postgres.User.findOne({where: {username: req.body.username}}).then(function(foundUser) {
                if (foundUser === null || foundUser === undefined) {
                    postgres.User.findOne({where: {user_email: req.body.email}}).then(function (foundEmail) {
                        if (foundEmail === null || foundEmail === undefined){
                            if (passwordMeetsCriteria(req.body.password)) {
                                if (emailMeetsCriteria(req.body.email)) {
                                    try {
                                        let newUser = postgres.User.build({
                                            username: req.body.username,
                                            password_hash: bcrypt.hashSync(req.body.password, saltRounds),
                                            user_email: req.body.email,
                                            id_user: uuidv1(),
                                            auth_token: uuidv1().replace('-', '')
                                        });
                                        newUser.save().then(function() {
                                            sendAuth(transporter, req.body.username, req.body.email, newUser.auth_token);
                                            res.json({success: 1});
                                        });
                                    } catch (e){
                                        console.log(e);
                                        res.json({success: -5});
                                    }
                                } else {
                                    res.json({success: -4})
                                }
                            } else {
                                res.json({success:-3});
                            }
                        } else {
                            res.json({success: -2})
                        }
                    })
                } else {
                    // found a user with same name
                    res.json({success: -1})
                }
            })
        } else {
            res.json({success: 0})
        }
    });

    app.get('/home', function(req, res, next) {
        res.render('index');
        next();
    });

    app.get('/', function (req, res, next) {
        res.render('index');
        next();
    });

    app.get('/add', function(req, res, next) {
        res.render('add');
        next();
    });

    app.get('/user', passport.authMiddleware(), function(req, res, next) {
        res.render(userContent(req.user, req.sessionID));
        next();
    });

    app.get('/token', function(req, res, next) {
        res.json({});
        next();
    });
}

function userContent(user, sessionID) {
    if (user.username) {
        return({
            username: user.username,
            role: user.role,
            badge: user.badge,
            badge_updatedAt: user.badge_updatedAt,
            score: user.score,
            score_updatedAt: user.score_updatedAt,
            session: sessionID
        });
    } else {
        return ({});
    }
}

function sendAuth(transporter, username, email, authToken) {
    let mailOptions = {
        from: '"curbmap team" <do-not-reply@curbmap.com>',
        to: email,
        subject: 'Thank you for signing up with curbmap.com.',
        text: 'Copy and paste this address into your browser to authenticate: https://curbmap.com/activate?username='+username+'&token='+authToken,
        html: '<p>Dear ' + username + ',' + '</p><p>to activate your CurbMap account, click the link below.</p><a href="https://curbmap.com/activate?username='+username+'&token='+authToken+'">Click here</a> <p> Or, paste the following authentication token into your browser when you are at the curbmap site and it requests your authentication: </p><p><b>' + authToken + '<b></p><p>Sincerely, <br> The CurbMap team</p> <img src="https://curbmap.com/img/curbmap.png">'
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return error;
        }
        console.log('Message %s sent: %s', info.messageId, info.response);
    });
}

function emailMeetsCriteria(email) {
    return email.match(regexpEmail);
}

function passwordMeetsCriteria(password) {
        return (
            password.match(passwordSpecial) &&
            password.match(passwordCapital) &&
            password.match(passwordLower) &&
            password.match(passwordNum)
        );
}

module.exports = userResources;
