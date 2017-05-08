var createTablesIfNotExit = function (conn) {
    var query = 'CREATE TABLE IF NOT EXISTS user(' +
        'id VARCHAR(50) NOT NULL,' +
        'age int NOT NULL,' +
        'gender VARCHAR(6) NOT NULL,' +
        'preferAge VARCHAR(10) NOT NULL,' +
        'preferGender VARCHAR (6) NOT NULL,' +
        'room VARCHAR(50),' +
        'PRIMARY KEY (id)' +
        ');' +

        'CREATE TABLE IF NOT EXISTS ageRange(' +
        '`range` VARCHAR(10) NOT NULL,' +
        'userId VARCHAR(50) NOT NULL,' +
        'PRIMARY KEY (userId)' +
        ');' +

        'CREATE INDEX idx_ageRange_range ON ageRange (`range`(10));' +

        'CREATE TABLE IF NOT EXISTS gender(' +
        'gender VARCHAR(6) NOT NULL,' +
        'userId VARCHAR(50) NOT NULL,' +
        'PRIMARY KEY (userId)' +
        ');' +

        'CREATE INDEX idx_gender_gender ON gender (gender(6));' +

        'CREATE TABLE IF NOT EXISTS prefer_age(' +
        '`range` VARCHAR(10) NOT NULL,' +
        'userId VARCHAR(50) NOT NULL,' +
        'PRIMARY KEY (userId)' +
        ');' +

        'CREATE INDEX idx_prefer_age_range ON prefer_age (`range`(10));' +

        'CREATE TABLE IF NOT EXISTS prefer_gender(' +
        'gender VARCHAR(6) NOT NULL,' +
        'userId VARCHAR(50) NOT NULL,' +
        'PRIMARY KEY (userId)' +
        ');' +

        'CREATE INDEX idx_prefer_gender_gender ON prefer_gender (gender(6));' +

        'CREATE TABLE IF NOT EXISTS room(' +
        'id VARCHAR(50) NOT NULL,' +
        'first VARCHAR(50) NOT NULL,' +
        'second VARCHAR(50) NOT NULL,' +
        'PRIMARY KEY (id)' +
        ');';

    console.log(query);

    return conn.queryAsync(query);
};