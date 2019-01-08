const {checkSchema} = require('express-validator/check');
const Promise = require('bluebird');

const {Error} = require('../helpers');
const {InputValidator} = require('../interceptors');

exports.accountsReg = [
  // validation schema
  checkSchema({
    first_name: {
      in: 'body',
      trim: true,
      isEmpty: {
        negated: true,
        errorMessage: (value, {req}) => req.__('VAL_ERRORS.USR_ACC_NEW_MISSING_F_NAME'),
      },
    },
    last_name: {
      in: 'body',
      optional: true,
      trim: true,
    },
    contact_phone: {
      in: 'body',
      trim: true,
      isEmpty: {
        negated: true,
        errorMessage: (value, {req}) => req.__('VAL_ERRORS.USR_ACC_NEW_MISSING_PHONE'),
      },
      isInt: {
        errorMessage: (value, {req}) => req.__('VAL_ERRORS.USR_ACC_NEW_INVALID_PHONE'),
      },
    },
    email: {
      in: 'body',
      trim: true,
      isEmpty: {
        negated: true,
        errorMessage: (value, {req}) => req.__('VAL_ERRORS.USR_ACC_NEW_MISSING_EMAIL'),
      },
      isEmail: {
        errorMessage: (value, {req}) => req.__('VAL_ERRORS.USR_ACC_NEW_INVALID_EMAIL'),
      },
    },
    password: {
      in: 'body',
      trim: true,
      isEmpty: {
        negated: true,
        errorMessage: (value, {req}) => req.__('VAL_ERRORS.USR_ACC_NEW_MISSING_PWD'),
      },
    },
    cnf_password: {
      in: 'body',
      trim: true,
      isEmpty: {
        negated: true,
        errorMessage: (value, {req}) => req.__('VAL_ERRORS.USR_ACC_NEW_MISSING_CNF_PWD'),
      },
      custom: {
        options: (value, {req}) => {
          // org password
          const {password} = req.body;
          return password && password === value;
        },
        errorMessage: (value, {req}) => req.__('VAL_ERRORS.USR_ACC_NEW_CNF_PWD_MISMATCH'),
      },
    },
  }),
  // validation interceptor
  InputValidator(),
  // controller
  (req, res, next) => {
    // host element from which params will be acquired
    const params = req.body;
    // begin process
    new Promise(async (resolve, reject) => {
      try {
        // check for any existing account
        const existingAcc = await res.locals.db.accounts.findOne({email: params.email});
        if (existingAcc) {
          reject(Error.ValidationError([{param: 'email', msg: res.__('VAL_ERRORS.USR_ACC_NEW_EMAIL_EXISTS')}]));
        } else {
          // init hash and salt for new password
          const {hash, salt} = res.locals.accounts.initPasswordHash(params.password);
          // create new account
          const account = await res.locals.db.accounts.create({
            email: params.email,
            password: {hash, salt},
          });
          // create new recipient for the account
          const profile = await res.locals.db.profile.create({
            account_id: account.id,
            profile: {
              first_name: params.first_name,
              last_name: params.last_name,
            },
            contact: {
              phone: params.contact_phone,
            },
          });
          // conclude
          resolve({
            account,
            profile,
          });
        }
      } catch (e) {
        reject(e);
      }
    }).asCallback((err, response) => {
      if (err) {
        next(err);
      } else {
        res.json(response);
      }
    });
  },
];
