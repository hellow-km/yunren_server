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

//删除表数据
async function deleteTableData(sqlText, inputs) {
  try {
    const pool = await doExcute();
    poolInputs(pool, inputs);
    const result = sqlResultFormat(await pool.query(sqlText));
    return result;
  } catch (e) {}
}

//发布文章
router.post('/insertArticle', async (req, res) => {
  try {
    const pool = await doExcute();
    let body = req.body || {};
    let flag = ObjectKeysValid(body, ['title', 'user_ID', 'context']);
    if (!flag) {
      errorParams(res);
      return;
    }
    if (body.tags) {
      const arrTag = body.tags.split(',');
      if (arrTag.length > 6) {
        sendRes(res, -1, [], 'tag数量不能超过6个');
        return;
      }
      let tagSql = '';
      for (let i = 0; i < arrTag.length; i++) {
        const tag = arrTag[i];
        let checkData = sqlSelectFormat(await getExcute(`select tagName from article_tag where tagName='${tag}'`));
        if (checkData.count === 0) {
          tagSql += `insert into article_tag(tagName,createTime)values('${tag}',getdate());`;
        }
      }
      if (tagSql) {
        await pool.query(tagSql);
      }
    }
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    body.context = decodeURI(body.context);
    body.title = decodeURI(body.title);

    if (body.article_ID) {
      let inputKeys = ['title', 'imgSrc', 'ac_desc', 'author', 'tags', 'user_ID', 'context', 'ip'];
      let inputs = [body.title, body.imgSrc, body.ac_desc, body.author, body.tags, body.user_ID, body.context, ip];
      let inputStr = poolUpdateInputs(pool, inputKeys, inputs);
      const result = sqlResultFormat(
        await pool.query(`update articleList set ${inputStr} where article_ID=${body.article_ID}`)
      );
      if (result.rowNum > 0) {
        sendRes(res, 0, {}, '发布成功');
      } else {
        sendRes(res, -1, [], '发布失败');
      }
    } else {
      let inputs = [body.title, body.imgSrc, body.ac_desc, 0, body.author, body.tags, body.user_ID, body.context, ip];
      let inputStr = poolInputs(pool, inputs);
      const result = sqlResultFormat(
        await pool.query(
          `insert into articleList(title,imgSrc,ac_desc,readNum,author,tags,user_ID,context,ip,createTime)values(${inputStr},getdate())`
        )
      );
      if (result.rowNum > 0) {
        sendRes(res, 0, {}, '发布成功');
      } else {
        sendRes(res, -1, [], '发布失败');
      }
    }
  } catch (e) {
    catchError(res, e);
  }
});

//文章标签
router.post('/getTags', async (req, res) => {
  try {
    let body = req.body || {};

    // let flag = ObjectKeysValid(body, ['commitContent', 'article_ID', 'user_ID']);
    // if (!flag) {
    //   errorParams(res);
    //   return;
    // }
    let checkData = sqlSelectFormat(
      await getExcute(
        `select top 50 tagName as label,tagName as value from article_tag where disabled is null or disabled='0'`
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

//删除文章
router.post('/realDeleteArticle', async (req, res) => {
  try {
    let body = req.body || {};

    let flag = ObjectKeysValid(body, ['aID', 'uID']);
    if (!flag) {
      errorParams(res);
      return;
    }

    const result = await deleteTableData(`delete from articleList where article_ID=@p0 and user_ID=@p1`, [
      body.aID,
      body.uID,
    ]);
    if (result.rowNum > 0) {
      deleteTableData(`delete from article_good where article_ID=@p0`, [body.aID]);
      deleteTableData(`delete from article_commit where article_ID=@p0`, [body.aID]);
      deleteTableData(`delete from article_like where article_ID=@p0`, [body.aID]);
      deleteTableData(`delete from article_read where article_ID=@p0`, [body.aID]);
      sendRes(res, 0, {});
    } else {
      sendRes(res, -1, {}, '未知错误');
    }
  } catch (e) {
    catchError(res, e);
  }
});

//文章内容
router.post('/getArticleByID', async (req, res) => {
  try {
    let body = req.body || {};

    let flag = ObjectKeysValid(body, ['ID']);
    if (!flag) {
      errorParams(res);
      return;
    }
    let checkData = sqlSelectFormat(
      await getExcute(
        `select *,(select avartar from tod_user where user_ID=a.user_ID)as realAvatar,(select nickName from tod_user where user_ID=a.user_ID)as realNickName from article_view as a where article_ID=${body.ID}`
      )
    );
    if (checkData.success) {
      let data = checkData.data[0];
      // data.readUserList = sqlSelectFormat(await getExcute(`select * from article_read where article_ID=${body.ID}`)).data;
      // data.likeList = sqlSelectFormat(await getExcute(`select * from article_like where article_ID=${body.ID}`)).data;
      // data.goodList = sqlSelectFormat(await getExcute(`select * from article_good where article_ID=${body.ID}`)).data;
      data.commitList = sqlSelectFormat(
        await getExcute(
          `select *,(select avartar from tod_user where user_ID=a.user_ID)as realAvatar,(select nickName from tod_user where user_ID=a.user_ID)as realNickName from article_commit as a where article_ID=${body.ID} order by isTop desc, upNum DESC, createTime DESC`
        )
      ).data;

      sendRes(res, 0, data);
    } else {
      sendRes(res, -1, {}, '未知错误');
    }
  } catch (e) {
    catchError(res, e);
  }
});

//获取文章点赞和收藏数
router.post('/getIsLikeAndFavorite', async (req, res) => {
  try {
    let body = req.body || {};

    let flag = ObjectKeysValid(body, ['aID', 'uID']);
    if (!flag) {
      // errorParams(res);
      sendRes(res, 0, {});
      return;
    }
    let checkData = sqlSelectFormat(
      await getExcute(
        `select (select count(*) as count from article_good where article_ID=${body.aID} and user_ID=${body.uID})as isGood,(select count(*) as count from article_like where article_ID=${body.aID} and user_ID=${body.uID}) as isLike`
      )
    );
    if (checkData.success) {
      let data = checkData.data[0];
      // data.readUserList = sqlSelectFormat(await getExcute(`select * from article_read where article_ID=${body.ID}`)).data;
      // data.likeList = sqlSelectFormat(await getExcute(`select * from article_like where article_ID=${body.ID}`)).data;
      // data.goodList = sqlSelectFormat(await getExcute(`select * from article_good where article_ID=${body.ID}`)).data;
      // data.commitList = sqlSelectFormat(await getExcute(`select * from article_commit where article_ID=${body.ID}`)).data;

      sendRes(res, 0, data);
    } else {
      sendRes(res, -1, {}, '未知错误');
    }
  } catch (e) {
    catchError(res, e);
  }
});

//收藏文章
router.post('/likeArticle', async (req, res) => {
  try {
    let body = req.body || {};

    let flag = ObjectKeysValid(body, ['aID', 'uID']);
    if (!flag) {
      errorParams(res);
      return;
    }
    let checkData = sqlSelectFormat(
      await getExcute(`select * from article_like where article_ID=${body.aID} and user_ID=${body.uID}`)
    );
    if (checkData.success) {
      let resStr = '';
      if (checkData.count) {
        resStr = '取消收藏成功';
        const pool = await doExcute();
        let inputs = [body.aID, body.uID];
        poolInputs(pool, inputs);
        const result = sqlResultFormat(await pool.query(`delete from article_like where article_ID=@p0 and user_ID=@p1`));
        if (result.rowNum === 0) {
          sendRes(res, -1, {}, '失败');
          return;
        }
      } else {
        resStr = '收藏成功';
        const pool = await doExcute();
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        let inputs = [body.uID, body.aID, ip];
        let inputStr = poolInputs(pool, inputs);
        const result = sqlResultFormat(
          await pool.query(`insert into article_like(user_ID,article_ID,ip,createTime)values(${inputStr},getdate())`)
        );
        if (result.rowNum === 0) {
          sendRes(res, -1, {}, '处理失败');
        }
      }

      let aData = sqlSelectFormat(
        await getExcute(
          `select (select count(*) as count from article_good where article_ID=${body.aID} and user_ID=${body.uID})as isGood,(select count(*) as count from article_good where article_ID=${body.aID})as goodNum,(select count(*) as count from article_like where article_ID=${body.aID} and user_ID=${body.uID}) as isLike,(select count(*) as count from article_like where article_ID=${body.aID}) as likeNum`
        )
      );
      sendRes(res, 0, aData.data[0], resStr);
    } else {
      sendRes(res, -1, {}, '未知错误');
    }
  } catch (e) {
    catchError(res, e);
  }
});

//点赞文章
router.post('/goodArticle', async (req, res) => {
  try {
    let body = req.body || {};

    let flag = ObjectKeysValid(body, ['aID', 'uID']);
    if (!flag) {
      errorParams(res);
      return;
    }
    let checkData = sqlSelectFormat(
      await getExcute(`select * from article_good where article_ID=${body.aID} and user_ID=${body.uID}`)
    );
    if (checkData.success) {
      let resStr = '';
      if (checkData.count) {
        resStr = '取消点赞成功';
        const pool = await doExcute();
        let inputs = [body.aID, body.uID];
        poolInputs(pool, inputs);
        const result = sqlResultFormat(await pool.query(`delete from article_good where article_ID=@p0 and user_ID=@p1`));
        if (result.rowNum === 0) {
          sendRes(res, -1, {}, '失败');
          return;
        }
      } else {
        resStr = '点赞成功';
        const pool = await doExcute();
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        let inputs = [body.uID, body.aID, ip];
        let inputStr = poolInputs(pool, inputs);
        const result = sqlResultFormat(
          await pool.query(`insert into article_good(user_ID,article_ID,ip,createTime)values(${inputStr},getdate())`)
        );
        if (result.rowNum === 0) {
          sendRes(res, -1, {}, '处理失败');
        }
      }

      let aData = sqlSelectFormat(
        await getExcute(
          `select (select count(*) as count from article_good where article_ID=${body.aID} and user_ID=${body.uID})as isGood,(select count(*) as count from article_good where article_ID=${body.aID})as goodNum,(select count(*) as count from article_like where article_ID=${body.aID} and user_ID=${body.uID}) as isLike,(select count(*) as count from article_like where article_ID=${body.aID}) as likeNum`
        )
      );
      sendRes(res, 0, aData.data[0], resStr);
    } else {
      sendRes(res, -1, {}, '未知错误');
    }
  } catch (e) {
    catchError(res, e);
  }
});

//获取文章
router.post('/getArticles', async (req, res) => {
  try {
    let body = req.body || {};

    let flag = ObjectKeysValid(body, ['size', 'page']);
    if (!flag) {
      errorParams(res);
      return;
    }
    let size = body.size,
      page = body.page;
    let searchSql = '1=1';
    if (body.tag) {
      if (body.tag === '推荐') {
      } else if (body.tag === '其他') {
        searchSql = `tags is null or tags=''`;
      } else {
        searchSql = `',' + tags + ',' LIKE '%,${body.tag},%'`;
      }
    }
    if (body.searchValue) {
      searchSql += ` and (title like '%${body.searchValue}%' or ac_desc like '%${body.searchValue}%' or author  like '%${body.searchValue}%' or context like '%${body.searchValue}%' or ','+tags+',' like '%,${body.searchValue},%')`;
    }
    if (body.uID) {
      searchSql += ` and user_ID=${body.uID}`;
    }
    let checkData = sqlSelectFormat(
      await getExcute(
        `select *,(select nickName from tod_user where user_ID=a.user_ID)as realNickName,(select avartar from tod_user where user_ID=a.user_ID)as realAvatar from article_view as a where ${searchSql} order by goodNum desc,likeNum desc ,readUserNum desc,readNum desc ,article_ID desc OFFSET ${
          size * (page - 1)
        } ROWS FETCH NEXT ${size} ROWS ONLY  `
      )
    );

    let countData = sqlSelectFormat(await getExcute(`select count(*)as count from article_view where ${searchSql} `));
    if (checkData.success && countData.success) {
      sendRes(res, 0, { data: checkData.data, count: countData.data[0].count });
    } else {
      sendRes(res, -1, {}, '未知错误');
    }
  } catch (e) {
    catchError(res, e);
  }
});

//获取文章
router.post('/getUserArticles', async (req, res) => {
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
      searchSql += ` and user_ID=${body.uID}`;
    }
    let checkData = sqlSelectFormat(
      await getExcute(
        `select *,(select nickName from tod_user where user_ID=a.user_ID)as realNickName,(select avartar from tod_user where user_ID=a.user_ID)as realAvatar from article_view as a where ${searchSql} order by createTime desc OFFSET ${
          size * (page - 1)
        } ROWS FETCH NEXT ${size} ROWS ONLY  `
      )
    );

    let countData = sqlSelectFormat(await getExcute(`select count(*)as count from article_view where ${searchSql} `));
    if (checkData.success && countData.success) {
      sendRes(res, 0, { data: checkData.data, count: countData.data[0].count });
    } else {
      sendRes(res, -1, {}, '未知错误');
    }
  } catch (e) {
    catchError(res, e);
  }
});

//增加阅读
router.post('/addRead', async (req, res) => {
  try {
    let body = req.body || {};

    let flag = ObjectKeysValid(body, ['aID']);
    if (!flag) {
      // errorParams(res);
      sendRes(res, 0, {});
      return;
    }
    if (body.uID) {
      let checkData = sqlSelectFormat(
        await getExcute(`select count(*)as count from article_read where article_ID=${body.aID} and user_ID=${body.uID}`)
      );
      if (checkData.success) {
        if (!checkData.data[0].count) {
          const pool = await doExcute();
          const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
          let inputs = [body.uID, body.aID, ip];
          let inputStr = poolInputs(pool, inputs);
          sqlResultFormat(
            await pool.query(`insert into article_read(user_ID,article_ID,ip,createTime)values(${inputStr},getdate())`)
          );
        }
        const pool = await doExcute();
        let inputs = [body.aID];
        let inputStr = poolInputs(pool, inputs);
        const result = sqlResultFormat(
          await pool.query(`update articleList set readNum=isnull(readNum,0)+1 where article_ID=@p0`)
        );
        if (result.rowNum > 0) {
          sendRes(res, 0, {});
        } else {
          sendRes(res, -2, {}, '出错了');
        }
      } else {
        sendRes(res, -1, {}, '未知错误');
      }
    } else {
      const pool = await doExcute();
      let inputs = [body.aID];
      let inputStr = poolInputs(pool, inputs);
      const result = sqlResultFormat(
        await pool.query(`update articleList set readNum=isnull(readNum,0)+1 where article_ID=@p0`)
      );
      if (result.rowNum > 0) {
        sendRes(res, 0, {});
      } else {
        sendRes(res, -2, {}, '出错了2');
      }
    }
  } catch (e) {
    catchError(res, e);
  }
});

module.exports = router;
