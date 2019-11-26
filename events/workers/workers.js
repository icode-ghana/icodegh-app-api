const Workers = {
  async sendUserAccountVerificationEmail(data) {
    global.queue.now("send_account_verification_mail", data);
  },
  async sendUserPasswordResetEmail(data) {
    global.queue.now("send_password_reset_mail", data);
  }
};

module.exports = Workers;
