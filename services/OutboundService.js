//@ts-check
const Workers = require("../events/workers/workers");

const OutboundService = {
  async accountConfirmationService(user, token) {
    try {
      await Workers.sendUserAccountVerificationEmail({ user, token });
    } catch (error) {
      console.log("error: OutboundService - accountVerificationService", error);
      //@ts-ignore
      global.logger.error("OutboundService - accountVerificationService", {
        error: error.message
      });
    }
  },
  async passwordResetService(user, token) {
    try {
      await Workers.sendUserPasswordResetEmail({ user, token });
    } catch (error) {
      console.log("error: OutboundService - passwordResetService", error);
      //@ts-ignore
      global.logger.error("OutboundService - passwordResetService", {
        error: error.message
      });
    }
  },
  async phoneNumberVerificationService(user) {}
};

module.exports = OutboundService;
