const express = require('express');
const sql = require('mssql');
const {
  emailMessage,
  IsNullOrEmpty,
  sendRes,
  ObjectKeysValid,
  getEmailCode,
  sqlResultFormat,
  poolInputs,
  sqlSelectFormat,
  errorParams,
  deleteEmailCode,
  poolUpdateInputs,
  catchError,
  formatTime,
} = require('../../utils/utils');
const { getExcute, doExcute } = require('../../db/excument');

const router = express.Router();
//执行表
async function doTableData(sqlText, inputs) {
  const pool = await doExcute();
  poolInputs(pool, inputs);
  const result = sqlResultFormat(await pool.query(sqlText));
  return result;
}

//签到
router.post('/qiandao', async (req, res) => {
  try {
    let body = req.body;
    if (!ObjectKeysValid(body, ['user_ID'])) {
      errorParams(res);
      return;
    }
    let d = new Date();
    let date = formatTime(d, 'yyyy-MM-dd');
    let dateTime = formatTime(d);
    let checkData = sqlSelectFormat(
      await getExcute(`select top 1 ID from user_qiandao where user_ID='${body.user_ID}' and qd_date='${date}'`)
    );
    if (checkData.count > 0) {
      sendRes(res, -1, {}, '今日已签到');
      return;
    } else {
      //添加签到记录
      let result = await doTableData(`insert into user_qiandao(user_ID,qd_date,createTime) values(@p0,@p1,@p2)`, [
        body.user_ID,
        date,
        dateTime,
      ]);

      await doTableData(`update tod_user set jf_score=isnull(jf_score,0)+5 where user_ID=@p0`, [body.user_ID]);

      //积分明细
      await doTableData(`insert into score_subs(user_ID,score,createTime,subText) values(@p0,@p1,@p2,@p3)`, [
        body.user_ID,
        5,
        dateTime,
        '签到',
      ]);

      if (result.rowNum > 0) {
        let checkData = sqlSelectFormat(await getExcute(`select * from tod_user where user_ID='${body.user_ID}'`));
        sendRes(res, 0, checkData.data);
      } else {
        sendRes(res, -1, {}, '签到失败');
      }
    }
  } catch (e) {
    catchError(res, e);
  }
});

router.post('/getQiandaoHistory', async (req, res) => {
  try {
    let body = req.body || {};
    let flag = ObjectKeysValid(body, ['uID']);
    if (!flag) {
      errorParams(res);
      return;
    }

    let searchSql = `MONTH(createTime) = MONTH(GETDATE()) AND YEAR(createTime) = YEAR(GETDATE()) and user_ID=${body.uID}`;

    let checkData = sqlSelectFormat(
      await getExcute(`select * from user_qiandao where ${searchSql} order by createTime desc`)
    );

    if (checkData.success) {
      sendRes(res, 0, checkData.data);
    } else {
      sendRes(res, -1, {}, '未知错误');
    }
  } catch (e) {
    catchError(res, e);
  }
});

//获取积分明细
router.post('/getScore_subs', async (req, res) => {
  try {
    let body = req.body || {};
    let flag = ObjectKeysValid(body, ['size', 'page', 'uID']);
    if (!flag) {
      errorParams(res);
      return;
    }
    let size = body.size,
      page = body.page;

    let searchSql = '1=1';
    if (body.uID) {
      searchSql = `user_ID=${body.uID}`;
    }
    let checkData = sqlSelectFormat(
      await getExcute(
        `select * from score_subs where ${searchSql} order by createTime desc OFFSET ${
          size * (page - 1)
        } ROWS FETCH NEXT ${size} ROWS ONLY  `
      )
    );
    let pageData = sqlSelectFormat(await getExcute(`select count(*)as count  from score_subs where ${searchSql}`));
    if (checkData.success) {
      sendRes(res, 0, { data: checkData.data, count: pageData.data[0].count });
    } else {
      sendRes(res, -1, {}, '未知错误');
    }
  } catch (e) {
    catchError(res, e);
  }
});

module.exports = router;
