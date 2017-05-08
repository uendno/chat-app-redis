var config = require('../config');
var async = require('async');
var _ = require('lodash');
var Promise = require('bluebird');
var xss = require('xss');
var options = config.xssOption;


var createTablesIfNotExit = function (conn) {
    var query = 'CREATE TABLE IF NOT EXISTS user(' +
        'id VARCHAR(50) NOT NULL,' +
        'age int NOT NULL,' +
        'ageRange VARCHAR(10) NOT NULL,' +
        'gender VARCHAR(6) NOT NULL,' +
        'preferAge VARCHAR(10) NOT NULL,' +
        'preferGender VARCHAR (6) NOT NULL,' +
        'PRIMARY KEY (id)' +
        ');' +

        'CREATE INDEX idx_user_age_range ON user (`ageRange`(10));' +
        'CREATE INDEX idx_user_gender ON user (`gender`(6));' +
        'CREATE INDEX idx_user_prefer_range ON user (`preferAge`(10));' +
        'CREATE INDEX idx_user_prefer_gender ON user (`preferGender`(6));' +

        'CREATE TABLE IF NOT EXISTS user_in_room(' +
        'id VARCHAR(50) NOT NULL,' +
        'room VARCHAR(50) NOT NUll,' +
        'PRIMARY KEY (id)' +
        ');';
    console.log(query);

    return conn.queryAsync(query);
};

var cleanTables = function (conn) {
    return conn.queryAsync('TRUNCATE TABLE user; TRUNCATE TABLE user_in_room;');
};

/**
 * Find age range for an age. Ranges are defined in config.js
 * @param age {string}
 * @returns {string} range of the age
 */
var getAgeRange = function (age) {
    var ageRanges = config.user.AGE_RANGES;
    var result = '';
    ageRanges.forEach(function (range) {
        var proAge = Number(age);

        if (proAge >= range.min && proAge <= range.max) {
            result = range.min + " - " + range.max;
        }
    });

    return result;
};

/**
 * Remove an user from the queue. Delete hash, age range, gender, preferred age rage and preferred gender in redis
 * @param conn
 * @param id socket id
 */
var removeUserFromQueue = function (conn, id) {
    return conn.queryAsync('DELETE FROM user WHERE id=?', [id])
};

/**
 * Add user to the queue
 * @param conn
 * @param socketId
 * @param userInfo
 */
var addUserToQueue = function (conn, socketId, userInfo) {
    const ageRange = getAgeRange(userInfo.age);

    return conn.queryAsync('INSERT INTO user (id, age, ageRange, gender, preferAge, preferGender) values(?, ?, ?, ? ,?, ?)', [socketId, userInfo.age, ageRange, userInfo.gender, userInfo.preferredAge, userInfo.preferredGender]);

};

/**
 * Get room of an user
 * @param conn
 * @param socketId
 * @returns {*}
 */
var getRoomOfUser = function (conn, socketId) {
    return conn.queryAsync('SELECT room FROM user_in_room WHERE id=?', [socketId])
        .then(function (res) {
            if (res.length === 0) {
                return null
            } else {
                return res[0].room;
            }
        })
};

/**
 * Remove a room
 * @param conn
 * @param room
 * @param socketID
 */
var removeRoom = function (conn, room, socketID) {
    var peerID = room.split('#');
    peerID = peerID[0] === socketID ? peerID[1] : peerID[0];

    var promises = [
        conn.queryAsync('DELETE FROM user_in_room WHERE id=?', [socketID]),
        conn.queryAsync('DELETE FROM user_in_room WHERE id=?', [peerID])
    ];

    return Promise.all(promises);
};

/**
 * Find mate for a random user in the db
 * @param conn
 * @param callback
 */
var findMateForARandomUser = function (conn, callback) {
    var userId = '';
    var user = '';
    var mateId = '';
    var room = '';

    conn.queryAsync('SELECT * FROM user')
        .then(function (users) {
            if (!users || users.length === 0) {
                return callback();
            }

            var index = 0;

            var find = function () {
                user = users[index];
                userId = user.id;

                return conn.queryAsync('SELECT * FROM user WHERE id != ? AND ageRange = ? AND gender = ? AND preferAge = ? AND preferGender = ?', [userId, user.preferAge, user.preferGender, user.ageRange, user.gender])
                    .then(function (mates) {
                        if (mates.length === 0) {
                            if ((index + 1) <= (users.length - 1)) {
                                // find mate for next key
                                index = index + 1;
                                return find();
                            } else {
                                return callback();
                            }
                        }
                        //
                        // console.log("======================");
                        // console.log(mates[0].preferAge + " " + user.ageRange);
                        // console.log(mates[0].preferGender + " " + user.gender);
                        // console.log(mates[0].ageRange + " " + user.preferAge);
                        // console.log(mates[0].gender + " " + user.preferGender);
                        // console.log("======================");

                        mateId = mates[0].id;
                        var room = userId + "#" + mateId;

                        var promises = [
                            removeUserFromQueue(conn, userId),
                            removeUserFromQueue(conn, mateId),
                            conn.queryAsync('INSERT INTO user_in_room values(?, ?)', [userId, room]),
                            conn.queryAsync('INSERT INTO user_in_room values(?, ?)', [mateId, room])
                        ];

                        return Promise.all(promises).then(function () {
                            process.send({first: userId, second: mateId, room: room});
                            return callback();
                        });
                    })

            };

            // Find mate for first key
            return find();

        });
};

module.exports = {
    getAgeRange: getAgeRange,
    removeUserFromQueue: removeUserFromQueue,
    addUserToQueue: addUserToQueue,
    getRoomOfUser: getRoomOfUser,
    removeRoom: removeRoom,
    findMateForARandomUser: findMateForARandomUser,
    createTablesIfNotExit: createTablesIfNotExit,
    cleanTables: cleanTables
};