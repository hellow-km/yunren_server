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
} = require('../../utils/utils');
const { getExcute, doExcute } = require('../../db/excument');

const router = express.Router();

//文章添加评论
router.post('/insertCommit', async (req, res) => {
  try {
    let body = req.body || {};

    let flag = ObjectKeysValid(body, ['commitContent', 'article_ID', 'user_ID', 'isRoot']);
    if (!flag) {
      errorParams(res);
      return;
    }

    const pool = await doExcute();
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    let inputs = [
      body.user_ID,
      body.toCommit_ID || null,
      body.commitContent,
      ip,
      body.article_ID,
      0,
      body.rootCommit_ID || null,
      body.toUserNick || null,
      body.toUserID || null,
      body.userNick || null,
      0,
      0,
      false,
      body.userAvatar || null,
      body.toUserAvatar || null,
      body.isRoot,
    ];
    let inputStr = poolInputs(pool, inputs);
    const result = sqlResultFormat(
      await pool.query(
        `insert into article_commit(user_ID,toCommit_ID,commitContent,ip,article_ID,goodNum,rootCommit_ID,toUserNick,toUserID,userNick,upNum,downNum,isTop,userAvatar,toUserAvatar,isRoot,createTime)values(${inputStr},getdate())`
      )
    );
    if (result.rowNum > 0) {
      sendRes(res, 0, {}, '评论成功');
    } else {
      sendRes(res, -1, [], '评论失败');
    }
  } catch (e) {
    catchError(res, e);
  }
});

//点赞评论
router.post('/upOrDownCommit', async (req, res) => {
  try {
    let body = req.body || {};

    let flag = ObjectKeysValid(body, ['cID', 'uID', 'isLike']);
    if (!flag) {
      errorParams(res);
      return;
    }
    let checkData = sqlSelectFormat(
      await getExcute(
        `select isnull(upUser_IDs,'')as upUser_IDs,isnull(downUser_IDs,'')as downUser_IDs from article_commit where commit_ID=${body.cID}`
      )
    );
    let resStr = '';
    if (checkData.success) {
      const pool = await doExcute();

      let data = checkData.data[0];
      const strUID = body.uID.toString();
      if (body.isLike) {
        //点赞
        let ups = [];
        if (data.upUser_IDs) {
          ups = data.upUser_IDs.split(',');
        }
        let idIndex = ups.indexOf(strUID);
        let plusStr = '';
        if (idIndex > -1) {
          resStr = '取消点赞成功';
          ups.splice(idIndex, 1);
          plusStr = '-1';
        } else {
          plusStr = '+1';
          resStr = '点赞成功';
          ups.push(strUID);
        }
        let inputs = [ups.join(','), body.cID];
        let inputStr = poolInputs(pool, inputs);
        const result = sqlResultFormat(
          await pool.query(`update article_commit set upUser_IDs=@p0,upNum=isnull(upNum,0)${plusStr} where commit_ID=@p1`)
        );
        if (result.rowNum > 0) {
          sendRes(res, 0, { ups }, resStr);
        } else {
          sendRes(res, -1, {}, '请求失败');
        }
      } else {
        //点踩
        let downs = [];
        if (data.downUser_IDs) {
          downs = data.downUser_IDs.split(',');
        }
        let idIndex = downs.indexOf(strUID);
        let plusStr = '';
        if (idIndex > -1) {
          resStr = '取消点踩成功';
          downs.splice(idIndex, 1);
          plusStr = '-1';
        } else {
          resStr = '点踩成功';
          plusStr = '+1';
          downs.push(strUID);
        }
        let inputs = [downs.join(','), body.cID];
        let inputStr = poolInputs(pool, inputs);
        const result = sqlResultFormat(
          await pool.query(
            `update article_commit set downUser_IDs=@p0,downNum=isnull(downNum,0)${plusStr} where commit_ID=@p1`
          )
        );
        if (result.rowNum > 0) {
          sendRes(res, 0, { downs }, resStr);
        } else {
          sendRes(res, -1, {}, '请求失败');
        }
      }
    } else {
      sendRes(res, -1, {}, '出错了');
    }
  } catch (e) {
    catchError(res, e);
  }
});

//获取文章评论
router.post('/getCommit', async (req, res) => {
  try {
    let body = req.body || {};

    let flag = ObjectKeysValid(body, ['aID']);
    if (!flag) {
      errorParams(res);
      return;
    }
    let checkData = sqlSelectFormat(
      await getExcute(
        `select *,(select avartar from tod_user where user_ID=a.user_ID)as realAvatar,(select nickName from tod_user where user_ID=a.user_ID)as realNickName from article_commit as a where article_ID=${body.aID} order by isTop desc,isRoot desc, upNum DESC, createTime asc`
      )
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

//获取文章评论
router.post('/deleteCommit', async (req, res) => {
  try {
    let body = req.body || {};

    let flag = ObjectKeysValid(body, ['cID']);
    if (!flag) {
      errorParams(res);
      return;
    }
    const pool = await doExcute();
    let inputs = [body.cID];
    let inputStr = poolInputs(pool, inputs);
    const result = sqlResultFormat(await pool.query(`delete from article_commit where commit_ID=@p0`));
    if (result.rowNum > 0) {
      sendRes(res, 0, {});
    } else {
      sendRes(res, -1, {}, '未知错误');
    }
  } catch (e) {
    catchError(res, e);
  }
});

module.exports = router;
