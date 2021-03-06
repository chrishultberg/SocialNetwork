const express = require("express");
const request = require("request");
var rp = require("request-promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const keys = require("../../config/keys");
const passport = require("passport");

const router = express.Router();

// Load Input Validation(Registration)
const validateRegisterInput = require("../../validation/register");

// Load Input Validation(Login)
const validateLoginInput = require("../../validation/login");
// Load User Model
const User = require("../../models/User");

// @route   GET api/users/test
// @desc    Tests users route
// @access  public
router.get("/test", (req, res) =>
  res.json({
    msg: "Users Works"
  })
);

// @route   POST api/users/register
// @desc    Register user
// @access  public

router.post("/register", (req, res) => {
  const { errors, isValid } = validateRegisterInput(req.body);

  // Check Validation
  if (!isValid) {
    return res.status(400).json(errors);
  }
  var emailIdUrl =
    "http://picasaweb.google.com/data/entry/api/user/" +
    req.body.email +
    "?alt=json&fields=gphoto:thumbnail";
  rp(emailIdUrl)
    .then(function() {
      //if email id is valid gmail id
      User.findOne({
        email: req.body.email
      }).then(user => {
        if (user) {
          errors.email = "Email already exists!";
          return res.status(400).json(errors);
        } else {
          var profilePicUrl =
            "http://picasaweb.google.com/data/entry/api/user/" +
            req.body.email +
            "?alt=json&fields=gphoto:thumbnail";
          request(profilePicUrl, function(error, response, body) {
            const avatar = JSON.parse(body).entry.gphoto$thumbnail.$t;
            const newUser = new User({
              name: req.body.name,
              email: req.body.email,
              avatar,
              password: req.body.password
            });
            bcrypt.genSalt(10, (err, salt) => {
              bcrypt.hash(newUser.password, salt, (err, hash) => {
                if (err) throw err;
                newUser.password = hash;
                newUser
                  .save()
                  .then(user => res.json(user))
                  .catch(err => console.log(err));
              });
            });
          });
        }
      });
    })
    .catch(function(err) {
      //if email id is not a valid gmail id
      errors.email = req.body.email + " does not exist";
      return res.status(404).json(errors);
    });
});

// @route   POST api/users/login
// @desc    Login user/ returning token
// @access  public
router.post("/login", (req, res) => {
  const { errors, isValid } = validateLoginInput(req.body);

  // Check Validation
  if (!isValid) {
    return res.status(400).json(errors);
  }

  const email = req.body.email;
  const password = req.body.password;

  // find user by email
  User.findOne({
    email
  }).then(user => {
    // check for user
    if (!user) {
      errors.email = "User not found";
      return res.status(404).json(errors);
    }

    // Check for password
    bcrypt.compare(password, user.password).then(isMatch => {
      if (isMatch) {
        //User
        const payload = {
          id: user.id,
          name: user.name,
          avatar: user.avatar
        }; // Create JWT payload
        // Sign Token
        jwt.sign(
          payload,
          keys.secretOrKey,
          {
            expiresIn: "365d"
          },
          (err, token) => {
            res.json({
              success: true,
              token: "Bearer " + token
            });
          }
        );
      } else {
        errors.password = "Password is Incorrect!";
        return res.status(404).json(errors);
      }
    });
  });
});

// @route   GET api/users/current
// @desc    Return current user
// @access  private
router.get(
  "/current",
  passport.authenticate("jwt", {
    session: false
  }),
  (req, res) => {
    res.json({
      id: req.user.id,
      name: req.user.name,
      avatar: req.user.avatar
    });
  }
);

module.exports = router;
