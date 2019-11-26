const AccountConfirmationEmailTemplate = require("../../../templates/email/AccountConfirmationEmailTemplate");

global.queue.define(
  "send_account_verification_mail",
  { priority: "high", concurrency: 10 },
  async (job, done) => {
    const data = job.attrs.data;
    const { user, token } = data;
    try {
      /**
       * @todo complete this logic
       */
      await AccountConfirmationEmailTemplate(user, token);
      done();
    } catch (e) {
      done(e);
    }
  }
);

// Do something when is starts
global.queue.on("start:send_account_verification_mail", job => {
  console.log("send_account_verification_mail started}");
});

// Do something if its done
global.queue.on("complete:send_account_verification_mail", job => {
  console.log("send_account_verification_mail is done}");
});

// Do something if it fails
global.queue.on("fail:send_account_verification_mail", (err, job) => {
  console.log(
    `send_account_verification_mail failed with error: ${err.message}`
  );
  global.logger.error("send_account_verification_mail", { error: err.message });
});
