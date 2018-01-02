// https://github.com/RisingStack/nodehero-authentication/blob/master/app/authen
// tication/middleware.js
function isAuthenticated(req, res, next, cb) {
  if (req.user && req.user.authorized === 1) {
    return cb(req, res, next, null);
  } else {
    return cb(req, res, next, "not authorized")
  }
}

module.exports = isAuthenticated;
