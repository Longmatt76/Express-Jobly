"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  testJobIds,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
  let newJob = {
    title: "NewJob",
    salary: 1000,
    equity: "0.25",
    company_handle: "c1",
  };

  test("works", async function () {
    let job = await Job.create(newJob);
    expect(job).toEqual({ ...newJob, id: expect.any(Number) });
  });
});

/************************************** findAll */
describe("findAll", function () {
  test("works: no filter", async function () {
    let jobs = await Job.findAll();
    expect(jobs).toEqual([
      {
        id: testJobIds[0],
        title: "Job1",
        salary: 100,
        equity: "0.1",
        company: "c1",
      },
      {
        id: testJobIds[1],
        title: "Job2",
        salary: 200,
        equity: "0.2",
        company: "c1",
      },
      {
        id: testJobIds[2],
        title: "Job3",
        salary: 300,
        equity: "0",
        company: "c1",
      },
      {
        id: testJobIds[3],
        title: "Job4",
        salary: null,
        equity: null,
        company: "c1",
      },
    ]);
  });

  test("works: with minSalary", async function () {
    let filters = { minSalary: 200 };
    let jobs = await Job.findAll(filters);
    expect(jobs).toEqual([
      {
        id: testJobIds[1],
        title: "Job2",
        salary: 200,
        equity: "0.2",
        company: "c1",
      },
      {
        id: testJobIds[2],
        title: "Job3",
        salary: 300,
        equity: "0",
        company: "c1",
      },
    ]);
  });
  test("works: with equity", async function () {
    let jobs = await Job.findAll({ hasEquity: true });
    expect(jobs).toEqual([
      {
        id: testJobIds[0],
        title: "Job1",
        salary: 100,
        equity: "0.1",
        company: "c1",
      },
      {
        id: testJobIds[1],
        title: "Job2",
        salary: 200,
        equity: "0.2",
        company: "c1",
      },
    ]);
  });
});

/************************************** get */

describe("get", function () {
  test("works", async function () {
    let job = await Job.get(testJobIds[0]);
    expect(job).toEqual({
      id: testJobIds[0],
      title: "Job1",
      salary: 100,
      equity: "0.1",
      company: "c1",
    });
  });

  test("throw error: if job not found", async function () {
    try {
      await Job.get(46);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", function () {
  const updateData = {
    title: "NewDuty",
    salary: 10000,
    equity: null,
  };

  test("works", async function () {
    let job = await Job.update(testJobIds[0], updateData);
    expect(job).toEqual({
      id: testJobIds[0],
      company: "c1",
      ...updateData,
    });
  });

  test("not found if no such job", async function () {
    try {
      await Job.update(45, {
        title: "weightlifter",
      });
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    try {
      await Job.update(testJobIds[0], {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    await Job.remove(testJobIds[0]);
    const res = await db.query("SELECT id FROM jobs WHERE id=$1", [
      testJobIds[0],
    ]);
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such job", async function () {
    try {
      await Job.remove(0);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
