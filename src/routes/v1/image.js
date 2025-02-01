const express = require('express');
const {
  sendRes,
  getTempName,
  magick,
  formatTime,
  createFolder,
  joinDir,
  getFilepathIdentify,
  catchError,
  ObjectKeysValid,
  errorParams,
  execDeleteSync,
  getExifData,
  getGPSInfo,
  exifImage,
  formatFileSize,
} = require('../../utils/utils');
const { exec } = require('child_process');
const formidable = require('formidable');
const path = require('path');
const fs = require('fs');
const { compressImage, convertImage, identifyImage } = require('../../utils/magick');
const config = require('../../config/config');
const router = express.Router();
const archiver = require('archiver');

const parseImageFolder = path.join(__dirname, '../../parseImages');

router.post('/compress', async (req, res) => {
  try {
    const form = new formidable.IncomingForm();
    form.options.keepExtensions = true;
    let dayFolder = formatTime(new Date(), 'yyyy-MM-dd');
    let taskFolder = joinDir(parseImageFolder, dayFolder, req.query.taskID);
    let quality = req.query.quality || 80;
    createFolder(taskFolder);
    form.uploadDir = taskFolder;
    form.parse(req, async (err, fields, files) => {
      try {
        if (err) {
          console.log('err', err);
          sendRes(res, -1, {}, '出现错误');
          return;
        }
        let resArr = [];
        for (let i = 0; i < files.files.length; i++) {
          const fileName = files.files[i].newFilename;
          //目标文件夹
          let targetFolder = joinDir(__dirname, '../../images', dayFolder, req.query.taskID);
          //转换文件
          let targetFilepath = joinDir(targetFolder, fields.name[i]);
          createFolder(targetFolder);
          let compressResult = await compressImage(joinDir(taskFolder, fileName), targetFilepath, quality);
          let isSuccess = !compressResult.error;
          resArr.push({
            ID: fields.ID[i],
            name: fields.name[i],
            progress: 1,
            state: isSuccess ? 1 : 2,
            newSize: isSuccess ? fs.statSync(targetFilepath).size : 0,
            url: `${config.serverUrl}/images/${dayFolder}/${req.query.taskID}/${fields.name[i]}`,
          });
        }

        // magick;
        sendRes(res, 0, resArr);
      } catch (e) {
        catchError(res, e);
      }
    });
  } catch (e) {
    catchError(res, e);
  }
});

router.post('/identify', async (req, res) => {
  try {
    const form = new formidable.IncomingForm();
    form.options.keepExtensions = true;
    let dayFolder = formatTime(new Date(), 'yyyy-MM-dd');
    let taskFolder = joinDir(parseImageFolder, dayFolder, req.query.taskID);
    createFolder(taskFolder);
    form.uploadDir = taskFolder;
    form.parse(req, async (err, fields, files) => {
      try {
        if (err) {
          console.log('err', err);
          catchError(res, err);
          return;
        }

        let targetFilepath = joinDir(taskFolder, files.files[0].newFilename);
        let compressResult = await identifyImage(targetFilepath);
        let exifInfo = await exifImage(targetFilepath);
        console.log('exifInfo', exifInfo);
        // magick;
        sendRes(res, 0, compressResult.result);
      } catch (e) {
        catchError(res, e);
      }
    });
  } catch (e) {
    catchError(res, e);
  }
});

router.post('/convert', async (req, res) => {
  try {
    const form = new formidable.IncomingForm();
    form.options.keepExtensions = true;
    let dayFolder = formatTime(new Date(), 'yyyy-MM-dd');
    let taskFolder = joinDir(parseImageFolder, dayFolder, req.query.taskID);
    let cOpt = [];
    if (req.query.rotate) {
      let roate = req.query.rotate;
      cOpt = ['-rotate', roate % 360];
    }
    if (req.query.width && req.query.height) {
      cOpt = ['-resize', `!${req.query.width}x${req.query.height}`];
    }
    createFolder(taskFolder);
    form.uploadDir = taskFolder;
    form.parse(req, async (err, fields, files) => {
      try {
        if (err) {
          console.log('err', err);
          sendRes(res, -1, {}, '出现错误');
          return;
        }
        let resArr = [];
        for (let i = 0; i < files.files.length; i++) {
          const fileName = files.files[i].newFilename;
          //目标文件夹
          let targetFolder = joinDir(__dirname, '../../images', dayFolder, req.query.taskID);
          let fileIdentify = getFilepathIdentify(fields.name[i]);
          //转换文件
          let targetFilepath = joinDir(targetFolder, fileIdentify.fileNameNoExt + '.' + req.query.ext);
          createFolder(targetFolder);
          let compressResult = await convertImage(joinDir(taskFolder, fileName), targetFilepath, cOpt);
          let isSuccess = !compressResult.error;
          resArr.push({
            ID: fields.ID[i],
            name: fields.name[i],
            progress: 1,
            ext: fileIdentify.extNoDot,
            newExt: req.query.ext,
            state: isSuccess ? 1 : 2,
            newSize: isSuccess ? fs.statSync(targetFilepath).size : 0,
            url: `${config.serverUrl}/images/${dayFolder}/${req.query.taskID}/${
              fileIdentify.fileNameNoExt + '.' + req.query.ext
            }`,
          });
        }

        // magick;
        sendRes(res, 0, resArr);
      } catch (e) {
        catchError(res, e);
      }
    });
  } catch (e) {
    catchError(res, e);
  }
});

router.post('/convert_android', async (req, res) => {
  try {
    const form = new formidable.IncomingForm();
    form.options.keepExtensions = true;
    let dayFolder = formatTime(new Date(), 'yyyy-MM-dd');
    let taskFolder = joinDir(parseImageFolder, dayFolder, req.query.taskID);
    createFolder(taskFolder);
    form.uploadDir = taskFolder;
    form.parse(req, async (err, fields, files) => {
      try {
        if (err) {
          console.log('err', err);
          sendRes(res, -1, {}, '出现错误');
          return;
        }
        let resArr = [];

        for (let i = 0; i < files.file.length; i++) {
          const fileName = files.file[i].newFilename;
          //目标文件夹
          let targetFolder = joinDir(__dirname, '../../images', dayFolder, req.query.taskID);
          let fileIdentify = getFilepathIdentify(fileName);
          //转换文件
          let targetFilepath = joinDir(targetFolder, fileIdentify.fileNameNoExt + '.' + req.query.ext);
          createFolder(targetFolder);
          let compressResult = await convertImage(joinDir(taskFolder, fileName), targetFilepath);
          let isSuccess = !compressResult.error;
          resArr.push(
            `${config.serverUrl}/images/${dayFolder}/${req.query.taskID}/${fileIdentify.fileNameNoExt + '.' + req.query.ext}`
          );
        }

        res.send({ code: 0, data: resArr, errMsg: '' });
      } catch (e) {
        catchError(res, e);
      }
    });
  } catch (e) {
    console.log('e', e);
    catchError(res, e);
  }
});

router.post('/compress_android', async (req, res) => {
  try {
    const form = new formidable.IncomingForm();
    form.options.keepExtensions = true;
    let dayFolder = formatTime(new Date(), 'yyyy-MM-dd');
    let taskFolder = joinDir(parseImageFolder, dayFolder, req.query.taskID);
    createFolder(taskFolder);
    form.uploadDir = taskFolder;
    form.parse(req, async (err, fields, files) => {
      try {
        if (err) {
          console.log('err', err);
          sendRes(res, -1, {}, '出现错误');
          return;
        }
        let resArr = [];

        for (let i = 0; i < files.file.length; i++) {
          const fileName = files.file[i].newFilename;
          //目标文件夹
          let targetFolder = joinDir(__dirname, '../../images', dayFolder, req.query.taskID);
          let fileIdentify = getFilepathIdentify(fileName);
          //转换文件
          let targetFilepath = joinDir(targetFolder, fileIdentify.fileName);
          createFolder(targetFolder);
          let compressResult = await compressImage(joinDir(taskFolder, fileName), targetFilepath, req.query.quality);
          let isSuccess = !compressResult.error;
          resArr.push({
            originSize: formatFileSize(fs.statSync(joinDir(taskFolder, fileName)).size),
            newSize: formatFileSize(fs.statSync(targetFilepath).size),
            url: `${config.serverUrl}/images/${dayFolder}/${req.query.taskID}/${fileIdentify.fileName}`,
          });
        }

        res.send({ code: 0, data: resArr, errMsg: '' });
      } catch (e) {
        console.log('e', e);
        catchError(res, e);
      }
    });
  } catch (e) {
    console.log('e', e);
    catchError(res, e);
  }
});

router.post('/downloadAll', async (req, res) => {
  try {
    let dayFolder = formatTime(new Date(), 'yyyy-MM-dd');
    let taskFolder = joinDir(__dirname, '../../images', dayFolder, req.body.taskID);
    const output = fs.createWriteStream(joinDir(__dirname, '../../images', dayFolder, req.body.taskID + 'images.zip'));
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(output);
    archive.directory(taskFolder + '/', 'images');
    archive.finalize();
    sendRes(res, 0, { url: `${config.serverUrl}/images/${dayFolder}/${req.body.taskID + 'images.zip'}` });
  } catch (e) {
    catchError(res, e);
  }
});

router.post('/deleteImages', async (req, res) => {
  try {
    let body = req.body || {};
    let flag = ObjectKeysValid(body, ['taskID']);
    if (!flag) {
      errorParams(res);
      return;
    }
    let dayFolder = formatTime(new Date(), 'yyyy-MM-dd');
    let taskFolder = joinDir(parseImageFolder, dayFolder, req.body.taskID);
    let targetFolder = joinDir(__dirname, '../../images', dayFolder, req.body.taskID);
    execDeleteSync(taskFolder);
    execDeleteSync(targetFolder);
    sendRes(res, 0, {});
  } catch (e) {
    catchError(res, e);
  }
});

module.exports = router;
