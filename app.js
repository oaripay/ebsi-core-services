var express = require("express");
const fileUpload = require("express-fileupload");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var expressHbs = require("express-handlebars");
var session = require("express-session");

require("dotenv").config();

var indexRouter = require("./routes/index");
var userRouter = require("./routes/user");
var loginRouter = require("./routes/login");
var logoutRouter = require("./routes/logout");
var mongoose = require("mongoose");
var MongoStore = require("connect-mongo")(session);

var app = express();

const PUBLIC_URL = process.env.PUBLIC_URL || "";
const PATHNAME = PUBLIC_URL ? new URL(PUBLIC_URL).pathname : "";

// Set vars for handlebars
app.locals.PUBLIC_URL = PUBLIC_URL;
app.locals.PATHNAME = PATHNAME;

// TODO: create and use MONGO_HOST and MONGO_PORT env vars
var mongoConf = "mongodb://mongo:27017/notarydapp";

mongoose.connect(
  mongoConf,
  { useUnifiedTopology: true, useNewUrlParser: true },
  function(err) {
    if (err) {
      console.log(
        "Unable to connect to mongoDB. Please start mongoDB. Error:",
        err
      );
    } else {
      console.log("Connected to mongoDB successfully!");
    }
  }
);

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
    secret: "thatsareallysecretkey",
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

app.use(function(req, res, next) {
  var err = new Error("Not Found");
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
