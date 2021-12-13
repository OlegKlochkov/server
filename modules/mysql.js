const config = require('config')
const mysql = require('mysql2')

let mysqls = exports;

const pool = mysql.createPool({
    host: config.get('MYSQL_HOST'),
    user: config.get('MYSQL_USER'),
    database: config.get('MYSQL_DB_NAME'),
    password: config.get('MYSQL_PASS'),
    connectionLimit: config.get('MYSQL_ConnectionLimit'),
    //port: 3306,
    waitForConnections: config.get('MYSQL_waitForConnections'),
    queueLimit: config.get('MYSQL_queueLimit'),
    //timeout: config.get('MYSQL_Timeout')
});

mysqls.connect = function () {
    pool.getConnection(function (err, conn) {
        if (err) {
            return console.error("Ошибка: " + err.message);
        }
        else {
            console.log("Подключение к серверу MySQL успешно установлено");
        }
    })
};
mysqls.getTime = function () {
    let dateTime = new Date();
    return `${methods.digitFormat(dateTime.getHours())}:${methods.digitFormat(dateTime.getMinutes())}:${methods.digitFormat(dateTime.getSeconds())}`;
};

mysqls.executeQuery = async function (query, values, callback) {
    const preQuery = new Date().getTime();
    try {
        pool.getConnection(function (err, connection) {
            try {
                if (!err) {
                    connection.query({
                        sql: query,
                        timeout: 60000
                    }, values, function (err, rows, fields) {

                        try {
                            const postQuery = new Date().getTime();
                            methods.debug(query, `Async time: ${postQuery - preQuery}ms`);
                        }
                        catch (e) { }

                        try {
                            if (!err) {
                                if (callback)
                                    callback(null, rows, fields);
                            } else {
                                console.log("[DATABASE ASYNC | ERROR | " + mysql.getTime() + "]", query, err);
                                if (callback)
                                    callback(err);
                            }
                        }
                        catch (e) { }
                    });
                } else { console.log(err); return; }
                connection.release();
            }
            catch (e) {
                console.log(e);
            }
        });
    } catch (e) {
        /*setTimeout(function () {
            mysql.executeQuery(query, values, callback);
        }, 2000);*/
        console.log('DBERROR', e);
    }
};
