const router = require("express").Router();
const MongoStore = require("connect-mongo");
const session = require("express-session");
const Joi = require("joi");
const bcrypt = require("bcrypt");
require("dotenv").config();

const db_users = include('database/users');
const db_friend = include('database/friend');

const saltRounds = 12;
const expireTime = 60 * 60 * 1000;

const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;




const passwordSchema = Joi.object({
  password: Joi.string().pattern(/(?=.*[a-z])/).pattern(/(?=.*[A-Z])/).pattern(/(?=.*[!@#$%^&*])/).pattern(/(?=.*[0-9])/).min(12).max(50).required()
});

var mongoStore = MongoStore.create({
  mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@cluster1.5f9ckjd.mongodb.net/COMP4921_Project1_DB?retryWrites=true&w=majority`,
  crypto: {
    secret: mongodb_session_secret,
  },
});

router.use(
  session({
    secret: node_session_secret,
    store: mongoStore,
    saveUninitialized: false,
    resave: true,
  })
);


function isValidSession(req) {
  console.log("isValidSession")
  if (req.session.authenticated) {
    return true;
  }
  return false;
}

function sessionValidation(req, res, next) {
  console.log("hit sessionValidation")
  if (!isValidSession(req)) {
    res.locals.isLoggedIn = req.session.authenticated === true;
    req.session.destroy();
    res.redirect('/login');
    return;
  }
  else {
    res.locals.isLoggedIn = req.session.authenticated === true;
    next();
  }
}


router.get("/", async (req, res) => {
  console.log("idex page hit")
  const isLoggedIn = isValidSession(req)
  res.render("index", { isLoggedIn: isLoggedIn })
  // res.render("index", { isLoggedIn: false })
  return;
});



router.get("/week", async (req, res) => {
  const isLoggedIn = isValidSession(req)
  res.render('./components/week', { isLoggedIn: isLoggedIn })
})


router.get("/login", async (req, res) => {
  const isLoggedIn = isValidSession(req)
  res.render("login", {
    isLoggedIn: isLoggedIn,
    message: null
  });
  return;
});

router.get('/logout', (req, res) => {
  console.log("Logging out");

  req.session.destroy(err => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).send('Failed to log out');
    }

    res.redirect('/login');
  });
});

router.get("/signup", async (req, res) => {
  console.log("checking" + req.query.invalid)
  var invalid = req.query.invalid === undefined ? true : req.query.invalid;
  res.render("signup", {
    invalid: invalid,
    isLoggedIn: false
  });
  return;

});

router.post("/loggingin", async (req, res) => {
  var email = req.body.email;
  var password = req.body.password;
  var users = await db_users.getUsers();
  let user;

  for (let i = 0; i < users.length; i++) {
    if (users[i].email == email) {
      user = users[i];
      break;
    }
  }

  if (user === undefined) {
    res.render('login', {
      message: "Why did you enter the wrong email?!",
      isLoggedIn: false
    });
    return;
  }

  const validationResult = passwordSchema.validate({
    password: password
  });
  if (validationResult.error) {
    let errorMsg = validationResult.error.details[0].message;

    if (errorMsg.includes("(?=.*[a-z])")) {
      errorMsg = "Password must have at least 1 lowercase.";
    } else if (errorMsg.includes("(?=.*[A-Z])")) {
      errorMsg = "Password must have at least 1 uppercase.";
    } else if (errorMsg.includes("(?=.*[!@#$%^&*])")) {
      errorMsg = "Password requires 1 special character.";
    } else if (errorMsg.includes("(?=.*[0-9])")) {
      errorMsg = "Password needs to have 1 number.";
    } else {
      errorMsg = null;
    }

    res.render("error", {
      message: errorMsg,
      isLoggedIn: false
    });
    return;
  }

  const isValidPassword = bcrypt.compareSync(password, user.hashed_password);
  if (isValidPassword) {
    console.log("User's logged in")
    req.session.userID = user.user_id;
    req.session.name = user.name
    req.session.authenticated = true;
    req.session.email = email;
    req.session.cookie.maxAge = expireTime;
    res.redirect("/")
  } else {
    req.session.authenticated = false;
    res.redirect('/login');
  }
});


// User creation
router.post("/submitUser", async (req, res) => {
  var email = req.body.email;
  var password = req.body.password;
  var name = req.body.name;
  var hashedPassword = bcrypt.hashSync(password, saltRounds);

  const validationResult = passwordSchema.validate({
    password
  });

  if (validationResult.error) {
    let errorMsg = validationResult.error.details[0].message;

    if (errorMsg.includes("(?=.*[a-z])")) {
      errorMsg = "Password must have at least 1 lowercase.";
    } else if (errorMsg.includes("(?=.*[A-Z])")) {
      errorMsg = "Password must have at least 1 uppercase.";
    } else if (errorMsg.includes("(?=[!@#$%^&*])")) {
      errorMsg = "Password requires 1 special character.";
    } else if (errorMsg.includes("(?=.*[0-9])")) {
      errorMsg = "Password needs to have 1 number.";
    }
    res.render("signup", {
      message: errorMsg,
      isLoggedIn: false
    });
    return;
  } else {
    var success = await db_users.createUser({
      email: email,
      hashedPassword: hashedPassword,
      name: name
    });

    if (success) {
      res.render("index", {
        isLoggedIn: true
      })
    } else {
      res.render('error', {
        message: `Failed to create the user ${email}, ${name}`,
        title: "User creation failed"
      });
    }
  }
});

router.get("/friends", sessionValidation, async (req, res) => {
  const isLoggedIn = isValidSession(req)
  const isFriendAdded = req.query.added;
  const isInvalidFriend = req.query.invalidFriend;
  console.log(isFriendAdded)
  console.log(isInvalidFriend)
  res.render("friends", { isAdded: isFriendAdded, isInvalidFriend: isInvalidFriend, isLoggedIn: isLoggedIn })
  return;
})

router.post('/friends/add', sessionValidation, async (req, res) => {
  try {
    const target_name = req.body.target_name;
    const current_user_id = req.session.user_ID;
    const users = await db_users.getUsers();
    let target_user = null;

    for (let i = 0; i < users.length; i++) {
      if (users[i].name == target_name) {
        target_user = users[i];
        break;
      }
    }
    if (target_user) {
      const response = await db_friend.addFriend({ user_id: current_user_id, friend_id: target_user.user_id })
      res.redirect("/friends/?added=true")
    } else {
      res.redirect("/friends/?invalidFriend=true")
    }
    return
  } catch (err) {
    console.log("Error /friends/add :" + err);
    res.render('error', { message: `Failed to add friend : ${err}` })
    return;
  }
})



module.exports = router;
