const PasswordResetEmailTemplate = require("../../../templates/email/PasswordResetEmailTemplate");

global.queue.define(
  "send_password_reset_mail",
  { priority: "high", concurrency: 10 },
  async (job, done) => {
    const data = job.attrs.data;
    const { user, token } = data;
    try {
      /**
       * @todo complete this logic
       */
      await PasswordResetEmailTemplate(user, token);
      done();
    } catch (e) {
      done(e);
    }
  }
);

// Do something when is starts
global.queue.on("start:send_password_reset_mail", job => {
  console.log("send_password_reset_mail started}");
});

// Do something if its done
global.queue.on("complete:send_password_reset_mail", job => {
  console.log("send_password_reset_mail is done}");
});

// Do something if it fails
global.queue.on("fail:send_password_reset_mail", (error, job) => {
  console.log(`send_password_reset_mail failed with error: ${error.message}`);
  global.logger.error("send_password_reset_mail", { error: error.message });
});
