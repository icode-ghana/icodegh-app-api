//@ts-check
const Authorized = require("../../helpers/auth/Authorized");

const Request = {
  async AuthorizeAsync(auth_req, auth_scope) {
    const scope = auth_scope || "none";
    try {
      const token = await Authorized.checkAuthToken(auth_req, "application");
      const auth = await Authorized.verifyRouteAccess(token, scope);
      return auth;
    } catch (e) {
      throw new Error(e.message);
    }
  },

  verifyUserHasAccountAccess: (token, accountID, accountType) => {
    return Authorized.verifyUserHasAccountAccess(token, accountID, accountType);
  },

  sendError: (res, next, error, code = 500) => {
    res.status(code);
    res.send({
      status: "error",
      message: error.message
    });
    return next(false);
  },

  sendSuccess: (res, next, response, code, headers = []) => {
    const rc = !code ? 200 : code;
    const allowedExtraHeaders = ["X-Total-Records"];
    if (headers && headers.length) {
      headers.forEach(h => {
        if (allowedExtraHeaders.includes(h.name)) {
          res.header(h.name, h.value);
        }
      });
    }

    res.status(rc).send(response);
    return next();
  }
};

module.exports = Request;
