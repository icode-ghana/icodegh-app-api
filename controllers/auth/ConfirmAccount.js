//@ts-check

const moment = require("moment");
const UsersController = require("../users/Users");
const UserModel = require("../../models/User");
const AuthHelper = require("../../helpers/auth/AuthHelper");
const OutboundService = require("../../services/OutboundService");

const ConfirmAccountRequest = async email => {
  const jtiKey = AuthHelper.generateJti();

  const setConfirmAccountToken = user_id => {
    return new Promise((resolve, reject) => {
      const updateQuery = {
        _id: user_id
      };

      const updateData = {
        $set: {
          "meta.token_account_confirmation": jtiKey,
          "meta.timestamp_account_confirmation": moment().unix()
        }
      };

      UserModel.findByIdAndUpdate(
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
          type: "confirm_account",
          jtiKey: jtiKey
        }
      )
    };
  };

  const verifyTimeout = user => {
    return new Promise((resolve, reject) => {
      const time = user.meta.timestamp_account_confirmation;
      if (!time) {
        resolve(
          true
        ); /* There is not a pending account confirmation. Proceed */
      }
      const now = moment().unix();
      const canTryAgain = time + 180;
      const message = `Please wait 3 minutes between account confirmation actions. If you did not receive an email, check your junk mail.`;
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
    const updateUser = await setConfirmAccountToken(user._id);
    const token = generateToken(updateUser);
    await OutboundService.accountConfirmationService(updateUser, token);

    return true;
  } catch (e) {
    throw new Error(e.message);
  }
};

module.exports = ConfirmAccountRequest;
