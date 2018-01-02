// https://github.com/RisingStack/nodehero-authentication/blob/master/app/authen
// tication/middleware.js
function authenticationMiddleware() {
  return function (req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    // res.redirect('/');
    return res
      .status(401)
      .json({success: false});
  };
}

module.exports = authenticationMiddleware;
