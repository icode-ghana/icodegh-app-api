//@ts-check
"use-strict";

const UserModel = require("../../models/User");
const Authorized = require("../../helpers/auth/Authorized");
const Request = require("../../controllers/request/Request");

const cleanUserRequest = req => {
  const email = req.body.email ? req.body.email.toLowerCase().trim() : "";
  const password = req.body.password ? req.body.password : "";

  return {
    email,
    password
  };
};

//@ts-ignore
server.post("/api/v1/auth/login", async (req, res, next) => {
  if (!req || !req.body) {
    return Request.sendError(
      res,
      next,
      new Error("Please enter username or password"),
      400
    );
  }

  const userData = cleanUserRequest(req);

  if (!userData.email || !userData.password) {
    return Request.sendError(
      res,
      next,
      new Error("Please enter username and password"),
      400
    );
  }

  const getUser = () => {
    return new Promise((resolve, reject) => {
      UserModel.findOne({ email: userData.email }, function(err, doc) {
        if (err || !doc) {
          reject(new Error("Invalid username or password"));
        }
        resolve(doc);
      });
    });
  };

  const checkPassword = user => {
    return new Promise((resolve, reject) => {
      user.comparePassword(userData.password, (err, isMatch) => {
        if (err || !isMatch) {
          reject(new Error("Invalid username or password"));
        }
        resolve(isMatch);
      });
    });
  };

  try {
    const user = await getUser();
    await checkPassword(user);
    await Authorized.checkActivation(user);
    const id_token = await Authorized.createAndAssignAccessToken(user);

    return Request.sendSuccess(res, next, { id_token }, 200);
  } catch (error) {
    //@ts-ignore
    global.logger.error("Error: /api/v1/auth/login", { error: error.message });
    return Request.sendError(res, next, new Error(error.message), 400);
  }
});