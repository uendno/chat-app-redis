var jsonfile = require('jsonfile');
var config = require('../config');
var genders = ['male', 'female'];
var preferredAges = require('../config').user.AGE_RANGES;
var infos = [];


for (var i = 0; i <= config.numberOfGeneratedInfos; i++) {
    const age = Math.floor(Math.random() * 21) + 13;
    const gender = genders[Math.floor(Math.random() * 2)];
    const preferredAgeObject = preferredAges[Math.floor(Math.random() * (preferredAges.length))];
    const preferredAge = preferredAgeObject.min + " - " + preferredAgeObject.max;
    const preferredGender = genders[Math.floor(Math.random() * 2)];
    const info = {
        gender: gender,
        age: age + "",
        preferredGender: preferredGender,
        preferredAge: preferredAge
    };

    infos.push(info)
}

jsonfile.writeFile(config.infoFile, infos, {}, function (err) {
    console.log('DONE');
});

