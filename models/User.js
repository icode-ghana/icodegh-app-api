//@ts-check
const mongoose = require("mongoose");
const createdModified = require("mongoose-createdmodified")
  .createdModifiedPlugin;
const mongooseApiQuery = require("mongoose-api-query");
const bcrypt = require("bcrypt");
const salt = 201820192020;
const now = Date.now;

const userSchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
    default: "pending_email",
    enum: ["active", "inactive", "pending_email", "pending_sms"]
  },
  email: {
    type: String,
    unique: {
      index: true
    },
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true,
    default: "student",
    enum: ["student", "tutor", "super"]
  },
  meta: {
    last_login: {
      type: Date,
      default: now
    },
    last_logout: {
      type: Date,
      default: now
    },
    total_logins: {
      type: Number,
      default: 0
    },
    token_reset_password: {
      type: String,
      default: ""
    },
    timestamp_reset_password: {
      type: Number,
      default: 0
    },
    token_auth_key: {
      type: String,
      default: ""
    },
    token_account_confirmation: {
      type: String,
      default: ""
    },
    timestamp_account_confirmation: {
      type: Number,
      default: 0
    }
  },
  isDeleted: {
    value: {
      type: Boolean,
      default: false
    }
  }
});

userSchema.plugin(mongooseApiQuery);
userSchema.plugin(createdModified, {
  index: true
});

 //@ts-ignore
userSchema.pre("save", function(next) {
  if (!this.isModified("password")) return next();
  bcrypt.genSalt(salt, (err, salt) => {
    if (err) return next(err);
    //@ts-ignore
    bcrypt.hash(this.password, salt, (err, hashedPassword) => {
      if (err) return next(err);
      //@ts-ignore
      this.password = hashedPassword;
      next();
    });
  });
});

userSchema.methods.comparePassword = function(requestPassword, callback) {
  bcrypt.compare(requestPassword, this.password, (err, isMatch) => {
    if (err) return callback(err);
    callback(null, isMatch);
  });
};

const User = mongoose.model("User", userSchema);
module.exports = User;
