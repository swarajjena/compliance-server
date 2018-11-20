
const { sql,poolPromise } = require('../db')

async function checkMandatory(master_db, master_attribute,value){
    if(value!=null && value != undefined && value != "")
        return true;
    else    
        return false;
}

async function checkShouldNotContainUrl(master_db, master_attribute,value){
    return true;
}

async function checkAllowLimitedOptions(master_db, master_attribute,value){
    try {
        const pool = await poolPromise
        const result = await pool.request()
        .input('table_name', sql.VarChar, master_db)
        .input('attr_name', sql.VarChar, master_attribute)
        .query('select * from Attribute_Options WHERE Table_Name = @table_name AND Attribute_name = @attr_name')      

        options = result.recordset.map(opt=>opt.Option_Name)

        console.log(options)
        console.log(value)


        if(options.indexOf(value.trim().toUpperCase())>=0)
            return true;
        else
            return false;
        

      } catch (err) {
        res.status(500)
        res.send(err.message)
      }
    
    return true;

}

validations = {
    "checkMandatory":checkMandatory,
    "checkShouldNotContainUrl":checkShouldNotContainUrl,
    "checkAllowLimitedOptions":checkAllowLimitedOptions
}




module.exports = validations;
