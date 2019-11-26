//@ts-check

const ObjectId = require("mongodb").ObjectId;
const UserModel = require("../../models/User");
const _ = require("lodash");
const jwt = require("jsonwebtoken");
const { JWT_SECRET, JWT_AUDIENCE, JWT_ISSUER } = process.env;

const AuthHelper = {
  generateUUID: () => {
    var d = new Date().getTime();
    if (
      typeof performance !== "undefined" &&
      typeof performance.now === "function"
    ) {
      d += performance.now();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      var r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  },

  createIdToken(user) {
    return jwt.sign(_.omit(user, "password"), JWT_SECRET, {
      expiresIn: 86400
    });
  },

  generateJti() {
    let jti = "";
    let possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 16; i++) {
      jti += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return jti;
  },
  autoGeneratePassword() {
    let length = Math.floor(Math.random() * (36 - 24 + 1) + 24);
    let charset =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let pw = "";
    for (var i = 0, n = charset.length; i < length; ++i) {
      pw += charset.charAt(Math.floor(Math.random() * n));
    }
    return pw;
  },
  createAccessToken(data, options, role) {
    let jwt_data = data;
    let jwt_type = options.type || "application";
    let jwt_role = role || "none";
    let jwt_expires = options.expires || 86400;
    let jwt_jti = options.jtiKey || this.generateJti();

    switch (jwt_type) {
      case "application":
        jwt_data = _.omit(data, "password");
        break;
      case "password_reset":
        jwt_expires = 500;
        break;
    }

    return jwt.sign(
      {
        iss: JWT_ISSUER, // issuer
        aud: JWT_AUDIENCE, // audience
        scope: jwt_type, // scope
        tok_role: jwt_role, // user role
        sub: jwt_data, // subject
        jti: jwt_jti, // JWT ID
        alg: "HS256" // algorithm
      },
      JWT_SECRET,
      {
        expiresIn: jwt_expires
      }
    );
  },

  decodeIdToken(req) {
    let token = req.headers["authorization"] || false;
    let user = {};

    if (!token) {
      return new Error("No Token");
    }

    token = token.replace("Bearer ", "");
    try {
      const decoded = jwt.decode(token);
      user = decoded.sub;
    } catch (e) {
      user = new Error("No User");
    }

    return user;
  },

  verifyIdToken(token) {
    return jwt.verify(token, JWT_SECRET);
  },

  async verifyIdTokenAsync(token, type) {
    const allowed_types = ["password_reset", "account_confirm", "application"];

    if (!type || !allowed_types.includes(type)) {
      throw new Error("Invalid token type");
    }

    const verifyToken = () => {
      return new Promise((resolve, reject) => {
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
          if (err || !decoded) {
            reject(new Error(err.message || "Token verify error"));
          }
          return resolve(decoded);
        });
      });
    };

    const verifyTokenOnDB = async (tokenDecoded, type) => {
      try {
        const user = tokenDecoded.sub;
        let user_id = user._id;

        if (type === "password_reset" || type === "account_confirm") {
          user_id = user.user_id;
        }

        const getUser = await UserModel.findOne({ _id: user_id })
          .then(user => user.toJSON())
          .catch(e => {
            throw new Error("Error getting user");
          });

        if (getUser._id !== user._id) {
          return new Error("Account token mismatch");
        }

        const access_key = tokenDecoded.jti;
        let stored_key = "";

        if (type === "application") {
          stored_key = getUser.meta.token_auth_key;
          if (Date.now() < getUser.meta.last_logout) {
            throw new Error("Token timeout");
          }
          if (getUser.status !== "active") {
            throw new Error("Account not active");
          }
        } else if (type === "password_reset") {
          stored_key = getUser.meta.token_reset_password;
        } else if (type === "account_confirm") {
          stored_key = getUser.meta.token_account_confirmation;
        }

        if (access_key !== stored_key) {
          throw new Error("Token mismatch");
        }

        return true;
      } catch (e) {
        throw e;
      }
    };

    try {
      const tokenDecoded = await verifyToken();
      await verifyTokenOnDB(tokenDecoded, type);
      return tokenDecoded;
    } catch (e) {
      throw e;
    }
  },

  verifyRouteAccessAsync(token, scope) {
    const permissions = {
      application: ["freelancer", "client"],
      admin: ["super"]
    };

    const allowed_user_scopes = ["none", "super", "client", "freelancer"];

    return new Promise((resolve, reject) => {
      const role = token.tok_role;

      if (token.sub.status !== "active") {
        return reject(new Error("Inactive User"));
      }

      if (allowed_user_scopes.indexOf(role) === -1) {
        return reject(
          new Error("You do not have access to anything. This is an error.")
        );
      }

      if (typeof role !== "string" && Array.isArray(scope)) {
        for (let i = 0; i < scope.length; i++) {
          const sc = scope[i];
          if (
            role === sc ||
            (permissions[sc] && permissions[sc].indexOf(role) > -1)
          ) {
            return resolve(Object.assign({}, token.sub, { tok_role: role }));
          }
        }
      } else {
        if (
          role === scope ||
          (permissions[scope] && permissions[scope].indexOf(role) > -1)
        ) {
          return resolve(Object.assign({}, token.sub, { tok_role: role }));
        }
      }

      return reject(new Error("You do not have access to this route."));
    });
  },
  verifyUserHasAccountAccess(token, accountID, accountType) {
    return new Promise((resolve, reject) => {
      const accounts = token.accounts;
      const accountIDs = accounts.map(a => a.id);
      const account = new ObjectId(accountID).toString();
      const type = accountType || "";

      if (token.role == "super") {
        resolve(token);
      }

      if (token.status !== "active") {
        reject(new Error("Inactive User"));
      }

      if (accounts.length <= 0) {
        reject(new Error("No Accounts"));
      }

      const accountIndex = accountIDs.indexOf(account);

      if (accountIndex === -1) {
        reject(new Error(`You do not have access to this ${type} account`));
      }

      if (accounts[accountIndex].type !== type) {
        reject(
          new Error(
            `Account type mismatch. ${type} is not ${accounts[accountIndex].type}`
          )
        );
      }

      resolve(token);
    });
  }
};

module.exports = AuthHelper;
