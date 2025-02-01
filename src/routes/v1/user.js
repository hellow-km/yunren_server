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
const md5 = require('md5');
const Token = require('../../utils/token');
const router = express.Router();

//执行表
async function doTableData(sqlText, inputs) {
  const pool = await doExcute();
  poolInputs(pool, inputs);
  const result = sqlResultFormat(await pool.query(sqlText));
  return result;
}

router.post('/register', async (req, res) => {
  try {
    let user = req.body || {};
    let flag = ObjectKeysValid(user, ['userName', 'userPWD', 'email', 'nickName', 'emailCode']);
    if (!flag) {
      errorParams(res);
      return;
    }
    let sCode = getEmailCode(req, user.email);
    // console.log('checkData', req.session, sCode, user.emailCode);
    if (typeof sCode === null) {
      sendRes(res, -1, [], '验证码已使用');
      return;
    }
    if (user.emailCode != sCode) {
      sendRes(res, -1, [], '验证码错误');
      return;
    }
    //判断重复用户或者邮箱
    let checkData = sqlSelectFormat(
      await getExcute(`select top 1 userName,email from tod_user where userName='${user.userName}' or email='${user.email}'`)
    );

    if (checkData.count > 0) {
      let userData = checkData.data[0];
      if (userData.userName == user.userName) {
        sendRes(res, -1, [], '该用户名已存在');
      } else {
        sendRes(res, -1, [], '该邮箱已被注册');
      }
      return;
    } else {
      const pool = await doExcute();
      const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      let inputs = [user.userName, md5(user.userPWD), user.email, user.nickName, ip];
      let inputStr = poolInputs(pool, inputs);
      const result = sqlResultFormat(
        await pool.query(
          `insert into tod_user(userName,userPWD,email,nickName,lastLoginIP,createTime,loginTime)values(${inputStr},getdate(),getdate())`
        )
      );
      if (result.rowNum > 0) {
        deleteEmailCode(req, user.email);
        sendRes(res, 0, {}, '注册成功');
      } else {
        sendRes(res, -1, [], '注册失败');
      }
    }
  } catch (e) {
    catchError(res, e);
  }
});

//重复用户名
router.post('/validUserName', async (req, res) => {
  try {
    let body = req.body;
    if (!ObjectKeysValid(body, ['userName'])) {
      errorParams(res);
      return;
    }
    let checkData = sqlSelectFormat(
      await getExcute(`select top 1 userName from tod_user where userName='${user.userName}' or email='${user.email}'`)
    );
    if (checkData.count > 0) {
      sendRes(res, -1, {}, '用户名已存在');
    } else {
      sendRes(res, 0, {}, '成功');
    }
  } catch (e) {
    catchError(res, e);
  }
});

router.post('/resetPassword', async (req, res) => {
  try {
    let user = req.body;
    if (!ObjectKeysValid(user, ['userName', 'userPWD', 'email', 'emailCode'])) {
      errorParams(res);
      return;
    }
    let sCode = getEmailCode(req, user.email);
    if (typeof sCode === null) {
      sendRes(res, -1, [], '验证码已使用');
      return;
    }
    if (user.emailCode != sCode) {
      sendRes(res, -1, [], '验证码错误');
      return;
    }
    let checkData = sqlSelectFormat(
      await getExcute(`select top 1 userName from tod_user where userName='${user.userName}' and email='${user.email}'`)
    );
    if (checkData.count > 0) {
      const pool = await doExcute();
      const result = sqlResultFormat(
        await pool.query(
          `update tod_user set userPWD='${md5(user.userPWD)}' where userName='${user.userName}' and email='${user.email}'`
        )
      );
      if (result.rowNum > 0) {
        deleteEmailCode(req, user.email);
        sendRes(res, 0, {}, '修改密码成功');
      } else {
        sendRes(res, -1, [], '修改密码失败');
      }
    } else {
      sendRes(res, -1, {}, '用户名不存在');
    }
  } catch (e) {
    catchError(res, e);
  }
});

router.post('/login', async (req, res) => {
  try {
    let body = req.body;
    if (!ObjectKeysValid(body, ['userName', 'userPWD'])) {
      errorParams(res);
      return;
    }

    let checkData = sqlSelectFormat(
      await getExcute(`select top 1 * from tod_user where userName='${body.userName}' and userPWD='${md5(body.userPWD)}'`)
    );

    if (checkData.success && checkData.count > 0) {
      let user = checkData.data[0];
      let token = Token.setToken(user);
      delete user.userPWD;
      sendRes(res, 0, { user, token });
    } else {
      sendRes(res, -1, {}, '用户名或密码错误');
    }
  } catch (e) {
    catchError(res, e);
  }
});

router.post('/updateUser', async (req, res) => {
  try {
    let body = req.body;
    if (!ObjectKeysValid(body, ['user_ID'])) {
      errorParams(res);
      return;
    }
    let user_ID = body.user_ID;
    let checkData = sqlSelectFormat(await getExcute(`select top 1 userName from tod_user where user_ID='${user_ID}'`));
    if (checkData.count > 0) {
      const pool = await doExcute();
      delete body.user_ID;
      let updateValues = Object.values(body);
      let updateKeys = Object.keys(body);
      let setStr = poolUpdateInputs(pool, updateKeys, updateValues);
      const result = sqlResultFormat(await pool.query(`update tod_user set ${setStr} where user_ID='${user_ID}'`));
      if (result.rowNum > 0) {
        sendRes(res, 0, {}, '更新成功');
      } else {
        sendRes(res, -1, [], '更新失败');
      }
    } else {
      sendRes(res, -1, {}, '用户名不存在');
    }
  } catch (e) {
    catchError(res, e);
  }
});

router.post('/validToken', async (req, res) => {
  try {
    sendRes(res, 0, {});
  } catch (e) {
    catchError(res, e);
  }
});

router.post('/tokenUser', async (req, res) => {
  try {
    let body = req.body;
    if (!ObjectKeysValid(body, ['token'])) {
      errorParams(res);
      return;
    }
    let user = Token.verifyToken(body.token);
    if (user) {
      let checkData = sqlSelectFormat(await getExcute(`select top 1 * from tod_user where user_ID='${user.user_ID}'`));
      if (checkData.success && checkData.count > 0) {
        let user = checkData.data[0];
        delete user.userPWD;
        sendRes(res, 0, user);
      } else {
        sendRes(res, 0, {});
      }
    } else {
      sendRes(res, 0, {});
    }
  } catch (e) {
    catchError(res, e);
  }
});

module.exports = router;
