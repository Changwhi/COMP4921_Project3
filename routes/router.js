const router = require("express").Router();
const MongoStore = require("connect-mongo");
const session = require("express-session");
const Joi = require("joi");
const bcrypt = require("bcrypt");
require("dotenv").config();
const moment = require('moment');

const db_users = include('database/users');
const db_events = include('database/events')

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
  let calendar_data = await db_events.getEvents({user_id: req.session.userID});
  for (let i = 0; i < calendar_data.length; i++) {
    calendar_data[i].start = moment.utc(calendar_data[i].start).local().format('YYYY-MM-DD HH:mm:ss');
    calendar_data[i].end = moment.utc(calendar_data[i].end).local().format('YYYY-MM-DD HH:mm:ss')
    }
    if (calendar_data) {
     res.render("index", {isLoggedIn: isLoggedIn, calendar_data: calendar_data})
    return;
    }
});

router.get("/friends", async (req, res) => {
  const isLoggedIn = isValidSession(req)
  res.render("friends", { isLoggedIn: isLoggedIn })
  return;
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


router.post("/submitEvent", async (req, res) => {
  const isLoggedIn = isValidSession(req)
  try {
    let lastElement = req.body[req.body.length - 1];
    let user_id = req.session.userID;
    let eventTitle = lastElement.title;
    let eventStartTime = lastElement.start;
    let evenEndTime = lastElement.end;
    let eventColor = lastElement.eventColor; 
    let success = await db_events.createEvent({event_name: eventTitle, event_start_date: eventStartTime, event_end_date: evenEndTime, user_id: user_id, event_color: eventColor })
    if (success) {
       let calendar_data = await db_events.getEvents({user_id: req.session.userID});
       if (calendar_data) {
        res.render("index", {isLoggedIn: isLoggedIn, calendar_data: calendar_data})
        return;
       }
    } else {
      res.render('error', {
        message: `Failed to load the event`,
        title: "Event load failure"
      });
      return;
    }
  } catch (err) {
    return;
  }
})

module.exports = router;
