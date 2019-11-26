//@ts-check
"use-strict";

const UserModel = require("../../models/User");
const ObjectId = require("mongodb").ObjectId;

const RegistrationController = {
  async userActivateAccount(token) {
    const findQuery = {
      _id: new ObjectId(token.sub.user_id)
    };

    const saveQuery = {
      $set: {
        status: "active",
        "meta.token_reset_password": "",
        "meta.token_account_confirmation": "",
        "meta.token_auth_key": "",
        "meta.timestamp_account_confirmation": 0
      }
    };
    const saveAccountActivationToUser = () =>
      new Promise((resolve, reject) => {
        return UserModel.findByIdAndUpdate(
          findQuery,
          saveQuery,
          { new: true },
          function(err, doc) {
            if (err) {
              return reject(new Error("Error Saving User"));
            }
            return resolve(doc);
          }
        );
      });

    return await saveAccountActivationToUser();
  }
};

module.exports = RegistrationController;
