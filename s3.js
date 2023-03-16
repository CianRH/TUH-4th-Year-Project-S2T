require("dotenv").config();
const express = require('express');
const app = express();
const multer = require("multer");
const multerS3 = require("multer-s3");
const aws = require("aws-sdk");
const bcrypt = require("bcrypt");
const passport = require("passport");
const flash = require("express-flash");
const session = require("express-session");
const methodOverride = require("method-override")

const initializePassport = require('./passport-config.js')
initializePassport(
  passport,
  email => users.find(user => user.email === email),
  id => users.find(user => user.id === id)
)

const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_KEY,
})

const users = [

]

// EJS 
app.set('view-engine', 'ejs')
app.use(express.urlencoded({extended: false}))
app.use(flash())
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))

app.get('/', checkAuthenticated, (req,res) =>{
  res.render('index.ejs', { name: req.user.name })
})

app.get('/view', checkAuthenticated, (req,res) =>{
  res.render('view.ejs', { name: req.user.name })
})

app.get('/login', checkNotAuthenticated, (req,res) =>{
  res.render('login.ejs')
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}))

app.get('/register', checkNotAuthenticated, (req,res) =>{
  res.render('register.ejs')
})

app.post('/register', checkNotAuthenticated , async (req,res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    users.push({
      id: Date.now().toString(),
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword
    })
    res.redirect('/login')
  } catch {
    res.redirect('/register')
  }
})

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()){
    return next()
  }

  res.redirect('/login')
}

function checkNotAuthenticated(req,res,next) {
  if (req.isAuthenticated()) {
    return res.redirect('/')
  }
  next()
}

app.delete('/logout', (req, res, next) => {
  req.logOut((err) => {
    if (err) {
      return next(err);
    }
    res.redirect('/login');
  });
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      //cb(null, `${sessionStorage.getItem("nameOutput")}-${sessionStorage.getItem("numOutput")}-${Date.now().toString()}`)
      cb(null, `${req.user.name}-${Date.now()}`)
    }
    // ,acl: "public-read",
  })
})

app.post("/save-image", upload.single("audio"), (req, res) => {
  res.redirect(req.file.location);
})

app.get("/list-bucket", (req, res) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME2,
    Prefix: "output/",
  };
  s3.listObjectsV2(params, function (err, data) {
    if (err) {
      console.log(err, err.stack);
      res.status(500).send("An error occurred while listing files in the bucket.");
    } else {
      const files = data.Contents.map((object) => {
        const key = object.Key.replace("output/", "");
        const url = s3.getSignedUrl('getObject', { Bucket: params.Bucket, Key: object.Key });
        return { key, url };
      });
      res.json(files);
    }
  });
});

app.get("/get-file-content", (req, res) => {
  const key = req.query.key;
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME2,
    Key: `output/${key}`
  };
  s3.getObject(params, function (err, data) {
    if (err) {
      console.log(err, err.stack);
      res.status(500).send("An error occurred while getting file contents.");
    } else {
      res.send(data.Body.toString('utf-8'));
    }
  });
});

app.use(express.static("public"));

app.listen(5678, () => console.log('server is running on port 5678'));