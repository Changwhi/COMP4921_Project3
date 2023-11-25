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
  let user = null;

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
  try {
    const isLoggedIn = isValidSession(req)
    const user_id = req.session.userID;
    console.log("myID" + user_id)
    const isFriendAdded = req.query.added;
    const isInvalidFriend = req.query.invalidFriend;
    const response1 = await db_friend.retrieveFriend({ user_id: user_id })
    const response2 = await db_friend.retrieveSentRequest({ user_id: user_id })
    res.render("friends", { sentRequest: response2[0], friend_list: response1[0], isFriendAdded: isFriendAdded, isInvalidFriend: isInvalidFriend, isLoggedIn: isLoggedIn })
    return;
  } catch (err) {
    console.log("Error /friends:" + err);
    res.render('error', { message: `Failed render friend page : ${err}` })
    return;

  }
})

router.post('/friends/add', sessionValidation, async (req, res) => {
  try {
    const target_name = req.body.target_name;
    const current_user_id = req.session.userID;
    const users = await db_users.getUsers();
    let target_user = null;

    for (let i = 0; i < users.length; i++) {
      if (users[i].name == target_name) {
        target_user = users[i];
        break;
      }
    }

    // Prevent adding oneself as a friend
    if (target_user && current_user_id === target_user.user_id) {
      res.redirect("/friends/?invalidFriend=You cannot add yourself in your friend list");
      return; // Make sure to exit the function here
    }

    // Add friend logic
    if (target_user) {
      const checkRequest = await db_friend.retrieveSentRequest({ user_id: current_user_id })

      for (let i = 0; i < checkRequest[0].length; i++) {
        if (checkRequest[0][i].user_id == target_user.user_id) {
          const response1 = await db_friend.acceptFriendRequest({ user_id: current_user_id, friend_id: target_user.user_id })
          const response2 = await db_friend.addFriend({ status: 1, user_id: current_user_id, friend_id: target_user.user_id });
          // console.log("chek" + checkRequest[0][i])
          // console.log("target" + target_user.user_id)
          // console.log("result" + JSON.stringify(response))
          res.redirect("/friends/?added=true");
          return;
        }
      }
      const response = await db_friend.addFriend({ status: 0, user_id: current_user_id, friend_id: target_user.user_id });
      if (response) {
        res.redirect("/friends/?added=true");
        return; // Exit the function
      } else {
        res.redirect("/friends/?invalidFriend=Friend already in your friend list");
        return; // Exit the function
      }
    } else {
      res.redirect("/friends/?invalidFriend=Friend does not exist");
      return; // Exit the function
    }
  } catch (err) {
    console.log("Error /friends/add :" + err);
    res.render('error', { message: `Failed to add friend : ${err}` });
    return; // Exit the function
  }
});



router.post('/friends/add/accept', sessionValidation, async (req, res) => {
  try {
    const user_id = req.session.userID;
    const friend_id = req.body.friend_id;
    const users = await db_users.getUsers();
    console.log("user_id" + user_id)
    console.log("friend_id" + friend_id)

    let target_user = null;

    for (let i = 0; i < users.length; i++) {
      if (users[i].user_id == friend_id) {
        target_user = users[i];
        break;
      }
    }
    const response = await db_friend.acceptFriendRequest({ user_id: user_id, friend_id: friend_id })
    console.log("retrieved data" + JSON.stringify(target_user))
    if (response) {
      const response = await db_friend.addFriend({ status: 1, user_id: user_id, friend_id: friend_id });
      res.redirect("/friends/?added=true");
      return
    }
    else {
      res.redirect("/friends/?invalidFriend=Failed to accept friend");
      return; // Exit the function
    }

  } catch (err) {
    console.log("Error /friends/add :" + err);
    res.render('error', { message: `Failed to accept request : ${err}` });
    return; // Exit the function
  }
});



module.exports = router;
