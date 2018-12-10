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
        .query('select TOP 30 * from Attribute_Filter')      

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
    let filters = req.body.filters;
    let output_type = req.body.output_type;
    
        

    let master_tables = [
      {table:"Jurisdiction_Master",identifier:"jm"},
      {table:"Law_Master",identifier:"lm"},
      {table:"Provision_Master",identifier:"pm"},
      {table:"Compliance_Master",identifier:"cm"}
    ];

    all_columns = []
    all_filters = []

    const pool = await poolPromise

    for(let master_table of master_tables){
      let result = await pool.request()
          .input('Table_Name', sql.VarChar, master_table.table)
          .query("select COLUMN_NAME from INFORMATION_SCHEMA.COLUMNS where TABLE_NAME = @Table_Name")

      let columns =  result.recordset.map(column => column.COLUMN_NAME)      
      let db_columns =  result.recordset.map(column => master_table.identifier+"."+column.COLUMN_NAME)
                          .filter(column => !(column.indexOf("_ID")>=0)) 

      let m_filters = filters.filter(fl => (fl.selected  && fl.selected.length>0 && columns.indexOf(fl.Attribute_name)>=0))
      m_filters = m_filters.map(filter => {
          let qry= "AND (";
          for (let opt of filter.selected){
            if(qry != "AND ("){
                qry = qry + " OR ";
            }          
            qry = qry + master_table.identifier+"."+filter.Attribute_name+" = '"+opt+"'";
          }
          qry = qry + ")";
          return qry;      
      })

      all_columns = [...all_columns , db_columns];
      all_filters = [...all_filters, m_filters];                          
    }
    

    output_results = [];

    if(output_type.law){
      let columns_sql_law = [...all_columns[0],...all_columns[1]].join(",");
      let filters_sql_law = [...all_filters[0],...all_filters[1]].join("");
  
      let qry = "SELECT "+ columns_sql_law + " FROM Law_Master as lm, Jurisdiction_Master as jm WHERE lm.Jurisdiction_ID = jm.Jurisdiction_ID "+filters_sql_law
      const result_law = await pool.request()
                                   .query(qry)

      let outp = result_law.recordset.map(result => {
        result["Type"]="Law";
        return result;
      })
      output_results = [...output_results,...outp]
    }

    if(output_type.provision){
      let columns_sql_pro = [...all_columns[0],...all_columns[1],...all_columns[2]].join(",");
      let filters_sql_pro = [...all_filters[0],...all_filters[1],...all_filters[2]].join("");
  
      let qry = "SELECT "+ columns_sql_pro + " FROM Provision_Master as pm, Law_Master as lm, Jurisdiction_Master as jm WHERE pm.Parent_Law_ID = lm.Law_ID AND lm.Jurisdiction_ID = jm.Jurisdiction_ID "+filters_sql_pro
      console.log(qry)
      const result_law = await pool.request()
                                   .query(qry)

      let outp = result_law.recordset.map(result => {
        result["Type"]="Provision";
        return result;
      })
      output_results = [...output_results,...outp]
    }

    if(output_type.compliance){
      let columns_sql_pro = [...all_columns[0],...all_columns[1],...all_columns[2],...all_columns[3]].join(",");
      let filters_sql_pro = [...all_filters[0],...all_filters[1],...all_filters[2],...all_filters[3]].join("");
  
      let qry = "SELECT "+ columns_sql_pro + " FROM Compliance_Master as cm, Provision_Master as pm, Law_Master as lm, Jurisdiction_Master as jm WHERE (cm.Parent_Law_ID = lm.Law_ID OR cm.Parent_Provision_ID = pm.Provision_ID) AND pm.Parent_Law_ID = lm.Law_ID AND lm.Jurisdiction_ID = jm.Jurisdiction_ID "+filters_sql_pro
      console.log(qry)
      const result_law = await pool.request()
                                   .query(qry)

      let outp = result_law.recordset.map(result => {
        result["Type"]="Compliance";
        return result;
      })
      output_results = [...output_results,...outp]
    }



    res.json(output_results);
    

  } catch (err) {
    res.status(500)
    res.send(err.message)
  }
})





module.exports = router;
