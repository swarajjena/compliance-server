const express = require('express');
const router = express.Router();
const { sql,poolPromise } = require('../db')


router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.get('/all_filters', async (req, res) => {
  try {
    const pool = await poolPromise
    const result = await pool.request()
        .query('select TOP 10 * from Attribute_Filter')      

    res.json(result.recordset)
  } catch (err) {
    res.status(500)
    res.send(err.message)
  }
})

router.get('/filter_values/table/:table/attr/:attr', async (req, res) => {
  try {
    const pool = await poolPromise
    const result = await pool.request()
        .query('select DISTINCT '+req.params.attr+'  from '+req.params.table)      

    res.json(result.recordset)
  } catch (err) {
    res.status(500)
    res.send(err.message)
  }
})

router.post('/filter_data',async (req,res) => {
  try {
    let filters=req.body.filters;

    
    const pool = await poolPromise
    const result = await pool.request()
        .query("select COLUMN_NAME from INFORMATION_SCHEMA.COLUMNS where TABLE_NAME = 'Law_Master'")
        

    let lm_columns =  result.recordset.map(column => column.COLUMN_NAME)
    let lm_db_columns =  result.recordset.map(column => "lm."+column.COLUMN_NAME)
                        .filter(column => !(column.indexOf("_ID")>=0)) 

    let lm_filters = filters.filter(fl => (fl.selected!="ALL" && lm_columns.indexOf(fl.Attribute_name)>=0))
    lm_filters = lm_filters.map(filter => {
        let qry= "AND (";
        for (let opt of filter.selected){
          if(qry != "AND "){
              qry = qry + " OR ";
          }          
          qry = qry + " lm."+filter.Attribute_name+" = '"+opt+"'";
        }
        qry = qry + ")";
        return qry;
      }
    )
      
    

    const result_jm = await pool.request()
        .query("select COLUMN_NAME from INFORMATION_SCHEMA.COLUMNS where TABLE_NAME = 'Jurisdiction_Master'")
        

    let jm_columns =  result_jm.recordset.map(column => column.COLUMN_NAME)
    let jm_db_columns =  result_jm.recordset.map(column => "jm."+column.COLUMN_NAME)
                        .filter(column => !(column.indexOf("_ID")>=0)) 

    let jm_filters = filters.filter(fl => (fl.selected!="ALL" && jm_columns.indexOf(fl.Attribute_name)>=0))
    jm_filters = jm_filters.map(filter => " AND jm."+filter.Attribute_name+" = '"+filter.selected+"'")

    jm_filters = jm_filters.map(filter => {
      let qry= "AND (";
      for (let opt of filter.selected){
        if(qry != "AND "){
            qry = qry + " OR ";
        }          
        qry = qry + " jm."+filter.Attribute_name+" = '"+opt+"'";
      }
      qry = qry + ")";
      return qry;
    })



    db_columns = [...lm_db_columns , ...jm_db_columns];
    filters = [...lm_filters, ...jm_filters];

    let columns_sql = db_columns.join(" , ");
    let filters_sql = filters.join("");

    let qry = "SELECT "+ columns_sql + " FROM Law_Master as lm, Jurisdiction_Master as jm WHERE lm.Jurisdiction_ID = jm.Jurisdiction_ID "+filters_sql

    const result_filter = await pool.request()
        .query(qry)

    res.json(result_filter.recordset)
  } catch (err) {
    res.status(500)
    res.send(err.message)
  }
})





module.exports = router;
