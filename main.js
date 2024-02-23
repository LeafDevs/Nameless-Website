const express = require('express');
const app = express();
const fs = require('node:fs');

const QRCode = require('qrcode');

const speakeasy = require('speakeasy'); 

const session = require('express-session');

const bodyParser = require('body-parser');
const { User } = require('./src/User');

app.use(session({
  secret: 'your-secret-key', // Replace with a secure random string
  resave: false,
  saveUninitialized: true,
}));


let apikey = 'API-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

console.log(apikey);

let userSecrets = {};

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static('public'));
app.use(express.static('views'));

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.render('index.ejs');
});


function loadSecrets() {
  let data = fs.readFileSync('secrets.json');
  userSecrets = JSON.parse(data);
}

loadSecrets();

app.get('/careers', (req, res) => {
  res.render('careers.ejs');
})

app.get('/apply', (req, res) => {
  res.render('apply.ejs');
})


app.post('/api/v1/apply', (req, res) => {
  console.log(req.body);

  let data = fs.readFileSync('applications.json');
  let applications = JSON.parse(data);
  const rand = Math.floor(Math.random() * 1000000);
  applications[rand] = {
    name: req.body.answers.name,
    email: req.body.answers.email,
    phone: req.body.answers.phone,
    position: req.body.answers.pos,
    portfolio: req.body.answers.port,
  }

  fs.writeFileSync('applications.json', JSON.stringify(applications, null, 4));

  res.send('ok');
  res.end();
})

app.post('/api/v1/authip', (req, res) => {
  if (req.body.apikey == apikey) {
    authedIPS.push(req.body.ip);
    res.send('ok');
  }
})


app.get('/auth', (req, res) => {
  if(req.session.isAuthed) {
    res.redirect('/applications');
    return;
  }

  res.render('auth.ejs');
})

app.get('/applications', (req, res) => {
  if(req.session.isAuthed) {
    res.render('applications.ejs');
    return;
  }
  res.redirect('/auth');
})

app.get('/api/v1/applications', (req, res) => {
  if(req.session.isAuthed) {
    let data = fs.readFileSync('applications.json');
    let applications = JSON.parse(data);
    res.json(applications);
    return;
  } else {
    res.json({message: 'not ok'});
  }
})

app.get('/applications/:id', (req, res) => {

  let body = req.body;
  if (req.body.authed) {
    let id = req.params.id;
    let data = fs.readFileSync('applications.json');
    let applications = JSON.parse(data);
    let application = applications[id];
    res.render('application.ejs', { application });
    return;
  }

  res.send('not ok');
});


app.post('/api/v1/auth', (req, res) => {
  const { username, password, token } = req.body.data;

  console.log(req.body);

  const users = JSON.parse(fs.readFileSync('users.json'));
  const user = users[username];

  if (!user) {
    res.json({message: 'Invalid Username or Password'});
    return;
  }

  if (user.password !== password) {
    res.json({message: 'Invalid Username or Password'});
    return;
  }

  if (token) {
    const verified = speakeasy.totp.verify({
      secret: user.secret.base32,
      encoding: 'base32',
      token: token,
    });

    if (!verified) {
      res.json({message: 'Invalid 2FA token'});
      return;
    }
  }

  req.session.isAuthed = true;

  res.json({ message: "Authorized Successfully" })
})


app.post('/verify-2fa', (req, res) => {
  const userId = '1';
  const userToken = req.body.token;
  const secret = userSecrets[userId];


  if (secret) {
    const verified = speakeasy.totp.verify({
      secret: secret.base32,
      encoding: 'base32',
      token: userToken,
    });

    if (verified) {
      res.send('2FA successfully verified');
    } else {
      res.status(401).send('Invalid 2FA token');
    }
  } else {
    res.status(500).send('User secret not found');
  }
});



app.get('/register', (req, res) => {
  const authKey = req.query.auth;

  if (!authKey) {
    res.status(400).send('Missing auth parameter');
    return;
  }

  res.render('register.ejs', { authKey });
})

app.post('/register', (req, res) => {
  const authKey = req.body.data.auth;
  const username = req.body.data.username;
  const password = req.body.data.password;
  const email = req.body.data.email;

  console.log(req.body);

  console.log(authKey + '\n' + apikey)

  if(authKey !== apikey) return res.json({ err: 'Invalid auth key' });

  const secret = speakeasy.generateSecret({ length: 20 });

  const otpAuthUrl = `otpauth://totp/Nameless?secret=${secret.base32}&issuer=Nameless`

  let d = JSON.parse(fs.readFileSync('secrets.json'));

  d[username] = secret;
  fs.writeFileSync('secrets.json', JSON.stringify(d, null, 4));

  const user = new User(Math.floor(Math.random() * 1000000), username, email, password, secret).save();

  QRCode.toDataURL(otpAuthUrl, (err, data_url) => {
    if (err) {
      res.status(500).send('Error generating QR code');
    } else {
      res.json({ data_url, secret: secret.base32 });
    }
  })



})



app.listen(3000, () => {
  console.log("started on http://localhost:3000/");
});