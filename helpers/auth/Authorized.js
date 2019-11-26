//@ts-check
"use strict";

/**
 * Module Dependencies
 */

const _ = require("lodash");
const ObjectId = require("mongodb").ObjectId;
/**
 * Model Schema
 */

const UserModel = require("../../models/User");
const ConfirmAccount = require("../../controllers/auth/ConfirmAccount");
const AuthHelper = require("../../helpers/auth/AuthHelper");

const Authorized = {
  async checkAuthToken(req, type) {
    try {
      const auth_token = req.headers["authorization"];
      if (!auth_token) {
        throw new Error("No token provided");
      }

      const token = auth_token.replace("Bearer ", "");
      return await this.checkAuthTokenRaw(token, type, req);
    } catch (e) {
      throw new Error(e.message);
    }
  },
  async checkAuthTokenRaw(token, type, req) {
    try {
      const tokenDecoded = await AuthHelper.verifyIdTokenAsync(token, type);
      if (!tokenDecoded) {
        throw new Error("Error with token");
      }
      if (req) {
        req.preAuth = {
          user: tokenDecoded.sub.email,
          role: tokenDecoded.tok_role
        };
      }
      return tokenDecoded;
    } catch (e) {
      throw new Error(e.message);
    }
  },
  async createAndAssignAccessToken(user) {
    try {
      const jtiKey = AuthHelper.generateJti();

      const update_data = {
        "meta.token_auth_key": jtiKey,
        "meta.last_login": new Date()
      };

      const increment_data = {
        "meta.total_logins": 1
      };

      let updateUser = await UserModel.findByIdAndUpdate(
        { _id: user._id },
        {
          $set: update_data,
          $inc: increment_data
        },
        {
          new: true
        }
      );
      let tokenRole = "none";

      try {
        tokenRole = await Authorized.getTokenRole(updateUser.toJSON());
      } catch (e) {
        throw new Error(e.message);
      }

      const cleanUserData = _.omit(updateUser, ["password"]);
      return AuthHelper.createAccessToken(
        cleanUserData,
        {
          scope: "application",
          jtiKey: jtiKey
        },
        tokenRole
      );
    } catch (e) {
      throw new Error(e.message);
    }
  },
  async removeAccessToken(user) {
    try {
      const query = {
        _id: user._id
      };
      const update_data = {
        $set: {
          "meta.token_auth_key": "",
          "meta.last_logout": new Date()
        }
      };
      return await UserModel.findByIdAndUpdate(query, update_data, {
        new: true
      });
    } catch (e) {
      throw new Error(e.message);
    }
  },

  async getTokenRole(jwt_decoded) {
    if (!jwt_decoded || !jwt_decoded.meta) {
      return "none";
    }

    if (jwt_decoded.role === "super") {
      return "super";
    }

    return jwt_decoded.role;
  },
  async checkActivation(user) {
    switch (user.status) {
      case "pending_email":
        await ConfirmAccount(user.email);
        /**
         * Todo ... enable when email confirmation is done
         */
        throw new Error(
          `This account is pending email confirmation. Check your email for a confirmation link.`
        );
        break;
      case "pending_sms":
        // await ConfirmAccount(user.email);
        throw new Error(
          `This account is pending sms confirmation. Check your inbox for confirmation link.`
        );
        break;
      case "inactive":
        throw new Error(`The user account is inactive. Contact an admin.`);
        break;
      case "active":
        return user;
        break;
      default:
        throw new Error(
          `The user account status is unknown. Please contact an admin.`
        );
        break;
    }
  },
  async confirmAccountRequestByID(userID) {
    const user = await UserModel.findOne({ _id: new ObjectId(userID) });
    const userJSON = user.toJSON();
    if (userJSON && userJSON.email) {
      return await ConfirmAccount(userJSON.email);
    }
  },
  verifyRouteAccess(token, scope) {
    const permissions = {
      application: ["basic_user", "client", "freelancer", "super"],
      admin: ["super"]
    };

    const allowed_user_scopes = ["none", "client", "freelancer", "super"];

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

      if (typeof scope !== "string" && Array.isArray(scope)) {
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
      const type = accountType || "";

      if (token.role == "super") {
        resolve(token);
      }

      if (token.status !== "active") {
        reject(new Error("Inactive User"));
      }

      /**
       * @todo Write logic here to check user has access to account
       */
      resolve(token);
    });
  }
};

module.exports = Authorized;
