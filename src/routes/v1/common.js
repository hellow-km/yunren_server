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
  httpsRequest,
  httpRequest,
} = require('../../utils/utils');
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const https = require('https');
const formidable = require('formidable');

const { getExcute } = require('../../db/excument');
const config = require('../../config/config');

const uploadImagesFolder = path.join(__dirname, '../../uploadImages');

//获取验证码
router.post('/getEmailCode', async (req, res) => {
  try {
    let body = req.body || {};
    let valid = ObjectKeysValid(body, ['email']);
    if (!valid) {
      errorParams(res);
      return;
    }
    let messageType = body.type || '1';
    // let checkData = sqlSelectFormat(await getExcute(`select top 1 nickName,email from tod_user where  email='${body.email}'`));
    // if (checkData.count > 0) {
    //   sendRes(res, -1, {}, '邮箱已被注册');
    //   return;
    // }
    let code = Math.random().toString().slice(-6);
    let codeHtml = path.join(__dirname, 'code.html');
    fs.readFile(codeHtml, { encoding: 'utf-8' }, (err, data) => {
      if (err) {
        sendRes(res, -1, {}, '验证码发送失败1');
        return;
      }
      let htmlStr = data.toString();
      const startIndex = htmlStr.indexOf('<body>');
      const endIndex = htmlStr.indexOf('</body>');
      if (startIndex !== -1 && endIndex !== -1) {
        // 提取 body 标签内的内容
        const bodyContent = htmlStr.substring(startIndex + 6, endIndex); // +6 是为了排除 '<body>' 的长度
        let sendContent = bodyContent.replace('${yanzm}', code).replace('${yzTime}', formatMilliseconds(emailUseTime));

        if (messageType == '2') {
          sendContent = sendContent.replace('完成注册', '修改密码');
        }
        emailMessage(body.email, '芸任注册', '验证码测试', sendContent).then((err) => {
          if (err) {
            sendRes(res, -1, {}, '验证码发送失败2');
          } else {
            setEmailCode(req, body.email, code);
            sendRes(res, 0, {}, '验证码发送成功');
          }
        });
      } else {
        sendRes(res, -1, {}, '验证码发送失败3');
      }
    });
  } catch (e) {
    catchError(res, e);
  }
});

router.post('/upload', (req, res) => {
  try {
    const form = new formidable.IncomingForm();
    let dayFolder = formatTime(new Date(), 'yyyy-MM-dd');
    let upadloaDir = joinDir(uploadImagesFolder, dayFolder);
    createFolder(upadloaDir);
    form.uploadDir = upadloaDir;
    form.options.keepExtensions = true;
    form.parse(req, (_, fields, files) => {
      let filePaths = [];
      for (const key in files) {
        if (Object.hasOwnProperty.call(files, key)) {
          const file = files[key];
          let filePath = file[0].filepath;
          filePaths.push(config.serverUrl + '/uploadImages/' + dayFolder + '/' + getFilepathIdentify(filePath).fileName);
        }
      }
      sendRes(res, 0, filePaths);
    });
  } catch (e) {
    catchError(res, e);
  }
});

router.post('/upload_article', (req, res) => {
  try {
    const form = new formidable.IncomingForm();
    let dayFolder = formatTime(new Date(), 'yyyy-MM-dd');
    let upadloaDir = joinDir(uploadImagesFolder, dayFolder);
    createFolder(upadloaDir);
    form.uploadDir = upadloaDir;
    form.options.keepExtensions = true;
    form.parse(req, (_, fields, files) => {
      let filePaths = [];
      for (const key in files) {
        if (Object.hasOwnProperty.call(files, key)) {
          const file = files[key];
          let filePath = file[0].filepath;
          filePaths.push(config.serverUrl + '/uploadImages/' + dayFolder + '/' + getFilepathIdentify(filePath).fileName);
        }
      }
      res.send({
        code: 0,
        data: filePaths,
        errMsg: '',
      });
      // sendRes(res, 0, filePaths);
    });
  } catch (e) {
    catchError(res, e);
  }
});

router.get('/getIP', async (req, res) => {
  https.get(`https://qifu-api.baidubce.com/ip/geo/v1/district?ip=84.247.149.73`, (res2) => {
    let data = '';

    res2.on('data', (chunk) => {
      data += chunk;
    });

    res2.on('end', () => {
      console.log('响应数据:', data);
    });
    sendRes(res, 0, data);
  });
});

router.post('/feedback', async (req, res) => {
  let body = req.body || {};
  let valid = ObjectKeysValid(body, ['emailOrPhone', 'context']);
  if (!valid) {
    errorParams(res);
    return;
  }
  emailMessage(
    'yunfei-hzh@outlook.com',
    '意见反馈',
    '反馈内容',
    `发件人:${body.emailOrPhone}<p>内容:${body.context}</p>`
  ).then((err) => {
    if (err) {
      sendRes(res, -1, {}, '反馈失败');
    } else {
      sendRes(res, 0, {}, '反馈成功');
    }
  });
});

router.post('/regedit', async (req, res) => {
  try {
    let body = req.body || {};
    let valid = ObjectKeysValid(body, ['type', 'host', 'path']);
    if (!valid) {
      errorParams(res);
      return;
    }
    let resData = await httpsRequest(body.type, body.host, body.path, body.data || {});
    sendRes(res, 0, resData);
  } catch (e) {
    catchError(res, e);
  }
});

router.post('/regeditHttp', async (req, res) => {
  try {
    let body = req.body || {};
    let valid = ObjectKeysValid(body, ['type', 'host', 'path']);
    if (!valid) {
      errorParams(res);
      return;
    }
    let resData = await httpRequest(body.type, body.host, body.path, body.data || {});
    sendRes(res, 0, resData);
  } catch (e) {
    catchError(res, e);
  }
});

module.exports = router;
