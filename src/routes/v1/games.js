const {
  emailMessage,
  sendRes,
  ObjectKeysValid,
  setEmailCode,
  formatMilliseconds,
  emailUseTime,
  sqlResultFormat,
  sqlSelectFormat,
  errorParams,
  catchError,
  joinDir,
  formatTime,
  getFilepathIdentify,
  createFolder,
  poolInputs,
} = require('../../utils/utils');
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const formidable = require('formidable');

const { getExcute, doExcute } = require('../../db/excument');
const config = require('../../config/config');

//执行表
async function doTableData(sqlText, inputs) {
  const pool = await doExcute();
  poolInputs(pool, inputs);
  const result = sqlResultFormat(await pool.query(sqlText));
  return result;
}

//获取首页排行
router.post('/getHotGames', async (req, res) => {
  try {
    let checkData = sqlSelectFormat(await getExcute(`select top 10 * from games order by clickNum desc`));
    if (checkData.success) {
      sendRes(res, 0, checkData.data);
    } else {
      sendRes(res, -1, {}, '未知错误');
    }
  } catch (e) {
    catchError(res, e);
  }
});

//获取首页排行
router.post('/clickGames', async (req, res) => {
  try {
    let body = req.body || {};
    let flag = ObjectKeysValid(body, ['name']);
    if (!flag) {
      errorParams(res);
      return;
    }
    let checkData = sqlSelectFormat(await getExcute(`select * from games where gameName='${body.name}'`));
    if (checkData.success) {
      if (checkData.count > 0) {
        await doTableData(`update games set clickNum=isnull(clickNum,0)+1 where gameName=@p0`, [body.name]);
      } else {
        await doTableData(`insert into games(gameName,clickNum) values(@p0,@p1)`, [body.name, 1]);
      }
      sendRes(res, 0, {});
    } else {
      sendRes(res, -1, {}, '未知错误');
    }
  } catch (e) {
    catchError(res, e);
  }
});

module.exports = router;
