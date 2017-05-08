module.exports = {
    user: {
        MIN_AGE: 13,
        MAX_AGE: 99,
        AGE_RANGES: [
            {
                min: 13,
                max: 16
            },
            {
                min: 17,
                max: 18
            },
            {
                min: 19,
                max: 25
            },
            {
                min: 26,
                max: 35
            },
            {
                min: 36,
                max: 50
            },
            {
                min: 51,
                max: 99
            }
        ]
    },

    TASK_SCHEDULED_TIMER: 10,

    xssOption: {
        whiteList: [],
        stripIgnoreTags: true,
        stripIgnoreTagBody: ['script']
    },

    dbms: 'redis',
    numberOfUser: 10000,
    numberOfGeneratedInfos: 1000000,
    host: 'http://localhost:3000',
    infoFile: './test/info.json',
    mysql: {
        multipleStatements: true,
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'chat_app'
    }
};