var Promise = require('bluebird');
var redis = Promise.promisifyAll(require('redis'));
var mysql = Promise.promisifyAll(require('mysql'));
var util = require('util');
var config = require('../config');
var async = require('async');
var xss = require('xss');
var cluster = require('cluster');
var dbHelper;
var conn;

if (config.dbms === 'redis') {
    conn = redis.createClient(process.env.REDIS_URL);
    dbHelper = require('../helpers/redis');
} else {
    conn = Promise.promisifyAll(mysql.createConnection(config.mysql));
    dbHelper = require('../helpers/mysql');
    conn.connect();
}

var removeUserFromQueue = dbHelper.removeUserFromQueue;
var addUserToQueue = dbHelper.addUserToQueue;
var getRoomOfUser = dbHelper.getRoomOfUser;
var removeRoom = dbHelper.removeRoom;

var options = config.xssOption;

module.exports = function (server) {
    // socket.io
    var io = require('socket.io')(server);

    io.on('connection', function (socket) {

        socket.on('disconnect', function () {
            console.log('user disconnected');

            Promise.all([
                removeUserFromQueue(conn, socket.id),
                getRoomOfUser(conn, socket.id).then(function (room) {

                    if (!room) {
                        return;
                    }

                    return removeRoom(conn, room, socket.id).then(function () {
                        return socket.broadcast.to(room).emit('chat end');
                    })
                })
            ]).catch(function (error) {
                return socket.emit('error', error);
            })

        });

        socket.on('match', function (userInfo) {
            getRoomOfUser(conn, socket.id)
                .then(function (room) {

                    if (!room) {
                        return addUserToQueue(conn, socket.id, userInfo);
                    } else {
                        removeRoom(conn, room, socket.id).then(function () {
                            socket.broadcast.to(room).emit('chat end');
                            return addUserToQueue(conn, socket.id, userInfo);
                        })

                    }
                })
                .catch(function (error) {
                    return socket.emit('error', error);
                })
            ;
        });

        socket.on('chat message', function (message) {
            getRoomOfUser(conn, socket.id)
                .then(function (room) {
                    socket.broadcast.to(room).emit('chat message', xss(message, options));
                })
                .catch(function (error) {
                    return socket.emit('error', error);
                })
        });

        socket.on('leave room', function () {
            getRoomOfUser(conn, socket.id)
                .then(function () {

                    return removeRoom(conn, room, socket.id).then(function () {
                        return socket.broadcast.to(room).emit('chat end');
                    })
                })
                .catch(function (error) {
                    socket.emit('error', error);
                });
        });
    });

    cluster.workers[1].on('message', function (data) {
        var socket1 = io.sockets.connected[data.first];
        var socket2 = io.sockets.connected[data.second];

        if (socket1 && socket2) {
            socket1.join(data.room);
            socket2.join(data.room);

            socket1.emit('chat start', {
                room: data.room,
                mate: data.second
            });

            socket2.emit('chat start', {
                room: data.room,
                mate: data.first
            });
        }

    });

    // redis
    conn.on("error", function (err) {
        console.log("Redis error: " + err);
    });
};