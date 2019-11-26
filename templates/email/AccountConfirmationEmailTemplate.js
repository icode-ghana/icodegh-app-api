const { emailSettings } = require("../../config/config");
const { APP_NAME, APPLICATION_URL } = process.env;

module.exports = async function AccountConfirmationEmailTemplate(user, token) {
  const to = user.email;
  const subject = `Confirm New Account`;

  const message_text = `Welcome to ${APP_NAME}!
  Paste the link below into your browser to confirm your account
  ${APPLICATION_URL}/login/?confirm_account=${token.reset_token}`;

  const message_html = `Welcome to ${APP_NAME}!
  <p><a href="${APPLICATION_URL}/login/?confirm_account=${token.reset_token}">Click this link</a> to confirm your account</p>`;

  const msg = {
    to: to,
    from: emailSettings.from,
    subject: subject,
    text: message_text,
    html: message_html
  };

  /**
  * @todo complete this logic
  */
  return true
};
