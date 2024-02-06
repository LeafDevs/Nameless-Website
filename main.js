const express = require('express');
const app = express();


app.use(express.static('public'));
app.use(express.static('views'));

app.set('view engine', 'ejs'); 

app.get('/', (req, res) => {
    res.render('index.ejs');
});


// app.get('/careers', (req, res) => {
//     res.render('careers.ejs');
// })

// app.get('/about', (req, res) => {
//     res.render('about.ejs');
// });

app.listen(3000, () => {
    console.log("started on http://localhost:3000/");
});