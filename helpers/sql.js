const { BadRequestError } = require("../expressError");

// generates a SQL query using data from a JS object

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
 
  // checks if object is empty, throws error if so
  if (keys.length === 0) throw new BadRequestError("No data");

 
  // creates an array of SQL colums and values by mapping the keys object
   // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  // returns a string of column names and an array of values 
  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
