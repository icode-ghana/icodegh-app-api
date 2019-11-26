//@ts-check

const UsersDB = require("../../models/User");
const UsersController = require("../../controllers/users/Users");
const AuthHelper = require("../../helpers/auth/AuthHelper");
const moment = require("moment");
const bcrypt = require("bcrypt");
const OutboundService = require("../../services/OutboundService");

const PasswordReset = {
  async lostPasswordRequest({ email }) {
    const jtiKey = AuthHelper.generateJti();

    const setPasswordToken = user_id => {
      return new Promise((resolve, reject) => {
        const updateQuery = {
          _id: user_id
        };

        const updateData = {
          $set: {
            "meta.token_reset_password": jtiKey,
            "meta.timestamp_reset_password": moment().unix()
          }
        };

        UsersDB.findByIdAndUpdate(
          updateQuery,
          updateData,
          {
            new: true
          },
          function(err, doc) {
            if (err) {
              reject(err);
            }

            resolve(doc);
          }
        );
      });
    };

    const generateToken = user => {
      return {
        reset_token: AuthHelper.createAccessToken(
          {
            user_id: user._id
          },
          {
            expires: 600,
            type: "password_reset",
            jtiKey: jtiKey
          }
        )
      };
    };

    const verifyTimeout = user => {
      return new Promise((resolve, reject) => {
        const time = user.meta.timestamp_reset_password;
        if (!time) {
          resolve(true); /* There is not a pending password reset. Proceed */
        }
        const now = moment().unix();
        const canTryAgain = time + 180;
        const message = `Please wait 3 minutes between password reset actions. If you did not receive an email, check your junk mail.`;

        if (now > canTryAgain) {
          resolve(true); /* It has been more than 3 minutes. Proceed */
        } else {
          reject(
            new Error(message)
          ); /* it has been less than 3 minutes. Reject. */
        }
      });
    };

    try {
      const mongoQuery = { email: email };
      const user = await UsersController.getUser(mongoQuery);
      await verifyTimeout(user);
      const updateUser = await setPasswordToken(user._id);
      const token = generateToken(updateUser);
      await OutboundService.passwordResetService(updateUser, token);
      return true;
    } catch (error) {
      throw new Error(error.message);
    }
  },
  async userResetPassword(token, password) {
    const hash = bcrypt.hashSync(password, 10);
    const findQuery = {
      _id: token.sub.user_id
    };
    const saveQuery = {
      $set: {
        password: hash,
        "meta.token_reset_password": "",
        "meta.token_auth_key": "",
        "meta.timestamp_reset_password": 0
      }
    };
    const saveNewPasswordToUser = () => {
      return new Promise((resolve, reject) => {
        return UsersDB.findByIdAndUpdate(
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
    };

    return await saveNewPasswordToUser();
  }
};

module.exports = PasswordReset;
