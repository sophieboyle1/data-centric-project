// sophie boyle
// G00410444
// https://github.com/sophieboyle1/data-centric-project

const express = require('express');
const { check, validationResult } = require('express-validator');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const { MongoClient, ReturnDocument } = require('mongodb');
const cors = require('cors');
const path = require('path');
const os = require("os"); // Added the os module
const app = express();

// Custom module for MongoDB operations
const dbmongo = require('./dbmongo');

// Set up EJS as the view engine
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

// homepage
app.get('/', (req, res) => {
    res.render('home');
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
    // Query the database for the store with the given SID
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

// Custom validation function for Manager ID
const validateManagerID = [
    // Check if Manager ID is 4 characters long
    check('mgrid').isLength({ min: 4, max: 4 }).withMessage('Manager ID must be 4 characters long'),

    // Check if Manager ID is not assigned to another Store
    check('mgrid').custom(async (value, { req }) => {
        const sid = req.params.sid;
        // Query your MySQL database to check if the Manager ID is assigned to another Store
        const queryResult = await new Promise((resolve, reject) => {
            connection.query('SELECT * FROM store WHERE mgrid = ? AND sid != ?', [value, sid], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
        if (queryResult.length > 0) {
            // Return a validation error with a custom message
            throw new Error('Manager ID is already assigned to another Store');
        }
    }),

    // Check if Manager ID exists in MongoDB
    check('mgrid').custom(async (value) => {
        // Query MongoDB to check if the Manager ID exists
        const manager = await dbmongo.findManagerByID(value);
        if (!manager) {
            throw new Error('Manager ID does not exist in MongoDB');
        }
    }),
];

// Edit store POST route
app.post('/stores/edit/:sid', [
    // Validation for location to ensure it has at least one character
    check('location').isLength({ min: 1 }).withMessage('Location must be at least 1 character.'),
    // Validation for Manager ID to ensure it's 4 characters long
    check('mgrid').isLength({ min: 4, max: 4 }).withMessage('Manager ID must be 4 characters long'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // If there are express-validator validation errors, render the 'editStore' page with error messages
        return res.render('editStore', {
            store: req.body, // Pass the submitted store details back for user correction
            errors: errors.array()
        });
    }

    // Additional validation to ensure Manager ID is not assigned to another store and exists in MongoDB
    try {
        const sid = req.params.sid;
        const { location, mgrid } = req.body;

        // Check if Manager ID is already assigned to another Store in SQL database
        const sqlQueryResult = await new Promise((resolve, reject) => {
            connection.query('SELECT * FROM store WHERE mgrid = ? AND sid != ?', [mgrid, sid], (err, rows) => {
                if (err) {
                    reject(err);
                } else if (rows.length > 0) {
                    reject(new Error('Manager ID is already assigned to another Store'));
                } else {
                    resolve(rows);
                }
            });
        });

        // Check if Manager ID exists in MongoDB
        const managerExists = await dbmongo.findManagerByID(mgrid);
        if (!managerExists) {
            throw new Error('Manager ID does not exist in MongoDB');
        }

        // If all validations pass, proceed with updating the store details in SQL database
        await new Promise((resolve, reject) => {
            connection.query('UPDATE store SET location = ?, mgrid = ? WHERE sid = ?', [location, mgrid, sid], (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });

        // If update is successful, redirect to the stores list
        res.redirect('/stores');

    } catch (error) {
        // If an error occurs, handle it by re-rendering the form with the error message
        console.error('Error updating store:', error);
        res.render('editStore', {
            store: req.body,
            errors: [{ msg: error.message }]
        });
    }
});

// products route
app.get('/products', (req, res) => {
    connection.query('SELECT p.pid, p.productdesc, s.sid, s.location, sct.Price FROM product p LEFT JOIN product_store sct ON p.pid = sct.pid LEFT JOIN store s ON sct.sid = s.sid;', (err, products) => {
        if (err) {
            console.error('Error fetching products:', err);
            res.status(500).send('Error fetching products data');
        } else {
            // Render the 'products.ejs' view with the products data
            res.render('products', { products });
        }
    });
});

// Delete product route
app.get("/products/delete/:pid", (req, res) => {
    const pid = req.params.pid;

    // SQL query to select the product from product_store table
    const selectQuery = 'SELECT * FROM product_store WHERE pid = ?';
    // Execute the query to check if the product is present in any store
    connection.query(selectQuery, [pid], (err, rows) => {
        if (err) {
            console.error('Error checking product:', err);
            res.status(500).send('Error during deletion process');
            return;
        }
        // Check if the product is not present in any store
        if (rows.length === 0) {
            const deleteQuery = 'DELETE FROM product WHERE pid = ?';
            connection.query(deleteQuery, [pid], (err, result) => {
                if (err) {
                    console.error('Error deleting product:', err);
                    res.status(500).send('Error during deletion process');
                } else {
                    res.redirect('/products');
                }
            });
        } else {
            res.send('<h1>Error Message</h1><br/><br/> <h1>' + pid + ' is currently in stores and cannot be deleted</h1> <a href="/">Home</a>');
        }
    });
});

// managers
app.get('/managers', (req, res) => {
    dbmongo.findAll()
        .then((managers) => {
            // Render the 'managers.ejs' view with the managers data
            res.render('managers', { managers });
        })
        .catch((error) => {
            console.error('Error fetching managers:', error);
            res.status(500).send('Error fetching managers');
        });
});

app.get('/managers/add', (req, res) => {
    res.render('addManager', { errors: [] });
    var path = __dirname + '/views/addManager.ejs'; // Updated view file name
    console.log(path);
    res.render(path);
});

app.post('/managers/add/add', [
    check('managerID')
        .trim()
        .isLength({ min: 4, max: 4 }).withMessage('Manager ID must be 4 characters'),
    check('managerName')
        .trim()
        .isLength({ min: 5 }).withMessage('Name must be at least 5 characters'),
    check('managerSalary')
        .isFloat({ min: 30000, max: 70000 }).withMessage('Salary must be between 30,000 and 70,000')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('addManager', {
            errors: errors.array(),
            managerID: req.body.managerID,
            managerName: req.body.managerName,
            managerSalary: req.body.managerSalary
        });
    }

    try {
        // Attempt to add the new manager
        await dbmongo.addEmployee(req.body.managerID, req.body.managerName, req.body.managerSalary);
        res.redirect('/managers');
    } catch (error) {
        // Handle the error
        res.render('addManager', {
            errors: [{ msg: error.message }],
            managerID: req.body.managerID,
            managerName: req.body.managerName,
            managerSalary: req.body.managerSalary
        });
    }
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

