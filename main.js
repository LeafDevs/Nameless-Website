const express = require('express');
const app = express();
const fs = require('node:fs');

const { users, User } = require('./src/User');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const bodyParser = require('body-parser');

const authedIPS = [];


exports.requireToken = (req, res, next) => {
  const { token } = req.body;
  // Find the user with the given email address
  const user = users.find(u => u.email === req.user.email);
  // Verify the user's token
  const verified = speakeasy.totp.verify({
    secret: user.secret,
    encoding: 'base32',
    token,
    window: 1
  });
  if (!verified) {
    return res.status(401).send('Invalid token');
  }
  // Token is valid, proceed to the next middleware or route handler
  next();
}



let apikey = 'API-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

console.log(apikey);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static('public'));
app.use(express.static('views'));

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.render('index.ejs');
});


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
  if (req.ip in authedIPS) return res.redirect('/applications/');
  res.render('auth.ejs');
})

app.get('/applications/:id', exports.requireToken, (req, res) => {

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
  console.log(req.body)
  if (req.body.data.username === 'admin' && req.body.data.password === 'admin') {
    let html = fs.readFileSync('application.html');
    let data = fs.readFileSync('applications.json');
    let applications = JSON.parse(data);
    console.log(applications);
    console.log(applications[req.body.data.id]);
    let application = applications[req.body.data.id]
    console.log(application);
    html = html.toString().replace('{name}', application.name);
    html = html.toString().replace('{email}', application.email);
    html = html.toString().replace('{phone}', application.phone);
    html = html.toString().replace('{position}', application.position);
    html = html.toString().replace('{portfolio}', application.portfolio);


    let body = {
      html: html,
      authed: true,
      success: true,
      ip: req.ip,
      id: req.body.id,
      username: req.body.username,
      password: req.body.password,
      port: req.body.port,
      pos: req.body.pos,
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      answers: req.body.answers,
    }

    console.log(body);

    res.json(body);

  } else {
    res.json({ success: false })
  }
})




// app.get('/about', (req, res) => {
//     res.render('about.ejs');
// });



app.get('/register', (req, res) => {
  const authKey = req.query.auth;

  if (!authKey) {
    res.status(400).send('Missing auth parameter');
    return;
  }

  res.render('register.ejs', { authKey });
})


app.post('/register', (req, res) => {
  const { name, email, password, auth } = req.body.data;
  

  if (auth != apikey) {
    res.status(401).send('Invalid Authorization')
  }
  console.log(name)
  console.log(req.body)


  const secret = speakeasy.generateSecret({ length: 20 });
  // Save the user data in the database
  const user = new User(users.length + 1, name, email, password, secret.base32);
  users.push(user);
  console.log(users)
  // Generate a QR code for the user to scan
  QRCode.toDataURL(secret.otpauth_url, (err, image_data) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Internal Server Error');
    }
    // Send the QR code to the user
    res.send({ qrCode: image_data });
  });
  fs.writeFileSync('users.json', JSON.stringify(users, null, 4));
});

app.post('/login', (req, res) => {
  const { email, password, token } = req.body;
  // Find the user with the given email address
  const user = users.find(u => u.email === email);
  // Validate the user's credentials
  if (!user || user.password !== password) {
    return res.json({ err: 'Invalid credentials'});
  }
  // Verify the user's token
  const verified = speakeasy.totp.verify({
    secret: user.secret,
    encoding: 'base32',
    token,
    window: 1
  });
  if (!verified) {
    return res.json({ err: 'Invalid token'});
  }
  // User is authenticated
  res.send('Login successful');
});






app.listen(3000, () => {
  console.log("started on http://localhost:3000/");
});