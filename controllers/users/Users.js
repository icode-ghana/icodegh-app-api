//@ts-check
"use strict";

const ObjectId = require("mongodb").ObjectId;
const bcrypt = require("bcrypt");
const UserModel = require("../../models/User");
// const UserFormatting = require("./UserFormatting");
const emailRegex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

const isStrongPassword = pass => {
  // please improve 
  // use https://www.npmjs.com/package/owasp-password-strength-test
  return pass.length > 3;
};
const UsersController = {
  newUserScheme: userObject => {
    if (!userObject.password) {
      throw new Error("Please enter a password");
    }

    if (!isStrongPassword(userObject.password)) {
      throw new Error("Please enter a stronger password");
    }

    if (!emailRegex.test(userObject.email)) {
      throw new Error("No or an invalid email provided");
    }

    if (
      userObject.role &&
      !["student", "tutor", "super"].includes(userObject.role)
    ) {
      throw new Error("Not a valid role");
    }

    let email = userObject.email;
    email = email.toLowerCase();

    return {
      _id: userObject._id,
      email: email || null,
      password: userObject.password,
      status: userObject.status || "pending_email",
      role: userObject.role || "none"
    };
  },
  getUserByToken: token => {
    return new Promise((resolve, reject) => {
      let user = token;

      UserModel.findOne(
        {
          _id: new ObjectId(user._id),
          "isDeleted.value": false
        },
        {
          __v: 0,
          created: 0,
          modified: 0,
          password: 0
        },
        function(err, doc) {
          if (err || doc === null) {
            return reject(new Error("Error getting user"));
          }

          let access_key = user.meta.token_auth_key;
          let stored_key = doc.toJSON().meta.token_auth_key;

          if (access_key !== stored_key) {
            return reject(new Error("Authorization key invalid"));
          }

          let last_logout = doc.toJSON().meta.last_logout;
          let now = Date.now();
          if (last_logout === now) {
            return reject(new Error("Authorization key timeout"));
          }

          resolve(doc.toJSON());
          // return resolve(UserFormatting.formatUserOut(doc));
        }
      );
    });
  },

  getUser: query => {
    return new Promise((resolve, reject) => {
      if (query === "") {
        reject(new Error("No User Query Provided"));
      }

      if (query._id) {
        query._id = new ObjectId(query._id);
      }
      const aggregateArray = [];
      aggregateArray.push({ $match: query });
      aggregateArray.push({
        $project: {
          password: 0,
          permissions: 0,
          "meta.token_auth_key": 0,
          "meta.token_account_confirmation": 0,
          "meta.token_reset_password": 0
        }
      });

      return UserModel.aggregate(aggregateArray).then(r => {
        if (!r || !r.length) {
          reject(new Error("No User Found"));
        } else {
          resolve(r[0]);
          //   resolve(UserFormatting.formatUserOut(r[0]));
        }
      });
    });
  },

  checkIfUserExists: userEmail => {
    return new Promise((resolve, reject) => {
      if (userEmail === "") {
        reject(new Error("No email address"));
      }

      return UserModel.find({
        email: userEmail
      }).then(r =>
        r.length === 0
          ? resolve(false)
          : reject(
              new Error(`User already exists with the email: ${userEmail}`)
            )
      );
    });
  },
  createUser: async userScheme => {
    try {
      if (!userScheme.email) {
        throw new Error("Please enter your email");
      }

      if (!userScheme.password) {
        throw new Error("Please enter a password");
      }

      if (!userScheme.role) {
        throw new Error("Role is required for the user");
      }

      if (!userScheme.status) {
        throw new Error("Status is required for the user");
      }

      await UsersController.checkIfUserExists(userScheme.email);

      let newUser = new UserModel(userScheme);
      let user = newUser.toJSON();

      await newUser.save();

      return {
        user_added: true,
        id: user._id,
        email: user.email,
        status: user.status,
        role: user.role
      };
    } catch (e) {
      throw e;
    }
  },
  async updateUserData(user_id, data) {
    const generateQuery = data => {
      let query = {};
      switch (data.key) {
        case "status":
          query = {
            $set: {
              status: data.val,
              "meta.token_auth_key": ""
            }
          };
          break;
        case "role":
          query = {
            $set: {
              role: data.val,
              "meta.token_auth_key": ""
            }
          };
          break;
        case "update_password":
          let v = data.val;
          let hash = bcrypt.hashSync(v, 10);
          query = {
            $set: {
              password: hash,
              "meta.token_reset_password": ""
            }
          };
          break;
      }

      return query;
    };

    const updateUserData = () =>
      new Promise((resolve, reject) => {
        let query = generateQuery(data);
        return UserModel.findByIdAndUpdate(
          {
            _id: user_id
          },
          query,
          {
            new: true,
            password: 0,
            role: 0,
            phone: 0,
            permissions: 0,
            meta: 0,
            default_currency: 0,
            created: 0,
            modified: 0
          },
          function(err, doc) {
            if (err) {
              return reject(new Error("Error Saving User"));
            }

            // return resolve(UserFormatting.formatUserOut(doc));
            return resolve(doc.toJSON());
          }
        );
      });

    return await updateUserData();
  },
  deleteUser: user_id =>
    new Promise((resolve, reject) => {
      UserModel.deleteOne(
        {
          _id: new ObjectId(user_id)
        },
        function(err) {
          if (err) {
            return reject(false);
          }
          return resolve(true);
        }
      );
    })
};

module.exports = UsersController;
