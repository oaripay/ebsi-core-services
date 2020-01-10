const express = require("express");
const fileUpload = require("express-fileupload");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const expressHbs = require("express-handlebars");
const session = require("express-session");

require("dotenv").config();

const mongoose = require("mongoose");
const MongoStore = require("connect-mongo")(session);
const indexRouter = require("./routes/index");
const userRouter = require("./routes/user");
const loginRouter = require("./routes/login");
const logoutRouter = require("./routes/logout");
var config = require('./service/conf');

const app = express();

const PUBLIC_URL = process.env.PUBLIC_URL || "";
const PATHNAME = PUBLIC_URL ? new URL(PUBLIC_URL).pathname : "";

// Set vars for handlebars
app.locals.PUBLIC_URL = PUBLIC_URL;
app.locals.PATHNAME = PATHNAME;

mongoose.connect(config.mongoConf, { useUnifiedTopology: true, useNewUrlParser: true }, err => {
  if (err) {
    console.log('using mongoConf:', config.mongoConf);
    console.log("Unable to connect to mongoDB. Please start mongoDB. Error:", err);
  } else {
    console.log("Connected to mongoDB successfully!");
  }
});

// view engine setup
app.engine(".hbs", expressHbs({ defaultLayout: "layout", extname: ".hbs" }));

app.set("view engine", ".hbs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: "isthisebsiv1secretkeyfornotarydappsessionisreallyaweaksecret4you",
    resave: false,
    saveUninitialized: true,
    store: new MongoStore({ mongooseConnection: mongoose.connection })
  })
);
app.use(`${PATHNAME}/public`, express.static("public"));
app.use(fileUpload());

app.use(`${PATHNAME}/`, indexRouter);
app.use(`${PATHNAME}/user`, userRouter);
app.use(`${PATHNAME}/login`, loginRouter);
app.use(`${PATHNAME}/logout`, logoutRouter);

app.use((req, res, next) => {
  const err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// error handler
app.use((err, req, res) => {
  /* eslint-disable no-alert, no-console */
  console.log("******error*******\n", err.message);
  /* eslint-enable no-alert, no-console */
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("./layouts/error");
});

module.exports = app;
