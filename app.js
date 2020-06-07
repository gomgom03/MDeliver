const express = require("express");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser")
let app = express();
const port = process.env.PORT || 3000;

let users = [];

app.use(express.json());
app.use(cookieParser())
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));

let server = app.listen(port, () => {
    console.log(`Listening to port ${port}`)
})

app.get('/users', (req, res) => {
    res.send(users);
})

app.get('/', (req, res) => {
    res.render("home.ejs")
})

app.get('/login', (req, res) => {
    res.render("login.ejs")
})

app.get('/signup', (req, res) => {
    res.render("signup.ejs")
})

app.get('/contact', (req, res) => {
    res.render("contact.ejs")
})

app.get('/failure', (req, res) => {
    res.render("failure.ejs")
})

app.get('/app', (req, res) => {
    console.log(req.cookies);

    if (req.cookies.username == null) {
        res.redirect("/")

    } else {
        if (req.cookies.ddriver == 'true') {
            res.render("deliver.ejs")
        } else {
            res.render("order.ejs")
        }
    }

})

app.post('/userInfo', async (req, res) => {
    try {
        let { firstName, lastName, username, password, email, pNumber, ddriver } = req.body;
        ddriver = ddriver === "on";
        const salt = await bcrypt.genSalt(10);
        const pw = await bcrypt.hash(password, salt)
        users.push({ username: username, password: pw, firstName: firstName, lastName: lastName, email: email, number: pNumber, ddriver: ddriver })
        res.send("Success!");
    } catch (err) {
        res.status(500).redirect("/failure")
    }
})

app.post('/userAuth', async (req, res) => {

    let { username, password } = req.body;
    const user = users.find(x => x.username = username);
    console.log(user);
    if (user == null) {
        return res.status(400).send('Cannot find user')
    }
    try {

        if (await bcrypt.compare(password, user.password)) {
            let { firstName, lastName, email, number, ddriver } = user;
            res.cookie('username', username);
            res.cookie('firstName', firstName);
            res.cookie('lastName', lastName);
            res.cookie('email', email);
            res.cookie('number', number);
            res.cookie('ddriver', ddriver)
            res.send("Success!");

        } else {
            res.send("Login Error");
        }
    } catch (err) {
        res.status(500).redirect("/failure");
    }
})


const io = require('socket.io')(server);

const onlreqs = [];


io.on("connection", (socket) => {
    console.log(`New socket: ${socket.id}`);
    socket.on('clientRequest', (data) => {
        onlreqs.push(data)
    })
    socket.on('deliverRequest', () => {
        socket.emit('deliverResponse', onlreqs);
    })
    socket.on('deliverAcceptRequest', (data) => {
        for (let i = 0; i < onlreqs.length; i++) {
            data.uniVal === onlreqs[i].uniVal ? onlreqs.splice(i, 1) : null;

        }
    })
})