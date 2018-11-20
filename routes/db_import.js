const express = require('express');
const router = express.Router();
const { sql,poolPromise } = require('../db')
var randomstring = require("randomstring");
const fs = require('fs');
const xlsx = require('node-xlsx');
const path = require('path')
const SqlString = require('SqlString')

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




router.get('/sheet_headers/:filename', function(req, res) {
  console.log()

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

router.get('/attribute_linkage', function (req, res) {
  try {
    let filepath=__dirname+"/../files/linkage.json";

    if(!fs.existsSync(filepath)){
      res.status(500)
      res.send("file_does_not_exists")
    }

    fs.readFile(filepath, function(err,data) {
      if(err) {
        res.status(500)
        res.send(err.message)
      }
      res.json({data:JSON.parse(data)})
    });
  }catch (err) {
    res.status(500)
    res.send(err.message)
  }
})


router.post('/store_attribute_linkage', function (req, res) {
  try {
    let filepath=__dirname+"/../files/linkage.json";
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

    console.log(input_data)

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

      let name_string = table_name.replace("Master","Name");

      const pool = await poolPromise
      const result = await pool.request()
          .input('field_name', sql.VarChar, name_string)
          .input('field_value', sql.VarChar, input_data[row][name_string])
          .query('select  * from '+table_name+ " where "+name_string+" = @field_value")
          
      if(result.recordset.length<=0){
        if(name_string!="Jurisdiction_Name"){
          for(let rw of workSheetsFromFile[0]["data"]){
            if(rw[law_name_idx]==input_data[row][name_string]){
                let parent_jurisdiction = rw[parent_jurs_idx]
                console.log(parent_jurisdiction+" lllll")
                const rslt = await pool.request()
                .input('jurisdiction_name', sql.VarChar, parent_jurisdiction)
                .query('select  * from Jurisdiction_Master where Jurisdiction_Name = @jurisdiction_name') 
                
                if(rslt.recordset.length>0){
                    input_data[row]["Jurisdiction_ID"]=rslt.recordset[0]["Jurisdiction_ID"]
                }
                break;
            }
          }
        }

        let key_val = "";
        let val_val = "";
  
        for(let key in input_data[row]){
          key_val=(key_val=="")?key_val:key_val + ", ";
          val_val=(val_val=="")?val_val:val_val + ", ";
  
          key_val+= key;
          val_val+= "'"+input_data[row][key]+"'"
          
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
