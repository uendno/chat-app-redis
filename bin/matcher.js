/**
 * Created by uendno on 5/4/17.
 */
var Promise = require('bluebird');
var redis = Promise.promisifyAll(require('redis'));
var mysql = Promise.promisifyAll(require('mysql'));
var async = require('async');
var config = require('../config');
var dbHelper;
var conn;

if (config.dbms === 'redis') {
    conn = redis.createClient(process.env.REDIS_URL);
    dbHelper = require('../helpers/redis');
    conn.flushdb(function (err, succeeded) {
        refillQueue();
    });
} else {
    conn = Promise.promisifyAll(mysql.createConnection(config.mysql));
    dbHelper = require('../helpers/mysql');
    conn.connect();
    dbHelper.createTablesIfNotExit(conn)
        .then(function () {
            return dbHelper.cleanTables(conn);
        })
        .then(function () {
            refillQueue();
        })
        .catch(function (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
                dbHelper.cleanTables(conn).then(function () {
                    refillQueue();
                })
            } else {
                console.error(error);
            }
        })
}

var findMateForARandomUser = dbHelper.findMateForARandomUser;

var task = function (callback) {
    findMateForARandomUser(conn, callback);
};

var runTask = function (task, callback) {
    task(callback);
};
var queue = async.queue(runTask, 1);
var refillQueue = function () {
    queue.push(task);
};
queue.drain = function () {
    setTimeout(refillQueue, config.TASK_SCHEDULED_TIMER);
};


