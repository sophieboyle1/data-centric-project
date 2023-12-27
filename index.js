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

app.get('/stores', (req, res) => {
    connection.query('SELECT * FROM store', (err, rows) => {
        if (err) {
            console.error('Error in MySQL query:', err);
            res.status(500).send('Error fetching stores data');
        } else {
            // Respond with the store data in JSON format
            res.json(rows);
        }
    });
});

app.get('/products', (req, res) => {
    res.send('<h1>Products</h1><br/><a href="/">Home</a>');
    // Implement the functionality to fetch and display products
});

app.get('/managers', (req, res) => {
    DatabaseMongo.findAll()
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

    DatabaseMongo.addEmployee(managerID, managerName, managerSalary)
        .then(() => {
            console.log('Manager added successfully');
            // Redirect or render a response
            var path = __dirname + '/views/addManager.ejs'; // Updated view file name
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

