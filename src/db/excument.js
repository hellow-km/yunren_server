const sql = require('mssql');
const config = require('../config/config');
const { loggers } = require('winston');
const { writeLog, formatTime } = require('../utils/utils');

//查询语句
async function getExcute(sqltext) {
  try {
    let text = sqltext.toLocaleLowerCase();
    if (text.indexOf('select') == 0) {
      if (text.indexOf('insert') > -1 || text.indexOf('update') > -1 || text.indexOf('delete') > -1) {
        return { code: -1 };
      }
    }
    config.env === 'development' && console.log('sqltext', sqltext);
    writeLog(`\n${formatTime(new Date())} [${sqltext}]`);
    return new Promise((resolve) => {
      sql.connect(config.sqlserver, async (err) => {
        if (err) {
          console.log(err);
          return resolve({ code: -1 });
        }
        sql.query(sqltext).then(
          (data) => {
            resolve({ code: 0, data });
          },
          (err) => {
            resolve({ code: -1 });
          }
        );
      });
    });
  } catch (e) {
    return Promise.resolve({ code: -1 });
  }
}

//执行语句
async function doExcute() {
  const pool = await sql.connect(config.sqlserver, async (err) => {
    if (err) {
      console.log('doExcute', err);
      return { code: -1 };
    }
  });
  return pool.request();
}

module.exports = {
  getExcute,
  doExcute,
};
