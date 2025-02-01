const express = require('express');
const config = require('../../config/config');
const userRoute = require('./user');
const commonRoute = require('./common');
const imageRoute = require('./image');
const articleRoute = require('./article');
const gamesRoute = require('./games');
const commitRoute = require('./commit');
const scoreRoute = require('./score');
const doNetExeRoute = require('./doNetExe');
const toolsRoute = require('./tools');
const doModel = require('./doModel');

const router = express.Router();

const defaultRoutes = [
  // {
  //   path: '/auth',
  //   route: authRoute,
  // },
  {
    path: '/users',
    route: userRoute,
  },
  {
    path: '/common',
    route: commonRoute,
  },
  {
    path: '/image',
    route: imageRoute,
  },
  {
    path: '/games',
    route: gamesRoute,
  },
  {
    path: '/score',
    route: scoreRoute,
  },
  {
    path: '/article',
    route: articleRoute,
  },
  {
    path: '/article',
    route: commitRoute,
  },
  {
    path: '/tools',
    route: toolsRoute,
  },
  {
    path: '/doNetExe',
    route: doNetExeRoute,
  },
  {
    path: '/doModel',
    route: doModel,
  },
];

const devRoutes = [
  // routes available only in development mode
  // {
  //   path: '/docs',
  //   route: docsRoute,
  // },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

/* istanbul ignore next */
if (config.env === 'development') {
  devRoutes.forEach((route) => {
    router.use(route.path, route.route);
  });
}

module.exports = router;
