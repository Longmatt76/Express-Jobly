"use strict";

const { response } = require("express");
const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");
const e = require("express");

/** Related functions for jobs. */

class Jobs {
  // create a new instance of the jobs class and store data in the db

  static async create({ id, title, salary, equity, company_handle }) {
    const duplicateCheck = await db.query(
      `
        SELECT id from jobs WHERE id = $1`,
      [id]
    );
    //  check if job already exists
    if (duplicateCheck.rows[0]) {
      throw new BadRequestError(
        `Duplicates not allowed, job id ${id} already exists`
      );
    }
    const result = await db.query(
      `
    INSERT INTO jobs (title, salary, equity, company_handle)
    VALUES ($1, $2, $3, $4) RETURNING id, title, salary, equity,
    company_handle`,
      [title, salary, equity, company_handle]
    );

    const job = result.rows[0];
    return job;
  }

  //   find all jobs

  static async findAll(filters = {}) {
    // start with a base query to add to based upon the filters
    let baseQuery = `SELECT id, title, 
    salary, equity, company_handle AS company
    FROM jobs`;
    // declare empty arrays which will be used to push the values of the
    // WHERE clauses and the query values
    let whereClauses = [];
    let queryValues = [];

    const { title, minSalary, hasEquity } = filters;

    // if title, minSalary and hasEquity are present in filters thier values are now pushed
    // to the corresponding arrays declared above
    if (title) {
      queryValues.push(`%${title}%`);
      whereClauses.push(`title ILIKE $${queryValues.length}`);
    }

    if (minSalary !== undefined) {
      queryValues.push(`${minSalary}`);
      whereClauses.push(`salary >= $${queryValues.length}`);
    }

    if (hasEquity !== undefined) {
      whereClauses.push(`equity > 0`);
    }

    // if values have been pushed to the whereClauses array this builds upon the baseQuery string
    // by joining it with each WHERE clause on an AND
    if (whereClauses.length > 0)
      baseQuery += " WHERE " + whereClauses.join(" AND ");

    // complete the query string, await the db and return the response
    baseQuery += " ORDER BY id ";
    const jobRes = await db.query(baseQuery, queryValues);

    return jobRes.rows;
  }
  // given a job id return data about that job
  static async get(id) {
    const res = await db.query(
      `SELECT id,
        title, salary, equity,
        company_handle AS company
        FROM jobs WHERE id= $1`,
      [id]
    );
    const job = res.rows[0];
    if (!job) {
      throw new NotFoundError("Job not found");
    }
    return job;
  }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {title, salary, equity}
   *
   * Returns {id, title, salary, equity, company_handle}
   *
   * Throws NotFoundError if not found.
   */

  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {});

    const idVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE jobs 
                          SET ${setCols} 
                          WHERE id = ${idVarIdx} 
                          RETURNING id, 
                                    title, 
                                    salary, 
                                    equity, 
                                    company_handle AS company`;
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  //   select and delete a job from the db using the id parameter
  static async remove(id) {
    const res = await db.query(
      `
    DELETE FROM jobs 
    WHERE id = $1 
    RETURNING id`,
      [id]
    );

    const job = res.rows[0];
    if (!job) {
      throw new NotFoundError("Job not found");
    }
  }
}

module.exports = Jobs;
