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
const fs = require('fs')
const https = require('https')
const favicon = require('serve-favicon')

//favicon
app.use(favicon(__dirname + '/views/images/TU_Dublin_Logo.png'))


//https verification
const key = fs.readFileSync('cert2/private.key')
const cert = fs.readFileSync('cert2/certificate.crt')


//MongoDB
const mongoose = require("mongoose");
mongoose.connect(process.env.DATABASE_URL, {
  useNewURLParser: true
})
const db = mongoose.connection
db.on('error', error => console.error(error))
db.once('open', () => console.log('Connection to Mongoose'))

const registerSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  }
})

//MongoDB END
const User = mongoose.model('User', registerSchema)
module.exports = { User };
// Working with local array
const initializePassport = require('./passport-config.js')
//initializePassport(
//  passport,
//  email => users.find(user => user.email === email),
//  id => users.find(user => user.id === id)
//)


initializePassport(
  passport,
  email => User.findOne({ email: email }),
  id => User.findById(id)
);

const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_KEY,
})

//const users = []

// EJS setup
app.set('view-engine', 'ejs')
app.use(express.urlencoded({ extended: false }))
app.use(flash())
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))

app.get('/', checkAuthenticated, (req, res) => {
  res.render('index.ejs', { name: req.user.name })
})

app.get('/view', checkAuthenticated, (req, res) => {
  res.render('view.ejs', { name: req.user.name, audiourl: key })
})

app.get('/login', checkNotAuthenticated, (req, res) => {
  res.render('login.ejs')
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}))

app.get('/register', checkNotAuthenticated, (req, res) => {
  res.render('register.ejs')
})

app.post('/register', checkNotAuthenticated, async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    const user = new User({
      id: Date.now().toString(),
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword
    })

    const newUser = await user.save()

    // user in memory

    //const hashedPassword = await bcrypt.hash(req.body.password, 10)
    //users.push({
    //  id: Date.now().toString(),
    //  name: req.body.name,
    //  email: req.body.email,
    //  password: hashedPassword
    //})
    res.redirect('/login')
  } catch {
    res.redirect('/register')
    console.log('registration didnt work')
  }
})

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }

  res.redirect('/login')
}

function checkNotAuthenticated(req, res, next) {
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
      const currentDate = new Date()
      const newDate = `${currentDate.getDate()}_${currentDate.getMonth() + 1}_${currentDate.getFullYear()}`
      const newTime = `${currentDate.getHours()}_${currentDate.getMinutes()}_${currentDate.getSeconds()}`
      const originalName = file.originalname;
      const urgentPrefix = originalName.includes("URGENT") ? "URGENT_" : "";
      
      //cb(null, `${sessionStorage.getItem("nameOutput")}-${sessionStorage.getItem("numOutput")}-${Date.now().toString()}`)
      cb(null, `${urgentPrefix}${req.user.name}-${newDate}_${newTime}`)
    }
    // ,acl: "public-read",
  })
})

app.post("/save-image", checkAuthenticated, upload.single("audio"), (req, res) => {
  res.redirect(req.file.location);
})

app.get("/list-bucket", (req, res) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME_OUTPUT,
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
    Bucket: process.env.AWS_BUCKET_NAME_OUTPUT,
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

app.get("/search-bucket", (req, res) => {
  const keyword = req.query.keyword.toLowerCase();
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME_OUTPUT,
    Prefix: "output/",
  };
  s3.listObjectsV2(params, function (err, data) {
    if (err) {
      console.log(err, err.stack);
      res.status(500).send("An error occurred  searching files.");
    } else {
      const files = data.Contents.filter((object) => {
        const key = object.Key.replace("output/", "").toLowerCase();
        return key.includes(keyword);
      }).map((object) => {
        const key = object.Key.replace("output/", "");
        const url = s3.getSignedUrl('getObject', { Bucket: params.Bucket, Key: object.Key });
        return { key, url };
      });
      res.json(files);
    }
  });
});


app.get("/get-audio", (req, res) => {
  const key = req.query.key.replace(".txt", "");
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `${key}`,
  };
  s3.getObject(params, function (err, data) {
    if (err) {
      console.log(err, err.stack);
      res.status(500).send("An error occurred while getting audio.");
    } else {
      res.set('Content-Type', 'audio/webm');
      res.send(data.Body);
    }
  });
});

app.post("/save-edited-content", express.urlencoded({ extended: true }), (req, res) => {
  const key = req.body.key;
  const content = req.body.content;

  console.log("Received: " ,key, content)

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME_OUTPUT,
    Key: `output/${key}`,
    Body: content,
  };

  s3.putObject(params, function (err, data) {
    if (err) {
      console.log(err, err.stack);
      res.status(500).send("An error occurred while saving the edited transcription.");
    } else {
      res.sendStatus(200);
    }
  });
});



const cred = {
	key,
	cert
}


const httpsServer = https.createServer(cred, app)

httpsServer.listen(8443)


app.use(express.static("public"));

app.listen(5678, () => console.log('server is running on port 5678'));
