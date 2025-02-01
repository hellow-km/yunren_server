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
  createFolder,
  formatTime,
  execDeleteSync,
} = require('../../utils/utils');
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { execFile, spawn } = require('child_process');
const tf = require('@tensorflow/tfjs-node');
const deeplab = require('@tensorflow-models/deeplab');
const Jimp = require('jimp');
const formidable = require('formidable');
const config = require('../../config/config');
const { convertImage } = require('../../utils/magick');
const parseImageFolder = path.join(__dirname, '../../parseImages');

// 加载DeepLab模型
async function loadModel() {
  const model = await deeplab.load({
    base: 'pascal', // 使用Pascal VOC 2012预训练模型
    quantizationBytes: 1,
  });
  return model;
}

// 处理图像并进行抠图
async function segmentImage(imagePath, outputPath) {
  try {
    const model = await loadModel();
    // 从文件加载图像
    const image = tf.node.decodeImage(new Uint8Array(require('fs').readFileSync(imagePath)));
    // 运行抠图
    const segmentationResult = await model.segment(image);
    // 渲染结果
    const coloredSegmentation = deeplab.util.getColoredSegmentationImage(segmentationResult);

    require('fs').writeFileSync(outputPath, tf.node.encodePng(coloredSegmentation));
  } catch (error) {
    console.error('Error during image segmentation:', error);
  }
}

//证件照
router.post('/personPhoto', async (req, res) => {
  try {
    let query = req.query || {};
    let valid = ObjectKeysValid(query, ['taskID', 'width', 'height']);
    if (!valid) {
      errorParams(res);
      return;
    }
    const form = new formidable.IncomingForm();
    form.options.keepExtensions = true;
    let dayFolder = formatTime(new Date(), 'yyyy-MM-dd');
    let taskFolder = joinDir(parseImageFolder, dayFolder, query.taskID);
    createFolder(taskFolder);
    form.uploadDir = taskFolder;
    form.parse(req, async (err, fields, files) => {
      try {
        if (err) {
          console.log('err', err);
          catchError(res, err);
          return;
        }
        const fileName = files.files[0].newFilename;
        const orignFile = joinDir(taskFolder, fileName);
        const pngFile = joinDir(taskFolder, getTempName() + '.png');
        let targetFolder = joinDir(__dirname, '../../images', dayFolder, query.taskID);
        createFolder(targetFolder);
        let outFilepath = joinDir(targetFolder, files.files[0].newFilename);
        await convertImage(orignFile, pngFile, '-alpha set -channel A -evaluate set 100% +channel'.split(' '));
        segmentImage(pngFile, query.width, query.height, outFilepath);
        execDeleteSync(taskFolder);
        execDeleteSync(targetFolder);
        // magick;
        sendRes(res, 0, `${config.serverUrl}/images/${dayFolder}/${query.taskID}/${fileName}`);
      } catch (e) {
        catchError(res, e);
      }
    });
  } catch (e) {
    catchError(res, e);
  }
});

module.exports = router;
