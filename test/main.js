var io = require('socket.io-client');
var jsonfile = require('jsonfile');
var config = require('../config');
var numberOfRooms = 0;
var totalWaitTime = 0;
var sockets = [];
jsonfile.readFile(config.infoFile, function (err, infos) {

    for (var i = 0; i <= config.numberOfUser; i++) {
        const socket = io.connect(config.host);
        sockets.push(socket);
    }

    for (var j = 0; j <= config.numberOfUser; j++) {
        socket = sockets[j];
        const start = new Date();
        socket.emit('match', infos[j]);
        socket.on('chat start', function (room) {
            numberOfRooms++;
            const end = new Date();
            totalWaitTime = totalWaitTime + (end - start);
            console.log(numberOfRooms);
            console.log(totalWaitTime / numberOfRooms);
        });
    }
});
