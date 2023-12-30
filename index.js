const express = require('express');
const { check, validationResult } = require('express-validator');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const { MongoClient, ReturnDocument } = require('mongodb');
const cors = require('cors');
const path = require('path');
const os = require("os"); // Added the os module
const app = express();

const dbmongo = require('./dbmongo');

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

// Middleware to count and log requests
app.use((req, res, next) => {
    req.requests_counter = (req.requests_counter || 0) + 1;
    console.log('Request number:', req.requests_counter, 'from:', os.hostname());
    next();
});

// MySQL Database Connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'proj2023'
});

// Connect to MySQL database
connection.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL');
});

// Define routes
app.get('/', (req, res) => {
    res.send('<ul><li><a href="/stores">Stores</a></li><li><a href="/products">Products</a></li><li><a href="/managers">Managers (Mongo DB)</a></li></ul>');
});

// Stores
app.get('/stores', (req, res) => {
    connection.query('SELECT * FROM store', (err, rows) => {
        if (err) {
            console.error('Error in MySQL query:', err);
            res.status(500).send('Error fetching stores data');
        } else {
            // Render the 'stores.ejs' view with the stores data
            res.render('stores', { stores: rows });
        }
    });
});

// Edit store
app.get('/stores/edit/:sid', (req, res) => {
    const sid = req.params.sid;
    connection.query('SELECT * FROM store WHERE sid = ?', [sid], (err, rows) => {
        if (err) {
            console.error('Error fetching store:', err);
            res.status(500).send('Error fetching store');
            return;
        }
        if (rows.length) {
            res.render('editStore', { store: rows[0], errors: null });
        } else {
            res.status(404).send('Store not found');
        }
    });
});

app.post('/stores/edit/:sid', (req, res) => {
    const { location, mgrid } = req.body;
    const sid = req.params.sid;
    let errors = [];

    // Validate the location field
    if (!location || location.length < 1) {
        errors.push({ msg: 'Location must be at least 1 character.' });
    }

    // If there are any errors, re-render the form with the errors and current input values
    if (errors.length > 0) {
        res.render('editStore', { 
            store: { sid, location, mgrid }, 
            errors: errors 
        });
    } else {
        // No errors, proceed with updating the store in the database
        connection.query(
            'UPDATE store SET location = ?, mgrid = ? WHERE sid = ?',
            [location, mgrid, sid],
            (err, result) => {
                if (err) {
                    // If an error occurs when updating the database, log it and send a server error response
                    console.error('Error updating store:', err);
                    res.status(500).send('Error updating store');
                } else {
                    // If update is successful, redirect to the stores list
                    res.redirect('/stores');
                }
            }
        );
    }
});

// products 
app.get('/products', (req, res) => {
    res.send('<h1>Products</h1><br/><a href="/">Home</a>');
    // Implement the functionality to fetch and display products
});


// managers
app.get('/managers', (req, res) => {
    dbmongo.findAll()
        .then((data)=>{
            // array = data
            html = '<link rel="stylesheet" type="text/css" href="../css/index.css"/><h1>Managers</h1> <a href="/managers/add">Add Manager (MongoDB)</a> <table border="1" cellspacing="0"><tr><th>Manager ID</th><th>Name</th><th>Salary</th>'
            var dataLength = data.length;

            for(var i = 0; i < dataLength; i++) {
                html = html + '<tr><td>' + data[i]['_id'] + '</td> <td>' + data[i]['name'] + '</td> <td>' + data[i]['salary'] + '</td></tr>'
            }
            html = html + '</table> <a href="/">Home</a>'
            res.send(html)
        })    
})

app.get('/managers/add', (req, res) => {
    var path = __dirname + '/views/addManager.ejs'; // Updated view file name
    console.log(path);
    res.render(path);
});

app.post("/managers/add/add", (req, res) => {
    // Access form data using the new input names
    const managerID = req.body.managerID;
    const managerName = req.body.managerName;
    const managerSalary = req.body.managerSalary;

    dbmongo.addEmployee(managerID, managerName, managerSalary)
        .then(() => {
            console.log('Manager added successfully');
            // Redirect or render a response
            var path = __dirname + '/views/addManager.ejs';
            res.render(path);
        })
        .catch((error) => {
            console.error('Error adding manager:', error);
            // Handle the error and render an appropriate response
            res.status(500).send('Error adding manager');
        });
});


// Start the server
app.listen(3000, () => {
    console.log('Server is listening on port 3000');
});

// Handle proper shutdown of the server
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    connection.end(err => {
        if (err) console.error('Error closing MySQL connection:', err);
        console.log('MySQL connection closed.');
        process.exit(0);
    });
});

