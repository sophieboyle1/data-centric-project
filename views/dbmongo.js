const MongoClient = require('mongodb').MongoClient;

let db;
let coll;

// Connect to MongoDB.
MongoClient.connect('mongodb://127.0.0.1:27017', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(client => {
        db = client.db('proj2023MongoDB');
        coll = db.collection('managers');
    })
    .catch(error => {
        console.error('MongoDB Connection Error:', error);
    });

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

const addEmployee = function (id, nm, sal) {
    return new Promise((resolve, reject) => {
        const details = {
            _id: id,
            name: nm,
            salary: sal
        };
        coll.insertOne(details)
            .then(result => {
                resolve(result);
            })
            .catch(error => {
                reject(error);
            });
    });
};

module.exports = { findAll, addEmployee };
