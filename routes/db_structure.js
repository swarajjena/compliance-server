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
        .query('select COLUMN_NAME,DATA_TYPE,IS_NULLABLE from INFORMATION_SCHEMA.COLUMNS where TABLE_NAME = @table_name')      

    res.json(result.recordset)
  } catch (err) {
    res.status(500)
    res.send(err.message)
  }
})


router.get('/list_compliances', async (req, res) => {
  try {
    const pool = await poolPromise
    const result = await pool.request()
        .query('select * from Validation_Rules')      
    res.json(result.recordset)
  } catch (err) {
    res.status(500)
    res.send(err.message)
  }
})


router.get('/get_rules/table/:table/attr/:attr', async (req, res) => {
  try {
    const pool = await poolPromise
    const result = await pool.request()
    .input('table_name', sql.VarChar, req.params.table)
    .input('attr_name', sql.VarChar, req.params.attr)
    .query('select * from Attribute_Rule_Relation WHERE Table_Name = @table_name AND Attribute_name = @attr_name')      
    res.json(result.recordset)
  } catch (err) {
    res.status(500)
    res.send(err.message)
  }
})

router.post('/add_rule', async (req, res) => {
  try {
    const pool = await poolPromise
    const result = await pool.request()
    .input('table_name', sql.VarChar, req.body.table)
    .input('attr_name', sql.VarChar, req.body.attr)
    .input('rule_id', sql.VarChar, req.body.rule)
    .query('INSERT INTO Attribute_Rule_Relation(Table_Name, Attribute_name, Validation_ID) VALUES(@table_name,@attr_name,@rule_id)')

    res.json(result.recordset)
  }catch (err) {
    res.status(500)
    res.send(err.message)
  }
})

router.post('/remove_rule', async (req, res) => {
  try {
    const pool = await poolPromise
    const result = await pool.request()
    .input('table_name', sql.VarChar, req.body.table)
    .input('attr_name', sql.VarChar, req.body.attr)
    .input('rule_id', sql.VarChar, req.body.rule)
    .query('DELETE FROM Attribute_Rule_Relation WHERE Table_Name= @table_name AND Attribute_name = @attr_name AND Validation_ID = @rule_id')

    res.json(result.recordset)
  }catch (err) {
    res.status(500)
    res.send(err.message)
  }
})



router.get('/get_options/table/:table/attr/:attr', async (req, res) => {
  try {
    const pool = await poolPromise
    const result = await pool.request()
    .input('table_name', sql.VarChar, req.params.table)
    .input('attr_name', sql.VarChar, req.params.attr)
    .query('select * from Attribute_Options WHERE Table_Name = @table_name AND Attribute_name = @attr_name')      
    res.json(result.recordset)
  } catch (err) {
    res.status(500)
    res.send(err.message)
  }
})

router.post('/add_option', async (req, res) => {
  try {
    const pool = await poolPromise
    const result = await pool.request()
    .input('table_name', sql.VarChar, req.body.table)
    .input('attr_name', sql.VarChar, req.body.attr)
    .input('option_name', sql.VarChar, req.body.option)
    .query('INSERT INTO Attribute_Options(Table_Name, Attribute_name, Option_Name) VALUES(@table_name,@attr_name,@option_name)')

    res.json(result.recordset)
  }catch (err) {
    res.status(500)
    res.send(err.message)
  }
})

router.get('/get_foreign_keys/table/:table', async (req, res) => {
  try {
    const pool = await poolPromise
    let query="SELECT fk.name,OBJECT_NAME(fk.parent_object_id) 'Parent table',c1.name 'Parent column', OBJECT_NAME(fk.referenced_object_id) 'Referenced table', c2.name 'Referenced column' "+
    "FROM sys.foreign_keys fk "+
    "INNER JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id "+
    "INNER JOIN sys.columns c1 ON fkc.parent_column_id = c1.column_id AND fkc.parent_object_id = c1.object_id "+
    "INNER JOIN  sys.columns c2 ON fkc.referenced_column_id = c2.column_id AND fkc.referenced_object_id = c2.object_id "+
    "WHERE  OBJECT_NAME(fk.parent_object_id)=@table_name";

    console.log(query)
    const result = await pool.request()
    .input('table_name', sql.VarChar, req.params.table)
    .query(query)
    res.json(result.recordset)
  }catch (err) {
    res.status(500)
    res.send(err.message)
  }
})



router.get('/filter_attributes', async (req, res) => {
  try {
    const pool = await poolPromise
    const result = await pool.request()
    .query("SELECT * FROM Attribute_Filter")
    res.json(result.recordset)
  }catch (err) {
    res.status(500)
    res.send(err.message)
  }
})


router.get('/filter_attribute/table/:table/attr/:attr', async (req, res) => {
  try {
    const pool = await poolPromise
    const result = await pool.request()
    .input('table', sql.VarChar, req.params.table)
    .input('attr', sql.VarChar, req.params.attr)
    .query("SELECT * FROM Attribute_Filter WHERE Table_Name = @table AND Attribute_name = @attr")
    res.json({active:(result.recordset.length>0)})
  }catch (err) {
    res.status(500)
    res.send(err.message)
  }
})

router.get('/add_filter_attribute/table/:table/attr/:attr', async (req, res) => {
  try {
    const pool = await poolPromise
    const result = await pool.request()
    .input('table', sql.VarChar, req.params.table)
    .input('attr', sql.VarChar, req.params.attr)
    .query("INSERT INTO Attribute_Filter(Table_Name,Attribute_name) VALUES (@table,@attr) ")
    res.json({success:true})
  }catch (err) {
    res.status(500)
    res.send(err.message)
  }
})


router.get('/remove_filter_attribute/table/:table/attr/:attr', async (req, res) => {
  try {
    const pool = await poolPromise
    const result = await pool.request()
    .input('table', sql.VarChar, req.params.table)
    .input('attr', sql.VarChar, req.params.attr)
    .query("DELETE FROM Attribute_Filter WHERE Table_Name = @table AND Attribute_name = @attr")
    res.json({success:true})
  }catch (err) {
    res.status(500)
    res.send(err.message)
  }
})





module.exports = router;
