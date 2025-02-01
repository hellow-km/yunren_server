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
const UglifyJS = require('uglify-js');
const CleanCSS = require('clean-css');

//js压缩
router.post('/jsCompress', async (req, res) => {
  try {
    let body = req.body || {};

    let flag = ObjectKeysValid(body, ['context']);
    if (!flag) {
      errorParams(res);
      return;
    }

    var result = UglifyJS.minify(body.context, body.option || {});
    console.log(result);
    sendRes(res, 0, result.code);
  } catch (e) {
    catchError(res, e);
  }
});

//css压缩
router.post('/cssCompress', async (req, res) => {
  try {
    let body = req.body || {};

    let flag = ObjectKeysValid(body, ['context']);
    if (!flag) {
      errorParams(res);
      return;
    }
    let resCode = new CleanCSS(body.option || {}).minify(body.context, function (error, output) {
      // `output` is the same as in the synchronous call above
      if (error) {
        catchError(res, error);
        return;
      }
      sendRes(res, 0, output.styles);
    });
  } catch (e) {
    catchError(res, e);
  }
});

module.exports = router;
