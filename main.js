
// Imports not needed to doccument.

const express = require('express');
const app = express();
const fs = require('node:fs');

const QRCode = require('qrcode');

const speakeasy = require('speakeasy'); 

const session = require('express-session');

const bodyParser = require('body-parser');


// The user class that will create the account when created.
const { User } = require('./src/User');

/*
This is the session manager that will manage all sessions on the browser.
Doesnt save as cookies incase of the user's computer being compromised and the
cookies are stolen.
*/

app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true,
}));


let apikey = 'API-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
console.log(apikey);


/* 

Stores the Speakeasy 2FA Secrets before pushing to the file.
along with storing them for easy access.
*/
let userSecrets = {};


// Allows JSON Parsing for body during POST requests.
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


// Allows the public and views folder to be used as a static folder.
app.use(express.static('public'));
app.use(express.static('views'));

// Uses ExpressJS's view engine for html, similar to pug
app.set('view engine', 'ejs');


/*
The index page. When the user goes to the website 
the index.ejs file is rendered for the user to view.

imports request and response.
res.render renders an EJS file or the file format that is the view engine
*/
app.get('/', (req, res) => {
  res.render('index.ejs');
});


/*
Imports all the secrets for 2fa into the code.
*/
function loadSecrets() {
  let data = fs.readFileSync('secrets.json');
  userSecrets = JSON.parse(data);
}

loadSecrets();

/* 
The careers and apply page, Showcases the careers and submit applications.
*/
app.get('/careers', (req, res) => {
  res.render('careers.ejs');
})

app.get('/apply', (req, res) => {
  res.render('apply.ejs');
})


/* 
The apply api for submitting applications via /apply route.
*/
app.post('/api/v1/apply', (req, res) => {

  // Data is the applications it loads the applications.
  let data = fs.readFileSync('applications.json');
  // Parses the applications as JSON so it can be added to.
  let applications = JSON.parse(data);
  // Generates a random number for the ID up to 1,000,000 applications total.
  const rand = Math.floor(Math.random() * 1000000);
  // Saves the application gets the data from req.body which contains all the data sent to this route.
  applications[rand] = {
    name: req.body.answers.name,
    email: req.body.answers.email,
    phone: req.body.answers.phone,
    position: req.body.answers.pos,
    portfolio: req.body.answers.port,
    work: req.body.answers.work,
    addy: req.body.answers.addy,
  }
  /*
   First it parses the applications JSON with the new application added to it.
   Then it makes sure it has the spacing needed to look like proper json and readable without having to format the document.
   after that it writes to the applications.json file with the updated applications data. 
  */
  fs.writeFileSync('applications.json', JSON.stringify(applications, null, 4));


  // Tells the user that the application was submitted successfully.
  res.send('ok');
  res.end();
})


/* 
This stores the IP of the user who logs in. Incase of the user logging in from a diff location that is not recognized it will not allow the user to login without external help.
*/
app.post('/api/v1/authip', (req, res) => {
  if (req.body.apikey == apikey) {
    // Gets the IP of the user and adds it to the authedIPS array.
    authedIPS.push(req.body.ip);
    res.send('ok');
  }
})


/* 
The login page.

if the user is already authenticated it redirects them straight to the applications page. 
If they are not already authed then it redirects them to the login page.
*/
app.get('/auth', (req, res) => {
  if(req.session.isAuthed) {
    res.redirect('/applications');
    return;
  }

  res.render('auth.ejs');
})

/* 
Same as the explaination above but reversed
If the user is authed it will let them into the applications page.
If they are not then it sends them to the authentication page.
*/
app.get('/applications', (req, res) => {
  if(req.session.isAuthed) {
    res.render('applications.ejs');
    return;
  }
  res.redirect('/auth');
})

/*
This fetches the applications and returns it to the user if they are authed.
If they are not authed it hides the json for the applications preventing the personal data from being leaked.
*/

app.get('/api/v1/applications', (req, res) => {

  if(req.session.isAuthed) {
    let data = fs.readFileSync('applications.json'); // reads the file for the applications
    let applications = JSON.parse(data); // parses the applications as json
    res.json(applications); // returns the applications.
    return;
  } else {
    res.json({message: 'not ok'});
  }
})

// Gets the application by its ID and returns the data of it.
app.get('/applications/:id', (req, res) => {

  let body = req.body;
  if (req.body.authed) {
    // gets the ID from the url after the applications route ex. "fbla.leafytea.host/applications/41" the id of the app would be 41.
    let id = req.params.id; 
    let data = fs.readFileSync('applications.json');
    let applications = JSON.parse(data);
    let application = applications[id]; // gets the application by its ID.
    res.render('application.ejs', { application });
    return;
  }

  res.send('not ok');
});


/* 
This route is for authenticating the user. It checks the 2FA code from speakeasy
which can be linked to any authentication app or directly accessed from the /2fa
route with the passcode given at sign up.

Sign ups are only for people who work for the company and work as hiring managers.
*/
app.post('/api/v1/auth', (req, res) => {
  const { username, password, token } = req.body.data; // Gets the username, password and 2fa token.

  const users = JSON.parse(fs.readFileSync('users.json')); // gets the JSON data of the users.json file which stores all user data.
  const user = users[username]; // Singles out the user specified.

  if (!user) { // Checks if the user is a valid user and not just one thats typed randomly.
    res.json({message: 'Invalid Username or Password'});
    return;
  }

  if (user.password !== password) { // If the user is valid then it will check if the password equals the password of the user.
    res.json({message: 'Invalid Username or Password'});
    return;
  }

  if (token) { // If the username and password are correct then it checks if the token was specified. if it wasnt it just ignores and returns.
    const verified = speakeasy.totp.verify({ // This will verify the Time-based One Time Passcode and check if they are the same.
      secret: user.secret.base32, // grabs the users base32 secret key.
      encoding: 'base32',
      token: token,
    });


    if (!verified) { // Checks if the verified variable is false.
      res.json({message: 'Invalid 2FA token'});
      return;
    }
  } else {
    return res.json({ message: 'No 2FA Code specified.'})
  }

  // If everything is indeed valid and correct then it auths the user and tells the user they authorized successfully.

  req.session.isAuthed = true;

  res.json({ message: "Authorized Successfully" })
})


// Renders the 2fa page.
app.get('/2fa', (req, res) => {
  res.render('code.ejs')
})

// This api route returns the 2fa key to the user with the passcode.
app.post('/api/v1/2fa', (req,res) => {
  const { passcode } = req.body.data; // Gets the passcode the user presented.


  // Reads all the passcodes and what secrets are linked with them.
  const passcodes = JSON.parse(fs.readFileSync('passcodes.json'));

  // Checks if the passcode specified is valid or not.
  if(!passcodes[passcode]) {
    res.json({ otp: 'Invalid Passcode' })
    return;
  }

  let secret = passcodes[passcode].base32; // This will grab the base32 secret linked with the passcode.
  let otp = speakeasy.totp({ // This will get the code that is currently valid and works.
    secret: secret,
    encoding: 'base32'
  })
  res.json({ otp: otp }); // returns the one time passcode.
  return;
});


// This route verifies if the 2fa code is valid. This was used for testing purposes and was not removed. 
app.post('/verify-2fa', (req, res) => {
  const userId = '1';
  const userToken = req.body.token;
  const secret = userSecrets[userId];


  if (secret) {
    const verified = speakeasy.totp.verify({ // verifies if the 2fa code is the correct one.
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


// The register page. 
app.get('/register', (req, res) => {
  const authKey = req.query.auth; // the auth key that is specified whenever the program is rebooted or launched.

  if (!authKey) { // Checks if the auth key is specified or not.
    res.status(400).send('Missing auth parameter');
    return;
  }

  res.render('register.ejs', { authKey });
})

/* 
Creates the user based on the information provided.
*/

app.post('/register', (req, res) => {
  const authKey = req.body.data.auth;
  const username = req.body.data.username;
  const password = req.body.data.password;
  const email = req.body.data.email;

  if(authKey !== apikey) return res.json({ err: 'Invalid auth key' }); // Checks if the authKey is equal to the apikey (apikey and authkey are the same thing.)

  const secret = speakeasy.generateSecret({ length: 20 }); // This will generate a secret key for the user for them to use to manually imput into any authenticator app.

  const otpAuthUrl = `otpauth://totp/Nameless?secret=${secret.base32}&issuer=Nameless` // Generates a link for the QR code for when scanned with the authenicator app it puts into the app.

  let d = JSON.parse(fs.readFileSync('secrets.json')); // Reads the secrets.json file for storing the secrets. and then parses it as JSON.

  d[username] = secret; // creates the new user and adds their secret to it.
  fs.writeFileSync('secrets.json', JSON.stringify(d, null, 4)); // writes the new user to the secrets.json file.

  const user = new User(Math.floor(Math.random() * 1000000), username, email, password, secret).save(); // This will create the new user and save them to the users.json file.

  const passcode = Math.floor(Math.random() * 1000000) // Generates a new passcode for said secret.

  const passcodes = JSON.parse(fs.readFileSync('passcodes.json')); // Reads and parses the passcodes.json file.


  passcodes[passcode] = secret; // Sets the passcode as the owner of the secret.


  fs.writeFileSync('passcodes.json', JSON.stringify(passcodes, null, 4)) // Writes the passcodes.json to the json file.


  /* 
  And finally generates the QR code for the user to scan if there is no error then it will send the secret in base32, the passcode and the qr code image url.
  */
  QRCode.toDataURL(otpAuthUrl, (err, data_url) => {
    if (err) {
      res.status(500).send('Error generating QR code');
    } else {
      res.json({ data_url, secret: secret.base32, passcode: passcode });
    }
  })

})



// Listens on port 3001 and starts the webserver.
app.listen(3001, () => {
  console.log("started on http://localhost:3000/");
});