const express = require('express');
const router = express.Router();
const { sql,poolPromise } = require('../db')
var randomstring = require("randomstring");
const fs = require('fs');
const xlsx = require('node-xlsx');
const path = require('path')
const escapeString = require('sql-escape-string')

var multer = require("multer")

var validations = require("../validation/validation")

const storage = multer.diskStorage({
  destination: 'files',
  filename: function (req, file, callback) {
    let file_name = randomstring.generate();
    console.log(file_name);
    req.file_name=file_name;
    callback(null, file_name + path.extname(file.originalname));
  }
});


var upload = multer({ storage: storage });

router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

function mssql_real_escape_string (str) {
  return escapeString(str)
}


router.get('/sheet_headers/:filename', function(req, res) {

  let filepath=__dirname+"/../files/"+req.params.filename+".xlsx";

  const workSheetsFromFile = xlsx.parse("files/"+req.params.filename+".xlsx");

  res.json(workSheetsFromFile[0]["data"][0])
  
});

router.post('/sheet_data', function(req, res) {
  
  const workSheetsFromFile = xlsx.parse("files/"+req.body.filename+".xlsx");

  let requested_ids=req.body.requested_ids;

  output_data = workSheetsFromFile[0]["data"].map(row => {
    let out_row=[]
    for(let i of requested_ids){
      out_row.push(row[i])
    }

    return out_row;
  })  

  output_data.shift();


  res.json(output_data)
  
});




router.get('/sheet_names/:filename', function(req, res) {

  let filepath=__dirname+"/../files/"+req.params.filename+".xlsx";

  const workSheetsFromFile = xlsx.parse("files/"+req.params.filename+".xlsx");

  res.json(workSheetsFromFile)
  
});

router.get('/attribute_linkage/:filename', function (req, res) {
  try {

    const workSheetsFromFile = xlsx.parse("files/"+req.params.filename+".xlsx");
    
    let all_headers = workSheetsFromFile[0]["data"][0];

    let filepath;

    if(all_headers.length<30)
        filepath=__dirname+"/../files/linkage.json";
    else  
        filepath=__dirname+"/../files/linkage_cor.json";


    if(!fs.existsSync(filepath)){
      res.status(500)
      res.send("file_does_not_exists")
      return;
    }

    fs.readFile(filepath, function(err,data) {
      if(err) {
        res.status(500)
        res.send(err.message)
      }
      let existing_attribute_linkage = JSON.parse(data);


      let complete_attribute_linkage = all_headers.map((attr,key) =>{
          let headers_in_existing_linkage = existing_attribute_linkage.map(att=>att.header);
          let pos = headers_in_existing_linkage.indexOf(attr);
          if(pos>=0){
              let dt=existing_attribute_linkage[pos];
              return new Object({id:key,header:attr, master_db:dt.master_db,master_attribute:dt.master_attribute,master_attribute_options:dt.master_attribute_options});
          }else{
            return new Object({id:key,header:attr, master_db:null,master_attribute:null,master_attribute_options:[]});
          } 
      })

      res.json({data:complete_attribute_linkage});


    
    });
  }catch (err) {
    res.status(500)
    res.send(err.message)
  }
})


router.post('/store_attribute_linkage', function (req, res) {
  try {

    let filepath;
    if(req.body.linkage.length<30)
        filepath=__dirname+"/../files/linkage.json";
    else  
        filepath=__dirname+"/../files/linkage_cor.json";

    fs.writeFile(filepath, JSON.stringify(req.body.linkage), function(err) {
      if(err) {
        res.status(500)
        res.send(err.message)
       }
      res.json({success:true})
    }); 
  }catch (err) {
    res.status(500)
    res.send(err.message)
  }
})



router.post('/upload_file', upload.single('upload'), (req, res) => {
  if (!req.file) {
    console.log("No file received");
    return res.send({
      success: false
    });

  } else {
    console.log('file received'+req.file_name);
    return res.send({
      success: true,
      file_name: req.file_name
    })
  }
});

rules=["checkMandatory","checkShouldNotContainUrl","checkAllowLimitedOptions"]

router.post('/validate_data', async (req, res) => {

  try {
    input_data = req.body.input_data;
    attribute_linkage = req.body.attribute_linkage;
    table_name = req.body.table_name;
    const pool = await poolPromise

    rules_applicable=[]
    for (let attr of attribute_linkage){

      const result = await pool.request()   
      .input('Table_Name', sql.VarChar, attr["master_db"])
      .input('Attribute_Name', sql.VarChar, attr["master_attribute"])
      .query('SELECT * FROM Attribute_Rule_Relation WHERE Table_Name = @Table_Name AND Attribute_Name = @Attribute_Name')

      rules_applicable.push(result.recordset.map(rule=>[rule.Attr_Rule_ID,rules[rule.Validation_ID-1]]))
    }


    validation_result=[]

//    console.log(input_data)

    for(let row in input_data){
        let val_row = [] 
        for(let attr in attribute_linkage){
          let val_success = true;
          for(let rule of rules_applicable[attr]){

              val_success = val_success && await validations[rule[1]](attribute_linkage[attr]["master_db"], 
              attribute_linkage[attr]["master_attribute"], input_data[row]["data"][attr].value)
          }
          val_row.push(val_success)
        }
        validation_result.push(val_row)
    }


    res.json({success:"true", result:validation_result})
  }catch (err) {
    res.status(500)
    res.send(err.message)
  }
})

router.post('/store_validated_data', async (req, res) => {
  try {
    input_data = req.body.input_data;
    attribute_linkage = req.body.attribute_linkage;
    table_name = req.body.table_name;


    const workSheetsFromFile = xlsx.parse("files/"+req.body.filename+".xlsx");



    let law_name_idx=workSheetsFromFile[0]["data"][0].indexOf("Law Name")

    let parent_jurs_idx=workSheetsFromFile[0]["data"][0].indexOf("Parent Jurisdiction Name")
    

    for(let row in input_data){

      let name_string = ""
      if(table_name === "Compliance_Master")
          name_string = "Task_Name";
      else
          name_string = table_name.replace("Master","Name");

      const pool = await poolPromise
      const result = await pool.request()
          .input('field_name', sql.VarChar, name_string)
          .input('field_value', sql.VarChar, input_data[row][name_string])
          .query('select  * from '+table_name+ " where "+name_string+" = @field_value")
          
      if(result.recordset.length<=0){

        let row_data_from_excel = null;
        let name_idx = workSheetsFromFile[0]["data"][0].indexOf(name_string.replace("_"," "));
        for(let rw of workSheetsFromFile[0]["data"]){
          if(rw[name_idx]==input_data[row][name_string]){
            row_data_from_excel = rw;
          }
        }

        const fk_pool = await poolPromise
        const fk_result = await fk_pool.request()
            .input('table_name', sql.VarChar, table_name)
            .query(
              " SELECT fk.name,OBJECT_NAME(fk.parent_object_id) 'Parent table',c1.name 'Parent column',OBJECT_NAME(fk.referenced_object_id) 'Referenced table',c2.name 'Referenced column'"+
              " FROM   sys.foreign_keys fk " +
              " INNER  JOIN  sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id "+
              " INNER  JOIN  sys.columns c1 ON fkc.parent_column_id = c1.column_id AND fkc.parent_object_id = c1.object_id "+
              " INNER  JOIN  sys.columns c2 ON fkc.referenced_column_id = c2.column_id AND fkc.referenced_object_id = c2.object_id "+
              " WHERE  OBJECT_NAME(fk.parent_object_id)=@table_name"      
            )

        for (let fk_res of fk_result.recordset){
          let foreign_name_string = fk_res["Referenced table"].replace("Master","Name");
          let foreign_idx = workSheetsFromFile[0]["data"][0].indexOf(foreign_name_string.replace("_"," "));
          if(foreign_idx<0)
            continue;
          let foreign_value = row_data_from_excel[foreign_idx];
          const fs_pool = await poolPromise
          const fs_result = await pool.request()
              .input('field_value', sql.VarChar, foreign_value)
              .query('select  * from '+fk_res["Referenced table"]+ " where "+foreign_name_string+" = @field_value")
          
          if(fs_result.recordset.length<=0)
              continue;

          foreign_value = fs_result.recordset[0][fk_res["Referenced column"]];

          input_data[row][fk_res["Parent column"]] = foreign_value; 

          
        }

        let key_val = "";
        let val_val = "";
  
        for(let key in input_data[row]){
          key_val=(key_val=="")?key_val:key_val + ", ";
          val_val=(val_val=="")?val_val:val_val + ", ";
  
          key_val+= key;
          console.log(typeof input_data[row][key])
          if(typeof input_data[row][key] === "string"){
            input_data[row][key] = mssql_real_escape_string(input_data[row][key]);
            console.log("yey")
          }
          else{
            input_data[row][key] = "'"+input_data[row][key]+"'";
          }
          val_val+= input_data[row][key]
          
        }
        var query = 'INSERT INTO '+table_name+'('+key_val+') VALUES('+val_val+")";
        console.log(query)
  
        const result2 = await pool.request()
                   .query(query);
      }
    }
    res.json({success:true})
  } catch (err) {
    res.status(500)
    res.send(err.message)
  }


})

module.exports = router;
