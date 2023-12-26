// Import necessary modules
var express = require('express');
var os = require("os");
var mysql = require('mysql');

// Initialize Express app
var app = express();

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
    res.send('<h1>Managers</h1><br/><a href="/">Home</a>');
    // Implement MongoDB connection and fetch managers data
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

