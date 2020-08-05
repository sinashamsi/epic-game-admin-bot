const express = require('express');

const {authenticate} = require('./../middleware/authenticate');

const {importAccounts} = require('./../service/account-service');

const {handleResponse} = require('./../utils/utils');


const router = express.Router();

router.post('/import', authenticate, async (req, res) => {
    try {
        if (!req.files) {
            handleResponse(res, false, "file Not Found");
        } else {
            let file = req.files.accounts;
            let result  = await importAccounts(file, req.user, req.account);
            handleResponse(res, true, result);
        }
    } catch (e) {
        console.log(e)
        handleResponse(res, false, e);
    }
});

module.exports = router;