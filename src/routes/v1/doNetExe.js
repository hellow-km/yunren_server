const {
  emailMessage,
  sendRes,
  ObjectKeysValid,
  setEmailCode,
  formatMilliseconds,
  emailUseTime,
  errorParams,
  catchError,
  joinDir,
  tempPath,
  getTempName,
  sendError,
  doNetExeObj,
} = require('../../utils/utils');
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { execFile, spawn } = require('child_process');

//获取验证码
router.post('/htmlToXml', async (req, res) => {
  try {
    let body = req.body || {};

    let flag = ObjectKeysValid(body, ['htmlText']);
    if (!flag) {
      errorParams(res);
      return;
    }
    let savePath = joinDir(tempPath, getTempName());
    let htmlText = decodeURI(body.htmlText);
    let htmlPath = savePath + '.html';
    fs.writeFileSync(htmlPath, htmlText, 'utf8');
    let xmlPath = savePath + '.xml';
    fs.writeFileSync(xmlPath, '');
    let child = spawn(doNetExeObj.htmlToXml, [htmlPath, xmlPath]);

    // 监听子进程的输出流
    child.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });

    // 监听子进程的错误流
    child.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    // 监听子进程的退出事件
    child.on('close', (code) => {
      let xml = fs.readFileSync(xmlPath, 'utf8');
      let data = xml.toString();
      fs.rmSync(htmlPath);
      fs.rmSync(xmlPath);
      sendRes(res, 0, data);
    });
  } catch (e) {
    catchError(res, e);
  }
});

module.exports = router;
