const { emailSettings } = require("../../config/config");
const { APPLICATION_URL } = process.env;

module.exports = async function PasswordResetEmailTemplate(user, token) {
  const to = user.email;
  const subject = `Password Reset Request`;

  const message_text = `Hi!
  Someone requested a new password for the account ${user.email}
  Paste the link below into your browser to reset your password
  ${APPLICATION_URL}/login/?password_reset=${token.reset_token}`;

  const message_html = `Hi!
  <p>Someone requested a new password for the account ${user.email}</p>
  <p><a href="${APPLICATION_URL}/login/?password_reset=${token.reset_token}">Click this link</a> to reset your password</p>`;

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
  return true;
};
