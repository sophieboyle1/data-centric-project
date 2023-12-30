const MongoClient = require('mongodb').MongoClient;

// Variables to store database and collection references
let db;
let coll;

// Connect to MongoDB.
MongoClient.connect('mongodb://127.0.0.1:27017', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(client => {
        // On successful connection, set db to the specific database and coll to the managers collection
        db = client.db('proj2023MongoDB');
        coll = db.collection('managers');
    })
    .catch(error => {
        console.error('MongoDB Connection Error:', error);
    });
// Function to find all managers in the collection
const findAll = function () {
    return new Promise((resolve, reject) => {
        coll.find().toArray()
            .then(documents => {
                resolve(documents);
            })
            .catch(error => {
                reject(error);
            });
    });
};

const addEmployee = async function (id, nm, sal) {
    // Check if the manager already exists
    const managerExists = await coll.findOne({ _id: id });
    if (managerExists) {
        throw new Error('Manager ID already exists');
    }
    // Insert the new manager document
    return coll.insertOne({
        _id: id,
        name: nm,
        salary: parseFloat(sal)
    });
};

// Async function to find a manager by ID.
const findManagerByID = async function (managerID) {
    // Retrieve a manager document using the manager ID
    const manager = await coll.findOne({ _id: managerID });
    return manager;
};
// Exporting functions
module.exports = { findAll, addEmployee, findManagerByID };