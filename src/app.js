const express = require('express');
const helmet = require('helmet');
const xss = require('xss-clean');
const compression = require('compression');
const cors = require('cors');
const passport = require('passport');
const httpStatus = require('http-status');
const config = require('./config/config');
const morgan = require('./config/morgan');
const { jwtStrategy } = require('./config/passport');
const { authLimiter } = require('./middlewares/rateLimiter');
const routes = require('./routes/v1');
const { errorConverter, errorHandler } = require('./middlewares/error');
const ApiError = require('./utils/ApiError');
const bodyParser = require('body-parser');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { expressjwt } = require('express-jwt');
const formidable = require('formidable');
const path = require('path');
const https = require('https');
const fs = require('fs');
const { getFilepathIdentify, sendRes, getTempName, getIsDev } = require('./utils/utils');
const Token = require('./utils/token');

const uploadImagesFolder = path.join(__dirname, './images');

if (!fs.existsSync(uploadImagesFolder)) {
  fs.mkdirSync(uploadImagesFolder);
}

const app = express();
const secretKey = fs.readFileSync(path.join(__dirname, 'utils/rsa_private_key.txt')).toString(); // 这是用于签署 JWT 的密钥

app.use(cookieParser(secretKey));
// enable cors
app.use(
  cors({
    origin: getIsDev()
      ? ['http://localhost:9000', 'http://localhost:9001', 'http://127.0.0.1:9000']
      : ['http://www.yunren.online', 'http://yunren.online', 'https://www.yunren.online', 'http://49.235.158.186:15423'], // 允许来自 http://localhost:9000 的跨域请求
    credentials: true, // 允许携带凭据（cookies、Authorization 头等）
  })
);
app.options('*', cors());

app.use('/images', express.static(path.join(__dirname, './images')));

app.use('/uploadImages', express.static(path.join(__dirname, './uploadImages')));

app.use('/apk', express.static(path.join(__dirname, './apk')));

// 使用 express-jwt 中间件验证 JWT 并将 payload 添加到 req.user 中
app.use(
  expressjwt({
    secret: secretKey,
    algorithms: ['HS256'],
    getToken: (req) => {
      let token = req.headers['authorization'];
      if (token) {
        let userOrFlag = Token.verifyToken(token);
        if (userOrFlag) {
          return token;
        } else {
          if (userOrFlag === false) {
            return Promise.reject(new Error('Token unUsabled'));
          }
          return Promise.reject(new Error('Token verification failed'));
        }
      } else {
        return Promise.reject(new Error('Token verification failed'));
      }
    }, // 从 cookie 中获取 JWT
  }).unless({
    path: [
      '/v1/users/login',
      '/v1/users/register',
      '/v1/common/getEmailCode',
      '/v1/users/resetPassword',
      '/upload',
      '/apk',
      '/v1/article/getArticles',
      '/v1/games/getHotGames',
      '/v1/article/getCommit',
      '/v1/article/addRead',
      '/v1/article/getArticleByID',
      '/v1/article/getIsLikeAndFavorite',
      '/v1/article/getTags',
      '/v1/games/clickGames',
      '/v1/common/feedback',
      '/v1/common/regedit',
      '/v1/image/convert_android',
      '/v1/image/convert',
      '/v1/image/compress',
      '/v1/image/compress_android',
      '/v1/image/deleteImages',
    ],
  })
);
// 排除登录路由

app.use(
  session({
    secret: secretKey, //设置签名秘钥 内容可以任意填写
    cookie: {
      maxAge: 14 * 24 * 60 * 60 * 1000,
    },
    resave: true, //强制保存，如果session没有被修改也要重新保存
    saveUninitialized: true, //如果原先没有session那么久设置，否则不设置
  })
);

app.use(
  bodyParser.json({
    limit: '50mb',
  })
);
app.use(
  bodyParser.urlencoded({
    limit: '50mb',
    extended: true,
  })
);

if (config.env !== 'test') {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}

// set security HTTP headers
app.use(helmet());

// parse json request body
app.use(express.json());

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// sanitize request data
app.use(xss());

// gzip compression
app.use(compression());

// jwt authentication
app.use(passport.initialize());
passport.use('jwt', jwtStrategy);

// limit repeated failed requests to auth endpoints
if (config.env === 'production') {
  app.use('/v1/auth', authLimiter);
}

// v1 api routes
app.use('/v1', routes);

// send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

// convert error to ApiError, if needed
app.use(errorConverter);

// handle error
app.use(errorHandler);

// 读取 SSL 证书和私钥文件
const privateKey = fs.readFileSync(path.join(__dirname, 'certFile', 'privkey.pem'), 'utf8');
const certificate = fs.readFileSync(path.join(__dirname, 'certFile', 'cert.pem'), 'utf8');

// 创建 HTTPS 服务器选项
const options = {
  key: privateKey,
  cert: certificate,
};

// 创建 HTTPS 服务器
const server = https.createServer(options, app);

// 启动服务器
server.listen(14243, () => {
  console.log('HTTPS Server running on port 14243');
});

module.exports = app;
