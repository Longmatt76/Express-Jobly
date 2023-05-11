"use strict";

const { response } = require("express");
const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
      `SELECT handle
           FROM companies
           WHERE handle = $1`,
      [handle]
    );

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
      `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
      [handle, name, description, numEmployees, logoUrl]
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll(filters = {}) {
    // start with a base query to add to depending on the contents of the filters
    let baseQuery = `SELECT handle,
                            name,
                            description,
                            num_employees AS "numEmployees",
                            logo_url AS "logoUrl"
                     FROM companies`;
    // declare empty arrays to push the values of the where expressions and thier corresponding query values;
    // for example "WHERE name = $1" would be pushed to whereClauses and the company name say "Amazon" would be
    // pushed to the queryValues array, this defends against SQL injection.
    let whereClauses = [];
    let queryValues = [];

    // destructure the needed variables from the filters object
    const { name, minEmployees, maxEmployees } = filters;

    // checks if minEmployees is greater than max and throws error if so
    if (minEmployees > maxEmployees) {
      throw new BadRequestError(
        "Maximum employees must be greater than minimum"
      );
    }
    //  if the name, minEmployees and maxEmployees varibles are present in the filters object
    //  their values are now pushed to the corresponding arrays declared above
    if (name) {
      queryValues.push(`%${name}%`);
      whereClauses.push(`name ILIKE $${queryValues.length}`);
    }

    if (minEmployees !== undefined) {
      queryValues.push(minEmployees);
      whereClauses.push(`num_employees >= $${queryValues.length}`);
    }

    if (maxEmployees !== undefined) {
      queryValues.push(maxEmployees);
      whereClauses.push(`num_employees <= $${queryValues.length}`);
    }

    // if values have been pushed to the whereClauses array this builds upon the baseQuery string
    // by joining it with each WHERE clause on an AND
    if (whereClauses.length > 0) {
      baseQuery += " WHERE " + whereClauses.join(" AND ");
    }
    // complete the query string, await the db and return the response
    baseQuery += " ORDER BY name ";
    const companiesRes = await db.query(baseQuery, queryValues);

    return companiesRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
      `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
      [handle]
    );

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {
      numEmployees: "num_employees",
      logoUrl: "logo_url",
    });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
      `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
      [handle]
    );
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}

module.exports = Company;
