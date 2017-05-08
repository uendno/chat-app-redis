var config = require('../config');
var async = require('async');
var _ = require('lodash');
var Promise = require('bluebird');
var xss = require('xss');
var options = config.xssOption;

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
 * @param redisClient
 * @param id socket id
 */
var removeUserFromQueue = function (redisClient, id) {

    return redisClient.hgetallAsync('user:' + id)
        .then(function (user) {
            if (!user) {
                return null;
            } else {
                var promises = [];
                promises.push(redisClient.delAsync('user:' + id));
                promises.push(redisClient.sremAsync('age:' + user.age, id));
                promises.push(redisClient.sremAsync('gender:' + user.gender, id));
                promises.push(redisClient.sremAsync('pref-age:' + user.preferredAge, id));
                promises.push(redisClient.sremAsync('pref-gender:' + user.preferredGender, id));

                return Promise.all(promises);
            }
        });

};

/**
 * Add user to the queue
 * @param redisClient
 * @param socketId
 * @param userInfo
 */
var addUserToQueue = function (redisClient, socketId, userInfo) {
    var promises = [
        redisClient.hmsetAsync('user:' + socketId, [
            "gender", xss(userInfo.gender, options),
            "age", xss(userInfo.age, options),
            "preferredGender", xss(userInfo.preferredGender, options),
            "preferredAge", xss(userInfo.preferredAge, options)
        ]),

        redisClient.saddAsync('age:' + getAgeRange(userInfo.age), socketId),

        redisClient.saddAsync('gender:' + userInfo.gender, socketId),

        redisClient.saddAsync("pref-age:" + userInfo.preferredAge, socketId),

        redisClient.saddAsync("pref-gender:" + userInfo.preferredGender, socketId)
    ];


    return Promise.all(promises)
};

/**
 * Get room of an user
 * @param redisClient
 * @param socketId
 * @returns {*}
 */
var getRoomOfUser = function (redisClient, socketId) {
    return redisClient.getAsync('room-of:' + socketId);
};

/**
 * Remove a room
 * @param redisClient
 * @param room
 * @param socketID
 */
var removeRoom = function (redisClient, room, socketID) {
    var peerID = room.split('#');
    peerID = peerID[0] === socketID ? peerID[1] : peerID[0];

    console.log("Removing: " + socketID + " " + peerID);

    var promises = [
        redisClient.delAsync(room),
        redisClient.delAsync("room-of:" + socketID),
        redisClient.delAsync("room-of:" + peerID)
    ];

    return Promise.all(promises);
};

/**
 * Find mate for a random user in the db
 * @param redisClient
 */
var findMateForARandomUser = function (redisClient, callback) {
    var userId = '';
    var mateId = '';
    var room = '';

    redisClient.keysAsync('user:*')
        .then(function (keys) {
            if (!keys || keys.length === 0) {
                return callback();
            }

            var index = 0;

            var find = function () {

                userId = _.split(keys[index], ':')[1];

                return redisClient.hgetallAsync(keys[index])
                    .then(function (user) {
                        if (!user) {
                            if ((index + 1) <= (keys.length - 1)) {
                                // find mate for next key
                                index = index + 1;
                                return find();
                            } else {
                                return callback();
                            }
                        }

                        // console.log("============================");
                        // console.log('age:' + user.preferredAge);
                        // console.log('gender:' + user.preferredGender);
                        // console.log('pref-age:' + getAgeRange(user.age));
                        // console.log('pref-gender:' + user.gender);

                        return redisClient.sinterAsync(
                            'age:' + user.preferredAge,
                            'gender:' + user.preferredGender,
                            'pref-age:' + getAgeRange(user.age),
                            'pref-gender:' + user.gender
                        )
                            .then(function (ids) {
                                // console.log("ids length = " + ids.length);
                                // console.log("=================================");
                                var possibleMateIds = _.filter(ids, function (id) {
                                    return id !== userId;
                                });

                                if (!possibleMateIds
                                    || possibleMateIds.length === 0) {
                                    if ((index + 1) <= (keys.length - 1)) {
                                        // find mate for next key
                                        index = index + 1;
                                        return find();
                                    } else {
                                        return callback();
                                    }
                                }

                                mateId = possibleMateIds[0];
                                var room = userId + "#" + mateId;

                                var promises = [];

                                promises.push(removeUserFromQueue(redisClient, userId));
                                promises.push(removeUserFromQueue(redisClient, mateId));
                                promises.push(redisClient.setAsync('room-of:' + userId, room));
                                promises.push(redisClient.setAsync('room-of:' + mateId, room));
                                promises.push(redisClient.saddAsync('room:' + room, [userId, mateId]));

                                return Promise.all(promises).then(function () {
                                    process.send({first: userId, second: mateId, room: room});
                                    return callback();
                                });
                            })
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
    findMateForARandomUser: findMateForARandomUser
};