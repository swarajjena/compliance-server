const express = require('express');
const router = express.Router();
const { sql,poolPromise } = require('../db')


router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});


router.get('/table/:table', async (req, res) => {
  try {
    const pool = await poolPromise
    const result = await pool.request()
        .input('table_name', sql.VarChar, req.params.table)
        .query('select TOP 10 * from '+req.params.table)      


    res.json(result.recordset)
  } catch (err) {
    res.status(500)
    res.send(err.message)
  }
})



module.exports = router;
