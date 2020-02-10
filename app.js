const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const expressHbs = require('express-handlebars');
const session = require('express-session');
// todo add passport-jwt
require('dotenv').config();
require('log-timestamp');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo')(session);
// const indexRouter = require('./routes/index');
const indexRouter2 = require('./routes/index2');
// const userRouter = require('./routes/user');
// const loginRouter = require('./routes/login');
// const logoutRouter = require('./routes/logout');
const config = require('./service/conf');

const app = express();

const PUBLIC_URL = process.env.PUBLIC_URL || '';
const PATHNAME = PUBLIC_URL ? new URL(PUBLIC_URL).pathname : '';

// Set vars for handlebars
app.locals.PUBLIC_URL = PUBLIC_URL;
app.locals.PATHNAME = PATHNAME;

mongoose.connect(
  config.mongoConf, { useUnifiedTopology: true, useNewUrlParser: true },
  err => {
    if (err) {
      console.log('using mongoConf:', config.mongoConf);
      console.log(
        'Unable to connect to mongoDB. Please start mongoDB. Error:',
        err
      );
    } else {
      console.log('Connected to mongoDB successfully!');
    }
  }
);

// view engine setup
app.engine('.hbs', expressHbs({ defaultLayout: 'layout', extname: '.hbs' }));

app.set('view engine', '.hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: 'isthisebsiv1secretkeyfornotarydappsessionisreallyaweaksecret4you',
    resave: false,
    saveUninitialized: true,
    store: new MongoStore({ mongooseConnection: mongoose.connection })
  })
);
app.use(`${PATHNAME}/public`, express.static('public'));
app.use(fileUpload());

app.use('/demo/eu-funding', indexRouter2);
app.use('/eu-funding', indexRouter2);
app.use('/notary', indexRouter2);


app.use((err, req, res) => {
  /* eslint-disable no-alert, no-console */

  console.log('******error*******\n', err.message);
  /* eslint-enable no-alert, no-console */
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('./layouts/error');
});

module.exports = app;
