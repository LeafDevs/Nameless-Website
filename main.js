const express = require('express');
const app = express();
const fs = require('node:fs');

const bodyParser = require('body-parser');

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


app.get('/auth', (req, res) => {
    res.render('auth.ejs');
})

app.get('/applications/:id', (req, res) => {

    let body = req.body;
    if(req.body.authed) {
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
    if(req.body.data.username === 'admin' && req.body.data.password === 'admin') {
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
        res.json({success: false})
    }
})




// app.get('/about', (req, res) => {
//     res.render('about.ejs');
// });

app.listen(3000, () => {
    console.log("started on http://localhost:3000/");
});