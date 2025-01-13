/**
 * Copyright (c) 1998-2018 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 */
/**
 * The purpose **********
 *
 * @author Mohammed Sumon
 * @version 1.0
 *
 * @version 1.1 - Regina dela Cruz - get/set custom segments dynamically
 * @version 1.2 - Regina dela Cruz - 5/11 - offset account
 * @version 1.3 - Regina dela Cruz - 6/36 - updates based on Hamza's email - changed computation for debit amount
 * @version 1.4 - Martin Bolf - 1/16/2019 - Enabled PST Tax Rebate
 * @version 1.8 - Ahmed Hamidi -10/11/2019 - Enabled PST Tax Rebate - offset account fix.
 * @version 1.9 - Danielle Sika - 1/3/2020 - Correct PST Tax Rebate math and account setting. (Most up to date)
 * @version 1.10 - Danielle Sika - 1/21/2020 - Expense Report compatible
 */
var contextObj = nlapiGetContext();

function customizeGlImpact(transactionRecord, standardLines, customLines, book) {
    try {
        NSUtils.logMessage('customizeGlImpact', 'START');
        var context = nlapiGetContext().getExecutionContext();

        NSUtils.logMessage('customizeGlImpact', 'context - ' + context);

        var bRunSsuiteGL = transactionRecord
            .getFieldValue('custbody_nfp_cdn_rebate_gl');
        NSUtils.logMessage('customizeGlImpact', 'bRunSsuiteGL - ' +
            bRunSsuiteGL);

        var remainingUsage = contextObj.getRemainingUsage();
        NSUtils.logMessage('customizeGlImpact', 'remainingUsage BEFORE - ' +
            remainingUsage);

        var arrRebateAccSrchResults = [];

        if (bRunSsuiteGL == 'T') {

            var arrStdLineDet = [];

            //gets all the information from the standard lines
            for (var k = 1; k < standardLines.getCount(); k++) {
                var currStdLine = standardLines.getLine(k);
                var debitAmount = currStdLine.getDebitAmount();
                var creditAmount = currStdLine.getCreditAmount();
                var idStdAccount = currStdLine.getAccountId();
                var idStdEntity = currStdLine.getEntityId();
                var idProj = transactionRecord.getLineItemValue('expense', 'custcol_cseg_npo_grant', k);
                //var idFunder = currStdLine.getClassId();
                var department = currStdLine.getDepartmentId();
                if ((debitAmount != 0 || creditAmount != 0) &&
                    idStdAccount != null) {
                    var stdmap = {
                        "idStdAccount": idStdAccount,
                        "idStdEntity": idStdEntity,
                        "debitAmount": debitAmount,
                        "creditAmount": creditAmount,
                        "idProj": idProj,
                        "department": department
                    }
                }

                NSUtils.logMessage('customizeGlImpact', 'stdmap - ' + k,
                    stdmap);
                //adds information from each standard line to an array
                arrStdLineDet.push(stdmap);
            }

            //get record type and line count of expense sublist
            var recType = transactionRecord.getRecordType();

            var iSubLstCntExpense = transactionRecord
                .getLineItemCount('expense');

            //tax total is the GST/HST amount on VB
            var fTaxTotalAmount = transactionRecord.getFieldValue('taxtotal');
            NSUtils.logMessage('customizeGlImpact', 'recType - ' + recType);
            NSUtils.logMessage('customizeGlImpact', 'iSubLstCntExpense - ' +
                iSubLstCntExpense);
            NSUtils.logMessage('customizeGlImpact', 'fTaxTotalAmount - ' +
                fTaxTotalAmount);

            var arrExpTaxJurisIds = [];
            var arrTaxCodeGrps = [];

            for (var t = 1; t <= iSubLstCntExpense; t++) {
                //idTaxcode = tax group
                var idTaxcode = transactionRecord.getLineItemValue('expense',
                    'taxcode', t);
                NSUtils.logMessage('customizeGlImpact', 'idTaxcode - ' +
                    idTaxcode);
                if (!NSUtils.isEmpty(idTaxcode)) {
                    //regina - added to get the tax code
                    //this makes sure each tax group in array is unique
                    if (!NSUtils.inArray(idTaxcode, arrTaxCodeGrps)) {
                        arrTaxCodeGrps.push(idTaxcode);
                    }

                    //tax jurisdiction
                    var idExpTaxJurisdiction = transactionRecord
                        .getLineItemValue('expense',
                            'custcol_tc_jurisdiction', t);
                    if (!NSUtils.isEmpty(idExpTaxJurisdiction)) {
                        arrExpTaxJurisIds.push(idExpTaxJurisdiction);
                    }
                }

            }

            //regina - get the tax code for the tax groups selected
            //takes you to function getTaxAccounts using input of unique tax groups
            //returns array of array(? or maybe its a dictionary)
            var objTaxAccounts = getTaxAccounts(arrTaxCodeGrps);
            NSUtils.logMessage('customizeGlImpact',
                'objTaxAccounts - ' +
                JSON.stringify(objTaxAccounts));
            var arrRebateRecDetails = [];

            if (arrExpTaxJurisIds.length > 0) {
                // Sort
                arrExpTaxJurisIds.sort();
                NSUtils.logMessage('arrExpTaxJurisIds after sort',
                    'arrExpTaxJurisIds - ' +
                    arrExpTaxJurisIds);

                // Unique Elements
                var idPrevJurisdiction = "";
                var arrUniqueJurisIds = [];

                for (var b = 0; b < arrExpTaxJurisIds.length; b++) {
                    var idCurrJurisdiction = arrExpTaxJurisIds[b];

                    if (idCurrJurisdiction != idPrevJurisdiction) {
                        arrUniqueJurisIds.push(idCurrJurisdiction);
                        idPrevJurisdiction = idCurrJurisdiction;
                    }
                }
                //get rebate accounts for the tax jurisdiction
                arrRebateAccSrchResults = searchRebateAccount(arrUniqueJurisIds);
                NSUtils.logMessage('customizeGlImpact',
                    'arrRebateAccSrchResults.length - ' +
                    arrRebateAccSrchResults.length);
            }

            //loop through the VB expense lines to get all the relevant values
            for (var t = 1; t <= iSubLstCntExpense; t++) { //iSubLstCntExpense
                //idTaxcode = tax group internal ID
                var idTaxcode = transactionRecord.getLineItemValue('expense',
                    'taxcode', t);

                //flTaxRate - GST percent at line level
                var flTaxRate = parseFloat(transactionRecord.getLineItemValue('expense',
                    'taxrate1', t)) || 0;
                flTaxRate = flTaxRate / 100;

                //danielle - 1/3/2020 no reference to PST rate
                //flTaxRate2 = PST percent at line level
                var flTaxRate2 = parseFloat(transactionRecord.getLineItemValue('expense',
                    'taxrate2', t)) || 0;
                flTaxRate2 = flTaxRate2 / 100;

                NSUtils.logMessage('customizeGlImpact', 'idTaxcode - ' +
                    idTaxcode);
                NSUtils.logMessage('customizeGlImpact', 'flTaxRate - ' +
                    flTaxRate);

                //if there's a tax group, then continue on with getting other information
                if (!NSUtils.isEmpty(idTaxcode)) {
                    //idExpAccount = account at line level of VB
                    if (recType === 'expensereport'){
                        var expenseCategory = transactionRecord.getLineItemValue('expense', 'category', t);
                        var idExpAccountSearch = NSUtils.search('expensecategory', null,
                            [new nlobjSearchFilter('internalid', null, 'is', expenseCategory)],
                            [new nlobjSearchColumn("name"), new nlobjSearchColumn("expenseacct")]);
                        NSUtils.logMessage('customizeGlImpact - expense report', 'search results - ' +
                            JSON.stringify(idExpAccountSearch));
                        var idExpAccount = idExpAccountSearch[0].getValue('expenseacct');
                        NSUtils.logMessage('customizeGlImpact - expense report', 'account - ' + t +
                            idExpAccount);
                    }
                    else {
                        var idExpAccount = transactionRecord.getLineItemValue(
                            'expense', 'account', t); // expense account
                        NSUtils.logMessage('customizeGlImpact', 'account - ' + t + ': ' +
                            idExpAccount);
                    }

                    if (!NSUtils.isEmpty(idExpAccount)) {
                        idExpAccount = parseInt(idExpAccount);
                    }
                    //idExpDepartment = department at line level of VB
                    var idExpDepartment = transactionRecord.getLineItemValue(
                        'expense', 'department', t);
                    if (!NSUtils.isEmpty(idExpDepartment)) {
                        idExpDepartment = parseInt(idExpDepartment);
                    }
                    //idExpLocation = location at line level of VB
                    var idExpLocation = transactionRecord.getLineItemValue(
                        'expense', 'location', t);
                    if (!NSUtils.isEmpty(idExpLocation)) {
                        idExpLocation = parseInt(idExpLocation);
                    }
                    //idExpProj = custom segment "Projects ID"
                    var idExpProj = transactionRecord.getLineItemValue(
                        'expense', 'custcol_cseg_npo_grant', t);
                    if (!NSUtils.isEmpty(idExpProj)) {
                        idExpProj= parseInt(idExpProj);
                    }
                    //idExpFunder = class at line level (renamed in acct to Funder)
                    // var idExpFunder = transactionRecord.getLineItemValue(
                    //     'expense', 'class', t);

                    // if (!NSUtils.isEmpty(idExpFunder)) {
                    //     idExpFunder = parseInt(idExpFunder);
                    //     NSUtils.logMessage('customizeGlImpact',
                    //         'parse idExpFunder 193 '+idExpFunder);
                    // }

                    //regina - 6/28 get taxaccount
                    var objPstTaxAccounts = objTaxAccounts[2];
                    var objGstTaxAccounts = objTaxAccounts[1];
                    var pstTaxRebateAcc = parseInt(objPstTaxAccounts[idTaxcode]) || 0;
                    var gstTaxRebateAcc = parseInt(objGstTaxAccounts[idTaxcode]) || 0;
                    NSUtils.logMessage('customizeGlImpact line 215',
                        'pstTaxRebateAcc '+pstTaxRebateAcc);
                    NSUtils.logMessage('customizeGlImpact line 217',
                        'idTaxcode '+idTaxcode);
                    NSUtils.logMessage('customizeGlImpact line 219',
                        'objPstTaxAccounts '+JSON.stringify(objPstTaxAccounts));
                    NSUtils.logMessage('customizeGlImpact line 221',
                        'objGstTaxAccounts '+JSON.stringify(objGstTaxAccounts));

                    //regina - 2/6/2018 - get custom segments dynamically
                    var arrCustomSegmentIds = getCustomSegments();
                    var objCustSegmentData = {};
                    var stSublistId = 'expense';
                    for (var idx = 0; idx < arrCustomSegmentIds.length; idx++) {
                        var stFldId = arrCustomSegmentIds[idx];
                        objCustSegmentData[stFldId] = transactionRecord.getLineItemValue(stSublistId, stFldId, t);

                        if (!NSUtils.isEmpty(objCustSegmentData[stFldId])) {
                            objCustSegmentData[stFldId] = parseInt(objCustSegmentData[stFldId]);
                        }
                    }
                    //end - regina


                    var idExpMemo = transactionRecord.getLineItemValue(
                        'expense', 'memo', t);
                    var idExpTaxJurisdiction = transactionRecord
                        .getLineItemValue('expense',
                            'custcol_tc_jurisdiction', t);
                    NSUtils.logMessage('customizeGlImpact',
                        'idExpTaxJurisdiction - ' + idExpTaxJurisdiction);
                    var fExpAmount = parseFloat(transactionRecord
                        .getLineItemValue('expense', 'amount', t)); // get

                    // the amount for which rebate needs to be calculated
                    NSUtils.logMessage('customizeGlImpact', 'idExpAccount - ' + idExpAccount +
                        ', idExpDepartment - ' + idExpDepartment +
                        ', idExpLocation - ' + idExpLocation +
                        ', idExpMemo - ' + idExpMemo +
                        ', fExpAmount - ' + fExpAmount);

                    // array starts at 0 but sublist starts at 1 so hence the offset of t using i
                    var i = t-1;
                    NSUtils.logMessage('customizeGlImpact', 'line 258 i - ' + i);
                    NSUtils.logMessage('customizeGlImpact', 'arrRebateAccSrchResults - ' + JSON.stringify(arrRebateAccSrchResults));
                    NSUtils.logMessage('customizeGlImpact', 'arrRebateAccSrchResults[0] - ' + JSON.stringify(arrRebateAccSrchResults[0]));

                    var idRebateRecDetails = arrRebateAccSrchResults[0].idJurisdiction;
                    NSUtils.logMessage('customizeGlImpact', 'idRebateRecDetails - ' + idRebateRecDetails);
                    var gstRebateFactor = parseFloat(arrRebateAccSrchResults[0].idGSTRebateFactor);
                    var hstRebateFactor = parseFloat(arrRebateAccSrchResults[0].idHSTRebateFactor);
                    var gstRebateAcc = arrRebateAccSrchResults[0].idGSTRebateAcc;
                    var hstRebateAcc = arrRebateAccSrchResults[0].idHSTRebateAcc;

                    //regina - 3/18 - add gst/hst offset
                    var idGSTOffsetAcc = arrRebateAccSrchResults[0].idGSTOffsetAcc;
                    var idHSTOffsetAcc = arrRebateAccSrchResults[0].idHSTOffsetAcc;

                    //1.7 ahmed - if no offset use expense account.
                    var idPSTOffsetAcc = arrRebateAccSrchResults[0].idPSTOffsetAcc;
                    idPSTOffsetAcc = (idPSTOffsetAcc == 0) ? idExpAccount : idPSTOffsetAcc;

                    //regina - 5/11 - if blank then use expense account
                    idGSTOffsetAcc = (idGSTOffsetAcc == 0) ? idExpAccount : idGSTOffsetAcc;
                    idHSTOffsetAcc = (idHSTOffsetAcc == 0) ? idExpAccount : idHSTOffsetAcc;

                    //mbolf - 1/16/2019 - add PST Rebate Factor, Rebate Acc, Offset Acc, Rate
                    var pstRebateFactor = parseFloat(arrRebateAccSrchResults[0].idPSTRebateFactor);
                    var pstRebateAcc = arrRebateAccSrchResults[0].idPSTRebateAcc;
                    //var idPSTOffsetAcc = arrRebateAccSrchResults[i].idPSTOffsetAcc;
                    var pstRate = arrRebateAccSrchResults[0].idpSTRate;
                    NSUtils.logMessage('customizeGlImpact', 'gstRebateAcc - ' + gstRebateAcc +
                        ', hstRebateAcc - ' + hstRebateAcc +
                        ', idGSTOffsetAcc - ' + idGSTOffsetAcc +
                        ', idHSTOffsetAcc - ' + idHSTOffsetAcc +
                        ', idPSTOffsetAcc - ' + idPSTOffsetAcc +
                        ', pstRebateAcc - ' + pstRebateAcc
                    );

                    //------------------------


                    var gstHstRate = arrRebateAccSrchResults[0].idGSTHSTRate;
                    NSUtils.logMessage('customizeGlImpact',
                        'gstRebateAcc - ' + gstRebateAcc);
                    NSUtils.logMessage('customizeGlImpact',
                        'hstRebateAcc - ' + hstRebateAcc);

                    //mbolf - 1/16/2019 - PST Rebate Acc log
                    NSUtils.logMessage('customizeGlImpact',
                        'pstRebateAcc - ' + pstRebateAcc);

                    if (idRebateRecDetails == idExpTaxJurisdiction) {

                        //Added
                        var expRebate = 0;
                        var taxRebate = 0;

                        if (pstRebateFactor > 0) {
                            var idStdEntity = '';
                            var idStdEntityExp = '';
                            var pstRebate = 0;

                            //regina - 6/28
                            var expRebate = 0;
                            var taxRebate = 0;

                            if (!NSUtils.isEmpty(fExpAmount)) {
                                //gstRebate = gstRebateFactor * fExpAmount * gstHstRate;
                                ////danielle - change flTaxRate to flTaxRate2
                                pstRebate = pstRebateFactor * fExpAmount * flTaxRate2;
                                pstRebate = NSUtils.roundDecimalAmount(pstRebate, 2);
                                NSUtils.logMessage('customizeGlImpact',
                                    'pstRebateFactor =' + pstRebateFactor +
                                    ', fExpAmount = ' + fExpAmount +
                                    ', flTaxRebate2 = ' + flTaxRate2);
                            }

                            //regina - 6/28 - calculate correct rebate amounts
                            ////danielle - change flTaxRate to flTaxRate2
                            expRebate = (fExpAmount * flTaxRate2) - pstRebate;
                            expRebate = NSUtils.roundDecimalAmount(expRebate, 2);

                            taxRebate = pstRebate + expRebate;
                            taxRebate = NSUtils.roundDecimalAmount(taxRebate, 2);
                            NSUtils.logMessage('customizeGlImpact',
                                'pstRebate =' + pstRebate +
                                ', expRebate = ' + expRebate +
                                ', taxRebate = ' + taxRebate);
                        } else if (pstRebateFactor == 0) {
                            pstRebate = 0;
                            expRebate = NSUtils.roundDecimalAmount(fExpAmount*flTaxRate2, 2);
                            taxRebate = expRebate;

                        }

                        for (y = 0; y < arrStdLineDet.length; y++) {
                            if (arrStdLineDet[y].idStdAccount == pstRebateAcc) {
                                idStdEntity = arrStdLineDet[y].idStdEntity;
                            }
                            if (arrStdLineDet[y].idStdAccount == idExpAccount) {
                                idStdEntityExp = arrStdLineDet[y].idStdEntity;
                            }
                            if (!NSUtils.isEmpty(arrStdLineDet[y].idProj)){
                                idProj = arrStdLineDet[y].idProj;
                            }
                            // if (!NSUtils.isEmpty(arrStdLineDet[y].idFunder)){
                            //     idFunder = arrStdLineDet[y].idFunder;
                            // }
                        }

                        if (pstRebate != 0 && !NSUtils.isEmpty(pstRebate)) {
                            // Create Debit Line
                            var newPstDebitLine = customLines.addNewLine();
                            NSUtils.logMessage('customizeGlImpact',
                                'pstRebateAcc =' + pstRebateAcc +
                                ', pstRebate = ' + pstRebate +
                                ', idExpLocation = ' + idExpLocation +
                                ', idExpDepartment = ' + idExpDepartment +
                                ', idExpMemo = ' + idExpMemo +
                                ', idExpProj = ' + idExpProj
                            );
                            if (!NSUtils.isEmpty(pstRebateAcc) && !isNaN(pstRebateAcc)) {
                                //acct set on the VB at the line item
                                newPstDebitLine.setAccountId(parseInt(pstRebateAcc));
                                NSUtils.logMessage('create debit line',
                                    'pstRebateAcc - ' + parseInt(pstRebateAcc));
                            }
                            else {
                                newPstDebitLine.setAccountId(parseInt(pstRebateAcc));
                                NSUtils.logMessage('create debit line',
                                    'pstRebateAcc - ' + parseInt(pstRebateAcc));
                            }
                            if (!NSUtils.isEmpty(pstRebate)) {
                                newPstDebitLine.setDebitAmount(pstRebate);
                            }
                            if (!NSUtils.isEmpty(idExpLocation)) {
                                newPstDebitLine
                                    .setLocationId(idExpLocation);
                            }
                            if (!NSUtils.isEmpty(idExpDepartment)) {
                                newPstDebitLine
                                    .setDepartmentId(idExpDepartment);
                            }
                            if (!NSUtils.isEmpty(idExpMemo)) {
                                newPstDebitLine.setMemo(idExpMemo);
                            }
                            // if (!NSUtils.isEmpty(idExpFunder)) {
                            //     newPstDebitLine.setClassId(idExpFunder);
                            //     NSUtils.logMessage('customizeGlImpact',
                            //         'set newPstDebitLine class 347 '+idExpFunder);
                            // }
                            if (!NSUtils.isEmpty(idExpProj)) {
                                newPstDebitLine.setSegmentValueId('cseg_npo_grant', idExpProj);
                            }
                            //regina - 2/6/2018 - commented out - set custom segments dynamically
                            setCustomSegments(objCustSegmentData, newPstDebitLine);
                            //end - regina
                            if (!NSUtils.isEmpty(idStdEntity)) {
                                newPstDebitLine.setEntityId(idStdEntity);
                            }
                        }
                        else {
                            NSUtils.logMessage('customizeGlImpact',
                                'pstRebate = 0 or is empty ');
                        }


                        if (expRebate != 0 && !NSUtils.isEmpty(expRebate)) {
                            // Create Credit Line - debit line instead
                            // Rest of debit amt (difference of PST Exp and pstRebateAcc)
                            var newPstCreditLine = customLines.addNewLine();
                            NSUtils.logMessage('customizeGlImpact',
                                'idGSTOffsetAcc =' + idGSTOffsetAcc +
                                ', set debit amount expRebate = ' + expRebate +
                                ', idExpLocation = ' + idExpLocation +
                                ', idExpDepartment = ' + idExpDepartment +
                                ', idExpMemo = ' + idExpMemo +
                                ', idExpProj = ' + idExpProj
                            );

                            //regina - 3/18 - add gst/hst offset
                            if (!NSUtils.isEmpty(idGSTOffsetAcc)) {
                                newPstCreditLine.setAccountId(idGSTOffsetAcc);
                                NSUtils.logMessage('Line 453', 'Set idGSTOffsetAcc');
                            }
                            if (!NSUtils.isEmpty(idExpLocation)) {
                                newPstCreditLine
                                    .setLocationId(idExpLocation);
                            }
                            if (!NSUtils.isEmpty(idExpDepartment)) {
                                newPstCreditLine.setDepartmentId(idExpDepartment);
                            }
                            if (!NSUtils.isEmpty(idExpMemo)) {
                                newPstCreditLine.setMemo(idExpMemo);
                            }
                            // if (!NSUtils.isEmpty(idExpFunder)) {
                            //     newPstCreditLine.setClassId(idExpFunder);
                            // }
                            if (!NSUtils.isEmpty(idExpProj)) {
                                newPstCreditLine.setSegmentValueId('cseg_npo_grant', idExpProj);
                            }
                            //regina - 2/6/2018 - commented out - set custom segments dynamically
                            setCustomSegments(objCustSegmentData, newPstCreditLine);
                            //end - regina
                            if (!NSUtils.isEmpty(pstRebate)) {
                                //newPstCreditLine.setCreditAmount(gstRebate);

                                //regina  - 6/28 - use debitline instead
                                newPstCreditLine.setDebitAmount(expRebate);
                            }
                            // if(!NSUtils.isEmpty(idStdEntityExp)){
                            // newPstCreditLine.setEntityId(idStdEntityExp);
                            // }
                        }
                        else {
                            NSUtils.logMessage('customizeGlImpact',
                                'expRebate is 0 or is empty');
                        }


                        if (taxRebate != 0 && !NSUtils.isEmpty(taxRebate)) {
                            //regina - 6/28 - new - Create Credit Line for tax
                            var newPstDebitLine = customLines.addNewLine();
                            NSUtils.logMessage('customizeGlImpact',
                                'pstTaxRebateAcc =' + pstTaxRebateAcc +
                                ', set credit amount taxRebate = ' + taxRebate +
                                ', idExpLocation = ' + idExpLocation +
                                ', idExpDepartment = ' + idExpDepartment +
                                ', idExpMemo = ' + idExpMemo +
                                ', idExpProj = ' + idExpProj
                            );
                            if (!NSUtils.isEmpty(pstTaxRebateAcc)) {
                                newPstDebitLine.setAccountId(pstTaxRebateAcc);
                            }
                            if (!NSUtils.isEmpty(pstRebate)) {
                                newPstDebitLine.setCreditAmount(taxRebate);
                            }
                            if (!NSUtils.isEmpty(idExpLocation)) {
                                newPstDebitLine
                                    .setLocationId(idExpLocation);
                            }
                            if (!NSUtils.isEmpty(idExpDepartment)) {
                                newPstDebitLine
                                    .setDepartmentId(idExpDepartment);
                            }
                            if (!NSUtils.isEmpty(idExpMemo)) {
                                newPstDebitLine.setMemo(idExpMemo);
                            }
                            // if (!NSUtils.isEmpty(idExpFunder)) {
                            //     newPstDebitLine.setClassId(idExpFunder);
                            // }
                            // else{
                            //     newPstDebitLine.setClassId(21);
                            // }
                            if (!NSUtils.isEmpty(idExpProj)) {
                                newPstDebitLine.setSegmentValueId('cseg_npo_grant', idExpProj);
                            }
                            //regina - 2/6/2018 - commented out - set custom segments dynamically
                            setCustomSegments(objCustSegmentData, newPstDebitLine);
                            //end - regina
                            if (!NSUtils.isEmpty(idStdEntity)) {
                                newPstDebitLine.setEntityId(idStdEntity);
                            }
                        }
                        else {
                            NSUtils.logMessage('customizeGlImpact',
                                'taxRebate = 0 or is empty');
                        }

                        NSUtils.logMessage('customizeGlImpact',
                            'end of pstRebate');
                    }
                    //---------------------------------- END OF PST Part


                    //Added
                    //BC, Manitoba, Saskatchewan
                    if(idExpTaxJurisdiction == 102 || idExpTaxJurisdiction == 103 || idExpTaxJurisdiction == 112){

                        var pstValue = fExpAmount * flTaxRate2;
                        NSUtils.logMessage('pstValue', pstValue);

                        if(pstValue != 0 && !NSUtils.isEmpty(pstValue)){

                            if(recType == 'vendorcredit'){

                                NSUtils.logMessage('recType is Vendor Credit');

                                var pstDebitLine = customLines.addNewLine();

                                if (!NSUtils.isEmpty(pstTaxRebateAcc)){

                                    pstDebitLine.setAccountId(pstTaxRebateAcc);
                                }

                                if (!NSUtils.isEmpty(pstValue)){

                                    pstDebitLine.setDebitAmount(pstValue);
                                }
                                setCustomSegments(objCustSegmentData, pstDebitLine);

                                var pstCreditLine = customLines.addNewLine();

                                pstCreditLine.setAccountId(idExpAccount);

                                if (!NSUtils.isEmpty(pstValue)){

                                    pstCreditLine.setCreditAmount(pstValue);
                                }
                                setCustomSegments(objCustSegmentData, pstCreditLine);

                            }else{

                                var pstCreditLine = customLines.addNewLine();

                                if (!NSUtils.isEmpty(pstTaxRebateAcc)) {
                                    pstCreditLine.setAccountId(pstTaxRebateAcc);
                                }

                                if (!NSUtils.isEmpty(pstValue)) {
                                    pstCreditLine.setCreditAmount(pstValue);
                                }
                                setCustomSegments(objCustSegmentData, pstCreditLine);

                                var pstDebitLine = customLines.addNewLine();

                                pstDebitLine.setAccountId(idExpAccount);
                                
                                if (!NSUtils.isEmpty(pstValue)) {
                                    pstDebitLine.setDebitAmount(pstValue);
                                }
                                setCustomSegments(objCustSegmentData, pstDebitLine);
                            }
                        }
                    }

                    //Added
                    //Quebec PST Rebate
                    if(idExpTaxJurisdiction == 111){

                        for(var a = 0; a < arrRebateAccSrchResults.length; a++){

                            if(arrRebateAccSrchResults[a].idJurisdiction == 111){

                                var quebecRebate = 0;
                                var expRebate = 0;
                                var taxRebate = 0;

                                var quebecPstRebateFactor = parseFloat(arrRebateAccSrchResults[a].idPSTRebateFactor);
                                NSUtils.logMessage('quebecPstRebateFactor', quebecPstRebateFactor);

                                var quebecPstRebateAcc = arrRebateAccSrchResults[a].idPSTRebateAcc;
                                NSUtils.logMessage('quebecPstRebateAcc', quebecPstRebateAcc);

                                if(quebecPstRebateFactor > 0){

                                    if(!NSUtils.isEmpty(fExpAmount)){

                                        quebecRebate = quebecPstRebateFactor * fExpAmount * flTaxRate2;
                                        quebecRebate = NSUtils.roundDecimalAmount(quebecRebate, 2);

                                        expRebate = (fExpAmount * flTaxRate2) - quebecRebate;
                                        expRebate = NSUtils.roundDecimalAmount(expRebate, 2);

                                        taxRebate = quebecRebate + expRebate;
                                        taxRebate = NSUtils.roundDecimalAmount(taxRebate, 2);

                                        NSUtils.logMessage('customizeGlImpact', 'quebecRebate =' + quebecRebate + ', expRebate = ' + expRebate + ', taxRebate = ' + taxRebate);
                                    }
                                }

                                for (y = 0; y < arrStdLineDet.length; y++) {
                                    if (arrStdLineDet[y].idStdAccount == gstRebateAcc) {
                                        idStdEntity = arrStdLineDet[y].idStdEntity;
                                    }
                                    if (arrStdLineDet[y].idStdAccount == idExpAccount) {
                                        // break;
                                        idStdEntityExp = arrStdLineDet[y].idStdEntity;
                                    }
                                }

                                if (quebecRebate != 0 && !NSUtils.isEmpty(quebecRebate)) {
                                    // Create Debit Line
                                    var newPstDebitLine = customLines.addNewLine();
                                    NSUtils.logMessage('customizeGlImpact',
                                        'quebectPstRebateAcc =' + quebecPstRebateAcc +
                                        ', set debit amount quebecRebate = ' + quebecRebate +
                                        ', idExpLocation = ' + idExpLocation +
                                        ', idExpDepartment = ' + idExpDepartment +
                                        ', idExpMemo = ' + idExpMemo +
                                        ', idExpProj = ' + idExpProj
                                    );
                                    if (!NSUtils.isEmpty(quebecPstRebateAcc)) {
                                        newPstDebitLine.setAccountId(quebecPstRebateAcc);
                                        NSUtils.logMessage('Set quebecPstRebateAcc');
                                    }
                                    //Modified
                                    if (!NSUtils.isEmpty(quebecRebate) && ((quebecRebate > 0 ? 1 : -1) !== -1) && recType != 'vendorcredit') {
                                        newPstDebitLine.setDebitAmount(quebecRebate);
                                        NSUtils.logMessage('Set Debit Amount');
                                    }else{
            
                                        newPstDebitLine.setCreditAmount(Math.abs(quebecRebate));
                                        NSUtils.logMessage('Set Credit Amount');
                                    }
                                    //End of modified

                                    if (!NSUtils.isEmpty(idExpLocation)) {
                                        newPstDebitLine.setLocationId(idExpLocation);
                                    }

                                    if (!NSUtils.isEmpty(idExpDepartment)) {
                                        newPstDebitLine.setDepartmentId(idExpDepartment);
                                    }

                                    if (!NSUtils.isEmpty(idExpMemo)) {
                                        newPstDebitLine.setMemo(idExpMemo);
                                    }

                                    // if (!NSUtils.isEmpty(idExpFunder)) {
                                    //     newGstDebitLine.setClassId(idExpFunder);
                                    // }

                                    if (!NSUtils.isEmpty(idExpProj)) {
                                        newPstDebitLine.setSegmentValueId('cseg_npo_grant', idExpProj);
                                    }
                                    setCustomSegments(objCustSegmentData, newPstDebitLine);
                            
                                    if (!NSUtils.isEmpty(idStdEntity)) {
                                        newPstDebitLine.setEntityId(idStdEntity);
                                    }

                                } else {
                                    nlapiLogExecution('DEBUG', 'PST Tax custom GL', 'quebecRebate = 0 or is empty');
                                }

                                if (expRebate != 0 && !NSUtils.isEmpty(expRebate)) {
                                    // Create Credit Line - debit line instead
                                    var newPstCreditLine = customLines.addNewLine();
                                    NSUtils.logMessage('customizeGlImpact',
                                        'idGSTOffsetAcc =' + idGSTOffsetAcc +
                                        ', set debit amount expRebate = ' + expRebate +
                                        ', idExpLocation = ' + idExpLocation +
                                        ', idExpDepartment = ' + idExpDepartment +
                                        ', idExpMemo = ' + idExpMemo +
                                        ', idExpProj = ' + idExpProj
                                    );
            
                                    //regina - 3/18 - add gst/hst offset
                                    if (!NSUtils.isEmpty(idGSTOffsetAcc)) {
                                        newPstCreditLine.setAccountId(idGSTOffsetAcc);
                                    }
                                    if (!NSUtils.isEmpty(idExpLocation)) {
                                        newPstCreditLine.setLocationId(idExpLocation);
                                    }
                                    if (!NSUtils.isEmpty(idExpDepartment)) {
                                        newPstCreditLine.setDepartmentId(idExpDepartment);
                                    }
                                    if (!NSUtils.isEmpty(idExpMemo)) {
                                        newPstCreditLine.setMemo(idExpMemo);
                                    }
                                    // if (!NSUtils.isEmpty(idExpFunder)) {
                                    //     newGstCreditLine.setClassId(idExpFunder);
                                    // }
                                    // else{
                                    //     newGstCreditLine.setClassId(21);
                                    // }
                                    if (!NSUtils.isEmpty(idExpProj)) {
                                        newPstCreditLine.setSegmentValueId('cseg_npo_grant', idExpProj);
                                    }
                                    setCustomSegments(objCustSegmentData, newPstCreditLine);
                                    //regina - 2/6/2018 - commented out - set custom segments dynamically
                                    //setCustomSegments(objCustSegmentData, newGstCreditLine);
                                    //end - regina
                                    //Modified
                                    if (!NSUtils.isEmpty(expRebate) && ((expRebate > 0 ? 1 : -1) !== -1) && recType != 'vendorcredit') {
                                        //newGstCreditLine.setCreditAmount(gstRebate);
            
                                        //regina  - 6/28 - use debitline instead
                                        newPstCreditLine.setDebitAmount(expRebate);
                                    }else{
                                        
                                        newPstCreditLine.setCreditAmount(Math.abs(expRebate));
                                    }
                                    //End of modified
                                    // if(!NSUtils.isEmpty(idStdEntityExp)){
                                    // newGstCreditLine.setEntityId(idStdEntityExp);
                                    // }
                                } else {
                                    nlapiLogExecution('DEBUG', 'PST Tax custom GL', 'expRebate = 0 or is empty');
                                }

                                if (taxRebate != 0 && !NSUtils.isEmpty(taxRebate)) {
                                    //regina - 6/28 - new - Create Credit Line for tax
                                    var newPstDebitLine = customLines.addNewLine();
                                    NSUtils.logMessage('customizeGlImpact',
                                        'pstTaxRebateAcc =' + pstTaxRebateAcc +
                                        ', set credit amount taxRebate = ' + taxRebate +
                                        ', idExpLocation = ' + idExpLocation +
                                        ', idExpDepartment = ' + idExpDepartment +
                                        ', idExpMemo = ' + idExpMemo +
                                        ', idExpProj = ' + idExpProj
                                    );
            
                                    if (!NSUtils.isEmpty(pstTaxRebateAcc)) {
                                        newPstDebitLine.setAccountId(pstTaxRebateAcc);
                                    }
                                    //Modified
                                    if (!NSUtils.isEmpty(taxRebate) && ((taxRebate > 0 ? 1 : -1) !== -1) && recType != 'vendorcredit') {
                                        newPstDebitLine.setCreditAmount(taxRebate);
                                    }else{
            
                                        newPstDebitLine.setDebitAmount(Math.abs(taxRebate));
                                    }
                                    //End of modified
                                    if (!NSUtils.isEmpty(idExpLocation)) {
                                        newPstDebitLine.setLocationId(idExpLocation);
                                    }
                                    if (!NSUtils.isEmpty(idExpDepartment)) {
                                        newPstDebitLine.setDepartmentId(idExpDepartment);
                                    }
                                    if (!NSUtils.isEmpty(idExpMemo)) {
                                        newPstDebitLine.setMemo(idExpMemo);
                                    }
                                    // if (!NSUtils.isEmpty(idExpFunder)) {
                                    //     newGstDebitLine.setClassId(idExpFunder);
                                    // }
                                    // else{
                                    //     newGstDebitLine.setClassId(21);
                                    // }
                                    if (!NSUtils.isEmpty(idExpProj)) {
                                        newPstDebitLine.setSegmentValueId('cseg_npo_grant', idExpProj);
                                    }
                                    setCustomSegments(objCustSegmentData, newPstDebitLine);
    
                                    if (!NSUtils.isEmpty(idStdEntity)) {
                                        newPstDebitLine.setEntityId(idStdEntity);
                                    }
                                } else {
                                    nlapiLogExecution('DEBUG', 'PST Tax custom GL', 'taxRebate = 0 or is empty');
                                }
            
                                NSUtils.logMessage('customizeGlImpact','end of quebecRebate');
                            }
                        }
                    }

                        
                    //Added
                    var expRebate = 0;
                    var taxRebate = 0;
                    //
                    
                    if (gstRebateFactor > 0) {
                        var idStdEntity = '';
                        var idStdEntityExp = '';
                        var gstRebate = 0;

                        //regina - 6/28
                        var expRebate = 0;
                        var taxRebate = 0;

                        if (!NSUtils.isEmpty(fExpAmount)) {
                            //gstRebate = gstRebateFactor * fExpAmount * gstHstRate;
                            gstRebate = gstRebateFactor * fExpAmount * flTaxRate;
                            gstRebate = NSUtils.roundDecimalAmount(gstRebate, 2);

                            //regina - 6/28 - calculate correct rebate amounts
                            expRebate = (fExpAmount * flTaxRate) - gstRebate;
                            expRebate = NSUtils.roundDecimalAmount(expRebate, 2);

                            taxRebate = gstRebate + expRebate;
                            taxRebate = NSUtils.roundDecimalAmount(taxRebate, 2);
                            NSUtils.logMessage('customizeGlImpact',
                                'gstRebate =' + gstRebate +
                                ', expRebate = ' + expRebate +
                                ', taxRebate = ' + taxRebate);
                        }
                    } else if (gstRebateFactor == 0){
                        gstRebate = 0;
                        expRebate = NSUtils.roundDecimalAmount(fExpAmount*flTaxRate, 2);
                        taxRebate = expRebate;
                    }

                    for (y = 0; y < arrStdLineDet.length; y++) {
                        if (arrStdLineDet[y].idStdAccount == gstRebateAcc) {
                            idStdEntity = arrStdLineDet[y].idStdEntity;
                        }
                        if (arrStdLineDet[y].idStdAccount == idExpAccount) {
                            // break;
                            idStdEntityExp = arrStdLineDet[y].idStdEntity;
                        }
                    }
                    //Reviewing
                    if (gstRebate != 0 && !NSUtils.isEmpty(gstRebate)) {
                        // Create Debit Line
                        var newGstDebitLine = customLines.addNewLine();
                        NSUtils.logMessage('customizeGlImpact',
                            'gstRebateAcc =' + gstRebateAcc +
                            ', set debit amount gstRebate = ' + gstRebate +
                            ', idExpLocation = ' + idExpLocation +
                            ', idExpDepartment = ' + idExpDepartment +
                            ', idExpMemo = ' + idExpMemo +
                            ', idExpProj = ' + idExpProj
                        );
                        if (!NSUtils.isEmpty(gstRebateAcc)) {
                            newGstDebitLine.setAccountId(gstRebateAcc);
                            NSUtils.logMessage('Line 597', 'Set gstRebateAcc');
                        }
                        //Modified
                        if (!NSUtils.isEmpty(gstRebate) && ((gstRebate > 0 ? 1 : -1) !== -1) && recType != 'vendorcredit') {
                            newGstDebitLine.setDebitAmount(gstRebate);
                            NSUtils.logMessage('Line 601', 'Set Debit Amount');
                        }else{

                            newGstDebitLine.setCreditAmount(Math.abs(gstRebate));
                            NSUtils.logMessage('Line 615', 'Set Credit Amount');
                        }
                        //End of modified
                        if (!NSUtils.isEmpty(idExpLocation)) {
                            newGstDebitLine
                                .setLocationId(idExpLocation);
                        }
                        if (!NSUtils.isEmpty(idExpDepartment)) {
                            newGstDebitLine
                                .setDepartmentId(idExpDepartment);
                        }
                        if (!NSUtils.isEmpty(idExpMemo)) {
                            newGstDebitLine.setMemo(idExpMemo);
                        }
                        // if (!NSUtils.isEmpty(idExpFunder)) {
                        //     newGstDebitLine.setClassId(idExpFunder);
                        // }
                        if (!NSUtils.isEmpty(idExpProj)) {
                            newGstDebitLine.setSegmentValueId('cseg_npo_grant', idExpProj);
                        }
                        //regina - 2/6/2018 - commented out - set custom segments dynamically
                        setCustomSegments(objCustSegmentData, newGstDebitLine);
                        //end - regina
                        if (!NSUtils.isEmpty(idStdEntity)) {
                            newGstDebitLine.setEntityId(idStdEntity);
                        }
                    } else {
                        nlapiLogExecution('DEBUG', 'GST Tax custom GL', 'gstRebate = 0 or is empty');
                    }


                    if (expRebate != 0 && !NSUtils.isEmpty(expRebate)) {
                        // Create Credit Line - debit line instead
                        var newGstCreditLine = customLines.addNewLine();
                        NSUtils.logMessage('customizeGlImpact',
                            'idGSTOffsetAcc =' + idGSTOffsetAcc +
                            ', set debit amount expRebate = ' + expRebate +
                            ', idExpLocation = ' + idExpLocation +
                            ', idExpDepartment = ' + idExpDepartment +
                            ', idExpMemo = ' + idExpMemo +
                            ', idExpProj = ' + idExpProj
                        );

                        //regina - 3/18 - add gst/hst offset
                        if (!NSUtils.isEmpty(idGSTOffsetAcc)) {
                            newGstCreditLine.setAccountId(idGSTOffsetAcc);
                        }
                        if (!NSUtils.isEmpty(idExpLocation)) {
                            newGstCreditLine
                                .setLocationId(idExpLocation);
                        }
                        if (!NSUtils.isEmpty(idExpDepartment)) {
                            newGstCreditLine
                                .setDepartmentId(idExpDepartment);
                        }
                        if (!NSUtils.isEmpty(idExpMemo)) {
                            newGstCreditLine.setMemo(idExpMemo);
                        }
                        // if (!NSUtils.isEmpty(idExpFunder)) {
                        //     newGstCreditLine.setClassId(idExpFunder);
                        // }
                        // else{
                        //     newGstCreditLine.setClassId(21);
                        // }
                        if (!NSUtils.isEmpty(idExpProj)) {
                            newGstCreditLine.setSegmentValueId('cseg_npo_grant', idExpProj);
                        }
                        //regina - 2/6/2018 - commented out - set custom segments dynamically
                        setCustomSegments(objCustSegmentData, newGstCreditLine);
                        //end - regina
                        //Modified
                        if (!NSUtils.isEmpty(expRebate) && ((expRebate > 0 ? 1 : -1) !== -1) && recType != 'vendorcredit') {
                            //newGstCreditLine.setCreditAmount(gstRebate);

                            //regina  - 6/28 - use debitline instead
                            newGstCreditLine.setDebitAmount(expRebate);
                        }else{
                            
                            newGstCreditLine.setCreditAmount(Math.abs(expRebate));
                        }
                        //End of modified
                        // if(!NSUtils.isEmpty(idStdEntityExp)){
                        // newGstCreditLine.setEntityId(idStdEntityExp);
                        // }
                    } else {
                        nlapiLogExecution('DEBUG', 'GST Tax custom GL', 'expRebate = 0 or is empty');
                    }


                    if (taxRebate != 0 && !NSUtils.isEmpty(taxRebate)) {
                        //regina - 6/28 - new - Create Credit Line for tax
                        var newGstDebitLine = customLines.addNewLine();
                        NSUtils.logMessage('customizeGlImpact',
                            'gstTaxRebateAcc =' + gstTaxRebateAcc +
                            ', set credit amount taxRebate = ' + taxRebate +
                            ', idExpLocation = ' + idExpLocation +
                            ', idExpDepartment = ' + idExpDepartment +
                            ', idExpMemo = ' + idExpMemo +
                            ', idExpProj = ' + idExpProj
                        );

                        if (!NSUtils.isEmpty(gstTaxRebateAcc)) {
                            newGstDebitLine.setAccountId(gstTaxRebateAcc);
                        }
                        //Modified
                        if (!NSUtils.isEmpty(taxRebate) && ((taxRebate > 0 ? 1 : -1) !== -1) && recType != 'vendorcredit') {
                            newGstDebitLine.setCreditAmount(taxRebate);
                        }else{

                            newGstDebitLine.setDebitAmount(Math.abs(taxRebate));
                        }
                        //End of modified
                        if (!NSUtils.isEmpty(idExpLocation)) {
                            newGstDebitLine
                                .setLocationId(idExpLocation);
                        }
                        if (!NSUtils.isEmpty(idExpDepartment)) {
                            newGstDebitLine
                                .setDepartmentId(idExpDepartment);
                        }
                        if (!NSUtils.isEmpty(idExpMemo)) {
                            newGstDebitLine.setMemo(idExpMemo);
                        }
                        // if (!NSUtils.isEmpty(idExpFunder)) {
                        //     newGstDebitLine.setClassId(idExpFunder);
                        // }
                        // else{
                        //     newGstDebitLine.setClassId(21);
                        // }
                        if (!NSUtils.isEmpty(idExpProj)) {
                            newGstDebitLine.setSegmentValueId('cseg_npo_grant', idExpProj);
                        }
                        //regina - 2/6/2018 - commented out - set custom segments dynamically
                        setCustomSegments(objCustSegmentData, newGstDebitLine);
                        //end - regina
                        if (!NSUtils.isEmpty(idStdEntity)) {
                            newGstDebitLine.setEntityId(idStdEntity);
                        }
                    } else {
                        nlapiLogExecution('DEBUG', 'GST Tax custom GL', 'taxRebate = 0 or is empty');
                    }

                    NSUtils.logMessage('customizeGlImpact',
                        'end of gstRebate');

                    if (hstRebateFactor > 0) {
                        var hstRebate = 0;
                        if (!NSUtils.isEmpty(fExpAmount)) {
                            // hstRebate = hstRebateFactor * (fExpAmount
                            // * fGstRate);

                            //hstRebate = hstRebateFactor * fExpAmount
                            //        * gstHstRate;

                            hstRebate = hstRebateFactor * fExpAmount *
                                flTaxRate;

                            NSUtils.logMessage('customizeGlImpact',
                                'hstRebate =' + hstRebate +
                                ', hstRebateFactor = ' + hstRebateFactor +
                                ', flTaxRate = ' + flTaxRate);

                            // hstRebate = Math.round(hstRebate);
                            hstRebate = NSUtils.roundDecimalAmount(hstRebate, 2);

                            //regina - 6/28 - calculate correct rebate amounts
                            expRebate = (fExpAmount * flTaxRate) - hstRebate;
                            expRebate = NSUtils.roundDecimalAmount(expRebate, 2);

                            taxRebate = parseFloat(hstRebate) + parseFloat(expRebate);
                            taxRebate = NSUtils.roundDecimalAmount(taxRebate, 2);

                            NSUtils.logMessage('customizeGlImpact',
                                'hstRebate =' + hstRebate +
                                ', expRebate = ' + expRebate +
                                ', taxRebate = ' + taxRebate);

                        }
                        // NSUtils.logMessage('customizeGlImpact',
                        // 'hstRebate - '+ Math.round(hstRebate));
                        for (y = 0; y < arrStdLineDet.length; y++) {
                            if (arrStdLineDet[y].idStdAccount == hstRebateAcc) {
                                idStdEntity = arrStdLineDet[y].idStdEntity;
                            }
                            if (arrStdLineDet[y].idStdAccount == idExpAccount) {
                                // break;
                                idStdEntityExp = arrStdLineDet[y].idStdEntity;
                            }
                        }

                        if (hstRebate != 0 && !NSUtils.isEmpty(hstRebate)) {
                            // Create Debit Line
                            var newHstDebitLine = customLines.addNewLine();
                            NSUtils.logMessage('customizeGlImpact',
                                'hstRebateAcc =' + hstRebateAcc +
                                ', set credit amount hstRebate = ' + hstRebate +
                                ', idExpLocation = ' + idExpLocation +
                                ', idExpDepartment = ' + idExpDepartment +
                                ', idExpMemo = ' + idExpMemo +
                                ', idExpProj = ' + idExpProj
                            );

                            if (!NSUtils.isEmpty(hstRebateAcc)) {
                                newHstDebitLine.setAccountId(hstRebateAcc);
                                NSUtils.logMessage('Line 799', 'Set hstRebateAcc');
                            }

                            //Modified
                            if (!NSUtils.isEmpty(hstRebate) && ((hstRebate > 0 ? 1 : -1) !== -1) && recType != 'vendorcredit'){
                
                                newHstDebitLine.setDebitAmount(hstRebate);
                                NSUtils.logMessage('Line 803', 'Set Debit Amount');
                            }else{

                                newHstDebitLine.setCreditAmount(Math.abs(hstRebate));
                                NSUtils.logMessage('Line 820', 'Set Credit Amount');
                            }
                            //end of modification
                            if (!NSUtils.isEmpty(idExpLocation)) {
                                newHstDebitLine
                                    .setLocationId(idExpLocation);
                            }
                            if (!NSUtils.isEmpty(idExpDepartment)) {
                                newHstDebitLine
                                    .setDepartmentId(idExpDepartment);
                            }
                            if (!NSUtils.isEmpty(idExpMemo)) {
                                newHstDebitLine.setMemo(idExpMemo);
                            }
                            // if (!NSUtils.isEmpty(idExpFunder)) {
                            //     newHstDebitLine.setClassId(idExpFunder);
                            // }
                            // else{
                            //     newHstDebitLine.setClassId(21);
                            // }
                            if (!NSUtils.isEmpty(idExpProj)) {
                                newHstDebitLine.setSegmentValueId('cseg_npo_grant', idExpProj);
                            }

                            //regina - 2/6/2018 - commented out - set custom segments dynamically
                            setCustomSegments(objCustSegmentData, newHstDebitLine);
                            //end - regina

                            if (!NSUtils.isEmpty(idStdEntity)) {
                                newHstDebitLine.setEntityId(idStdEntity);
                            }
                        }

                        if (expRebate != 0 && !NSUtils.isEmpty(expRebate)) {
                            // Create Debit Line
                            var newHstCreditLine = customLines.addNewLine();
                            NSUtils.logMessage('customizeGlImpact',
                                'idHSTOffsetAcc =' + idHSTOffsetAcc +
                                ', set debit amount expRebate = ' + expRebate +
                                ', idExpLocation = ' + idExpLocation +
                                ', idExpDepartment = ' + idExpDepartment +
                                ', idExpMemo = ' + idExpMemo +
                                ', idExpProj = ' + idExpProj
                            );

                            //regina - 3/18 - add gst/hst offset
                            if (!NSUtils.isEmpty(idHSTOffsetAcc)) {
                                newHstCreditLine.setAccountId(idHSTOffsetAcc);
                            }

                            if (!NSUtils.isEmpty(idExpLocation)) {
                                newHstCreditLine
                                    .setLocationId(idExpLocation);
                            }
                            if (!NSUtils.isEmpty(idExpDepartment)) {
                                newHstCreditLine
                                    .setDepartmentId(idExpDepartment);
                            }
                            if (!NSUtils.isEmpty(idExpMemo)) {
                                newHstCreditLine.setMemo(idExpMemo);
                            }
                            // if (!NSUtils.isEmpty(idExpFunder)) {
                            //     newHstCreditLine.setClassId(idExpFunder);
                            // }
                            // else{
                            //     newHstCreditLine.setClassId(21);
                            // }
                            if (!NSUtils.isEmpty(idExpProj)) {
                                newHstCreditLine.setSegmentValueId('cseg_npo_grant', idExpProj);
                            }
                            //regina - 2/6/2018 - commented out - set custom segments dynamically
                            setCustomSegments(objCustSegmentData, newHstCreditLine);
                            //end - regina
                            //Modified
                            if (!NSUtils.isEmpty(hstRebate) && ((expRebate > 0 ? 1 : -1) !== -1) && recType != 'vendorcredit'){
                                //newHstCreditLine.setCreditAmount(hstRebate);

                                //regina  - 6/28 - use debitline instead
                                newHstCreditLine.setDebitAmount(expRebate);
                            }else{
                                newHstCreditLine.setCreditAmount(Math.abs(expRebate));
                            }//End of modified

                            // if(!NSUtils.isEmpty(idStdEntityExp)){
                            // newHstCreditLine.setEntityId(idStdEntityExp);
                            // }
                        }

                        if (taxRebate != 0 && !NSUtils.isEmpty(taxRebate)) {
                            //regina - 6/28 - new - Create Credit Line for tax
                            var newHstDebitLine = customLines.addNewLine();
                            NSUtils.logMessage('customizeGlImpact',
                                'gstTaxRebateAcc =' + gstTaxRebateAcc +
                                ', set credit amount taxRebate = ' + taxRebate +
                                ', idExpLocation = ' + idExpLocation +
                                ', idExpDepartment = ' + idExpDepartment +
                                ', idExpMemo = ' + idExpMemo +
                                ', idExpProj = ' + idExpProj
                            );
                            if (!NSUtils.isEmpty(gstTaxRebateAcc)) {
                                newHstDebitLine.setAccountId(gstTaxRebateAcc);
                            }
                            //Modifed
                            if (!NSUtils.isEmpty(hstRebate) && ((taxRebate > 0 ? 1 : -1) !== -1) && recType != 'vendorcredit') {
                                newHstDebitLine.setCreditAmount(taxRebate);
                            }else{
                                newHstDebitLine.setDebitAmount(Math.abs(taxRebate));
                            }//End of modified
                            if (!NSUtils.isEmpty(idExpLocation)) {
                                newHstDebitLine
                                    .setLocationId(idExpLocation);
                            }
                            if (!NSUtils.isEmpty(idExpDepartment)) {
                                newHstDebitLine
                                    .setDepartmentId(idExpDepartment);
                            }
                            if (!NSUtils.isEmpty(idExpMemo)) {
                                newHstDebitLine.setMemo(idExpMemo);
                            }
                            // if (!NSUtils.isEmpty(idExpFunder)) {
                            //     newHstDebitLine.setClassId(idExpFunder);
                            // }
                            // else{
                            //     newHstDebitLine.setClassId(21);
                            // }
                            if (!NSUtils.isEmpty(idExpProj)) {
                                newHstDebitLine.setSegmentValueId('cseg_npo_grant', idExpProj);
                            }
                            //regina - 2/6/2018 - commented out - set custom segments dynamically
                            setCustomSegments(objCustSegmentData, newHstDebitLine);
                            //end - regina

                            if (!NSUtils.isEmpty(idStdEntity)) {
                                newHstDebitLine.setEntityId(idStdEntity);
                            }
                        }
                        NSUtils.logMessage('customizeGlImpact',
                            'end of hstRebate');
                    }
                }
            }
            //}
        }
        var remainingUsage = contextObj.getRemainingUsage();
        NSUtils.logMessage('customizeGlImpact', 'remainingUsage AFTER - ' +
            remainingUsage);
    } catch (ex) {
        var errorStr = (ex.getCode != null) ? ex.getCode() + '\n' +
            ex.getDetails() + '\n' : ex.toString();
        NSUtils.logMessage('Error in the main function', errorStr);

        if (!(ex instanceof nlobjError)) {
            throw nlapiCreateError("An Unexpected Error has occurred: ", ex
                .toString());
        }
    }
}

function searchRebateAccount(arrUniqueJurisIds) {

    var arrayOutput = [];
    var arrSearchColumns = [];
    var arrSearchFilters = [];
    var stRecordType = 'customrecord_nfp_cdn_tax_rebate';
    var stSearchID = 'customsearch_nfp_rebate_rec_detail_se'; // what search
    // is this???
    NSUtils.logMessage('searchRebateAccount', 'arrUniqueJurisIds.length - ' +
        arrUniqueJurisIds.length);
    // search filters
    arrSearchFilters.push(new nlobjSearchFilter(
        'custrecord_nfp_cdn_tax_jurisdiction', null, 'anyof',
        arrUniqueJurisIds));
    var objRebateRecResultSet = NSUtils.search(stRecordType, stSearchID,
        arrSearchFilters, arrSearchColumns);

    if (!NSUtils.isEmpty(objRebateRecResultSet)) {
        var iRecCounts = objRebateRecResultSet.length;
        NSUtils.logMessage('searchRebateAccount', 'iRecCounts - ' + iRecCounts);

        for (var i = 0; i < iRecCounts; i++) {
            var resultObj = objRebateRecResultSet[i];

            var idRebateAcc = parseInt(resultObj.getValue('internalid'));
            var idGSTRebateAcc = parseInt(resultObj
                .getValue('custrecord_nfp_cdn_tax_gst_rebate_acct'));
            var idHSTRebateAcc = parseInt(resultObj
                .getValue('custrecord_nfp_cdn_tax_hst_rebate_acct'));

            //mbolf - 1/16/2019 - add PST account
            var idPSTRebateAcc = parseInt(resultObj
                .getValue('custrecord_nfp_cdn_tax_pst_rebate_acct'));
            //------------------------------

            var idGSTRebateFactor = parseFloat(resultObj
                .getValue('custrecord_nfp_cdn_tax_gst_rebate_factor'));
            var idHSTRebateFactor = parseFloat(resultObj
                .getValue('custrecord_nfp_cdn_tax_hst_rebate_factor'));

            //mbolf - 1/16/2019 - add PST Rebate Factor
            var idPSTRebateFactor = parseFloat(resultObj
                .getValue('custrecord_nfp_cdn_tax_pst_rebate_factor'));
            //------------------------------

            var idJurisdiction = resultObj
                .getValue('custrecord_nfp_cdn_tax_jurisdiction');
            var idGSTHSTRate = parseFloat(resultObj
                .getValue('custrecord_nfp_cdn_tax_gsthst_rate'));

            //mbolf - 1/16/2019 - add PST Rate
            var idPSTRate = parseFloat(resultObj
                .getValue('custrecord_nfp_cdn_tax_pst_rate'));
            //------------------------------

            //regina - 3/18 - add gst/hst offset
            var idGSTOffsetAcc = parseInt(resultObj
                .getValue('custrecord_nfp_cdn_gst_offset_acct')) || 0;
            var idHSTOffsetAcc = parseInt(resultObj
                .getValue('custrecord_nfp_cdn_hst_offset_acct')) || 0;

            //mbolf - 1/16/2019 - add PST offset
            var idPSTOffsetAcc = parseInt(resultObj
                .getValue('custrecord_nfp_cdn_pst_offset_acct')) || 0;
            //------------------------------

            var mapRebateRec = {
                "idRebateAcc": idRebateAcc,
                "idGSTRebateAcc": idGSTRebateAcc,
                "idHSTRebateAcc": idHSTRebateAcc,
                "idGSTRebateFactor": idGSTRebateFactor,
                "idHSTRebateFactor": idHSTRebateFactor,
                "idJurisdiction": idJurisdiction,
                "idGSTHSTRate": idGSTHSTRate,

                //regina - 3/18 - add gst/hst offset
                "idGSTOffsetAcc": idGSTOffsetAcc,
                "idHSTOffsetAcc": idHSTOffsetAcc,

                //mbolf - 1/16/2019 - add PST Factor, RebateAcc, Rate and Offset
                "idPSTOffsetAcc": idPSTOffsetAcc,
                "idPSTRate": idPSTRate,
                "idPSTRebateFactor": idPSTRebateFactor,
                "idPSTRebateAcc": idPSTRebateAcc
                //------------------------------
            }
            NSUtils.logMessage('mapRebateRec',"idRebateAcc"+ idRebateAcc+
                "idGSTRebateAcc"+ idGSTRebateAcc+
                "idHSTRebateAcc"+ idHSTRebateAcc+
                "idGSTRebateFactor"+ idGSTRebateFactor+
                "idHSTRebateFactor"+ idHSTRebateFactor+
                "idJurisdiction"+ idJurisdiction+
                "idGSTHSTRate"+ idGSTHSTRate+
                "idGSTOffsetAcc"+ idGSTOffsetAcc+
                "idHSTOffsetAcc"+ idHSTOffsetAcc+
                "idPSTOffsetAcc"+ idPSTOffsetAcc+
                "idPSTRate"+ idPSTRate+
                "idPSTRebateFactor"+ idPSTRebateFactor+
                "idPSTRebateAcc"+ idPSTRebateAcc);

            NSUtils.logMessage('searchRebateAccount', 'mapRebateRec - ' + i,
                mapRebateRec);
            arrayOutput.push(mapRebateRec);
        }

    } else {
        NSUtils.logMessage('searchRebateAccount', 'NO RECORDS FOUND');
    }

    return arrayOutput;

}

//regina
function getTaxAccounts(arrTaxCodeGrps) {
    var objTaxAccounts = {};
    var objPstTaxAccounts = {};
    var objAllTaxAccounts = {};
    if (NSUtils.isEmpty(arrTaxCodeGrps)) {
        return objTaxAccounts;
    }

    //get tax codes first
    var arrTaxCodes = [];
    var arrPstTaxCodes = [];
    var objTaxCodeByGrp = {};
    var objPstTaxCodeByGrp = {};


    var arrResults = NSUtils.search('taxgroup', null,
        [new nlobjSearchFilter('internalid', null, 'anyof', arrTaxCodeGrps)],
        [new nlobjSearchColumn("taxitem1"), new nlobjSearchColumn("taxitem2")]);

    if (!NSUtils.isEmpty(arrResults)) {
        var iRecCounts = arrResults.length;
        NSUtils.logMessage('getTaxAccounts', 'iRecCounts - ' + iRecCounts);

        for (var i = 0; i < iRecCounts; i++) {
            var result = arrResults[i];
            //stTaxGrpId - tax group id
            var stTaxGrpId = result.getId();
            NSUtils.logMessage('line 1057', 'stTaxGrpId - ' + stTaxGrpId);
            //stTaxCodeId - purchase tax acct for taxitem1
            var stTaxCodeId = result.getValue('taxitem1');
            NSUtils.logMessage('line 1059', 'stTaxCodeId - ' + stTaxCodeId);
            //pstTaxCodeId - purchase tax acct for taxitem2
            var pstTaxCodeId = result.getValue('taxitem2');
            NSUtils.logMessage('line 1061', 'pstTaxCodeId - ' + pstTaxCodeId);


            if (!NSUtils.isEmpty(stTaxCodeId)) {
                objTaxCodeByGrp[stTaxGrpId] = stTaxCodeId;
                NSUtils.logMessage('line 1097', 'objTaxCodeByGrp[stTaxGrpId] - ' + objTaxCodeByGrp[stTaxGrpId]);
                //get unique tax codes
                if (!NSUtils.inArray(stTaxCodeId, arrTaxCodes)) {
                    arrTaxCodes.push(stTaxCodeId);
                    NSUtils.logMessage('line 1101', 'in Array function - ' + arrTaxCodes);

                }
            }
            if (!NSUtils.isEmpty(pstTaxCodeId)) {
                objPstTaxCodeByGrp[stTaxGrpId] = pstTaxCodeId;
                NSUtils.logMessage('line 1105', 'objPstTaxCodeByGrp - ' + JSON.stringify(objPstTaxCodeByGrp));
                NSUtils.logMessage('line 1105', 'objPstTaxCodeByGrp[pstTaxCodeId] = pstTaxCodeId - ' + objPstTaxCodeByGrp[pstTaxCodeId]);
                NSUtils.logMessage('line 1105', '[pstTaxCodeId] - ' + pstTaxCodeId);

                //get unique tax codes
                if (!NSUtils.inArray(pstTaxCodeId, arrPstTaxCodes)) {
                    arrPstTaxCodes.push(pstTaxCodeId);
                    NSUtils.logMessage('line 1110', 'in Array function - ' + arrPstTaxCodes);

                }
            }
        }
    }

    if (NSUtils.isEmpty(arrTaxCodes)) {
        return objTaxAccounts;
    }

    //get the tax account from the GST/HST tax codes
    var objTaxAccountByCode = {};

    var arrResults = NSUtils.search('salestaxitem', null,
        [new nlobjSearchFilter('internalid', null, 'anyof', arrTaxCodes)],
        [new nlobjSearchColumn('purchaseaccount')]);

    if (!NSUtils.isEmpty(arrResults)) {
        var iRecCounts = arrResults.length;
        NSUtils.logMessage('getTaxAccounts', 'iRecCounts - ' + iRecCounts);

        for (var i = 0; i < iRecCounts; i++) {
            var result = arrResults[i];
            var stTaxCodeId = result.getId();
            NSUtils.logMessage('stTaxCodeId in recCount loop', 'stTaxCodeId - ' + stTaxCodeId);
            var stTaxAccountId = result.getValue('purchaseaccount');
            NSUtils.logMessage('stTaxAccountId in recCount loop', 'stTaxAccountId - ' + stTaxAccountId);
            objTaxAccountByCode[stTaxCodeId] = stTaxAccountId;
            NSUtils.logMessage('stTaxAccountId in recCount loop', 'objTaxAccountByCode[stTaxCodeId] = stTaxAccountId ' + objTaxAccountByCode[stTaxCodeId]);

        }
    }

    //get the tax account from the GST/HST tax codes
    var objPstTaxAccountByCode = {};

    var arrPstResults = NSUtils.search('salestaxitem', null,
        [new nlobjSearchFilter('internalid', null, 'anyof', arrPstTaxCodes)],
        [new nlobjSearchColumn('purchaseaccount')]);

    if (!NSUtils.isEmpty(arrPstResults)) {
        var iRecCounts = arrPstResults.length;
        NSUtils.logMessage('getTaxAccounts', 'iRecCounts - ' + iRecCounts);

        for (var i = 0; i < iRecCounts; i++) {
            var result = arrPstResults[i];
            var pstTaxCodeId = result.getId();
            NSUtils.logMessage('pstTaxCodeId in recCount loop', 'stTaxCodeId - ' + pstTaxCodeId);
            var pstTaxAccountId = result.getValue('purchaseaccount');
            NSUtils.logMessage('pstTaxAccountId in recCount loop', 'pstTaxAccountId - ' + pstTaxAccountId);
            objTaxAccountByCode[pstTaxCodeId] = pstTaxAccountId;
            NSUtils.logMessage('pstTaxAccountId in recCount loop', 'objTaxAccountByCode[pstTaxCodeId] = pstTaxAccountId ' + objTaxAccountByCode[pstTaxCodeId]);

        }
    }

    NSUtils.logMessage('customizeGlImpact',
        'objTaxAccountByCode - ' +
        JSON.stringify(objTaxAccountByCode));


    //get the tax account for the given tax group
    //for each tax group get the tax account
    NSUtils.logMessage('customizeGlImpact',
        'arrTaxCodeGrps.length - ' +
        arrTaxCodeGrps.length);
    for (var i = 0; i < arrTaxCodeGrps.length; i++) {
        //stTaxGrpId - tax group internal ID
        var stTaxGrpId = arrTaxCodeGrps[i];
        NSUtils.logMessage('customizeGlImpact', 'stTaxGrpId = arrTaxCodeGrps[i] ' + stTaxGrpId);
        //stTaxCodeId - tax code of tax group in dictionary
        var stTaxCodeId = objTaxCodeByGrp[stTaxGrpId] || '';
        NSUtils.logMessage('customizeGlImpact', 'stTaxCodeId = objTaxCodeByGrp[stTaxGrpId] ' + stTaxCodeId);
        //stTaxAccountId - internal ID of account to use for GST/HST
        var stTaxAccountId = objTaxAccountByCode[stTaxCodeId] || '';
        NSUtils.logMessage('customizeGlImpact', 'stTaxAccountId = objTaxAccountByCode[stTaxCodeId]  ' + stTaxAccountId);
        //add internal ID of account for GST/HST to the objTaxAccounts dictionary
        objTaxAccounts[stTaxGrpId] = stTaxAccountId;

        //again, pstTaxGrpId is the internal ID of the tax group
        var pstTaxGrpId = arrTaxCodeGrps[i];
        NSUtils.logMessage('customizeGlImpact', 'pstTaxGrpId = arrTaxCodeGrps[i] ' + pstTaxGrpId);
        // pstTaxCodeId - supposed to be the internal ID of the PST tax code but currently not finding anything
        var pstTaxCodeId = objPstTaxCodeByGrp[pstTaxGrpId] || '';
        NSUtils.logMessage('customizeGlImpact', 'pstTaxCodeId = objPstTaxCodeByGrp[pstTaxGrpId] ' + pstTaxCodeId);
        NSUtils.logMessage('customizeGlImpact', ' objPstTaxCodeByGrp ' + JSON.stringify(objPstTaxCodeByGrp));
        NSUtils.logMessage('customizeGlImpact', 'pstTaxGrpId] ' + pstTaxGrpId);

        var pstTaxAccountId = objTaxAccountByCode[pstTaxCodeId] || '';
        NSUtils.logMessage('customizeGlImpact', 'stTaxAccountId = objTaxAccountByCode[stTaxCodeId]  ' + pstTaxAccountId);

        objPstTaxAccounts[pstTaxGrpId] = pstTaxAccountId;
    }

    objAllTaxAccounts[1] = objTaxAccounts;
    objAllTaxAccounts[2] = objPstTaxAccounts;

    NSUtils.logMessage('customizeGlImpact',
        'objTaxAccounts - ' +
        JSON.stringify(objTaxAccounts));

    return objAllTaxAccounts
}




//regina - 2/6/2018 - set Custom Segments dynamically
function setCustomSegments(objCustSegmentData, objLine) {
    for (var stFldId in objCustSegmentData) {
        if (!NSUtils.isEmpty(objCustSegmentData[stFldId])) {
            objLine.setSegmentValueId(stFldId, objCustSegmentData[stFldId]);
        }

    }
}

//regina - 2/6/2018 - added to get Custom Segments
function getCustomSegments() {
    var stLogTitle = 'getCustomSegments';
    var arrCustomSegmentIds = [];

    var stSearchID = 'customsearch_custom_segment_gl'; //what search

    NSUtils.logMessage(stLogTitle, 'stSearchID = ' + stSearchID);

    var arrResults = NSUtils.search(null, stSearchID);

    if (!NSUtils.isEmpty(arrResults)) {
        for (var i = 0; i < arrResults.length; i++) {
            var stCustomSegmentId = arrResults[i].getValue('scriptid');

            arrCustomSegmentIds.push(stCustomSegmentId);
        }
    } else {
        NSUtils.logMessage(stLogTitle, 'No Custom Segments found.');
    }

    return arrCustomSegmentIds;
}

var NSUtils = {
    /**
     * Log message to the server script logs. Any mapped values are
     * automatically entered as audit entries. Messages are purely entered as
     * debug entries.
     *
     * @param {String}
     *            title [optional] - A title used to organize log entries (max
     *            length: 99 characters). If you set title to null or empty
     *            string (''), you will see the word "Untitled" appear in your
     *            log entry.
     * @param {String}
     *            details [optional] - The details of the log entry (max length:
     *            3000 characters)
     * @param {Object}
     *            map [optional] - Key-value pairs to be added to the message
     *            (the values add to the message length)
     * @returns {Void}
     */
    logMessage: function(title, details, map) {
        var i;
        if (!title) {
            title = "";
        }
        if (!details) {
            details = "";
        }
        if (map) {
            for (i in map) {
                if (map.hasOwnProperty(i)) {
                    details += ('\n' + i + ': ' + map[i]);
                }
            }
            nlapiLogExecution('AUDIT', title, details);
        } else {
            nlapiLogExecution('DEBUG', title, details);
        }
    },

    /**
     * Evaluate if the given string or object value is empty, null or undefined.
     *
     * @param {String}
     *            stValue - string or object to evaluate
     * @returns {Boolean} - true if empty/null/undefined, false if not
     * @author mmeremilla
     */
    isEmpty: function(stValue) {
        return ((stValue === '' || stValue == null || stValue == undefined || stValue === 'NaN') ||
            (stValue.constructor === Array && stValue.length == 0) || (stValue.constructor === Object && (function(
                v) {
                for (var k in v)
                    return false;
                return true;
            })(stValue)));
    },

    inArray: function(stValue, arrValue) {
        for (var i = arrValue.length - 1; i >= 0; i--) {
            if (stValue == arrValue[i]) {
                break;
            }
        }
        return (i > -1);
    },

    roundDecimalAmount: function(flDecimalNumber, intDecimalPlace) {
        //this is to make sure the rounding off is correct even if the decimal is equal to -0.995
        var bNegate = false;
        if (flDecimalNumber < 0) {
            flDecimalNumber = Math.abs(flDecimalNumber);
            bNegate = true;
        }

        var flReturn = 0.00;
        intDecimalPlace = (intDecimalPlace == null || intDecimalPlace == '') ? 0 : intDecimalPlace;

        var intMultiplierDivisor = Math.pow(10, intDecimalPlace);
        flReturn = Math.round((parseFloat(flDecimalNumber) * intMultiplierDivisor).toFixed(intDecimalPlace)) / intMultiplierDivisor;
        flReturn = (bNegate) ? (flReturn * -1) : flReturn;

        return flReturn;
    },

    /*
     * isEmpty : function(stValue) { if ((stValue == '') || (stValue == null) ||
     * (stValue == undefined)) { return true; } else { if (typeof stValue ==
     * 'string') { if ((stValue == '')) { return true; } }
     *
     * else if (typeof stValue == 'object') { if (stValue.length == 0 ||
     * stValue.length == 'undefined') { return true; } }
     *
     * return false; } },
     */
    /**
     * Get all of the results from the search even if the results are more than
     * 1000.
     *
     * @param {String}
     *            stRecordType - the record type where the search will be
     *            executed.
     * @param {String}
     *            stSearchId - the search id of the saved search that will be
     *            used.
     * @param {Array}
     *            arrSearchFilter - array of nlobjSearchFilter objects. The
     *            search filters to be used or will be added to the saved search
     *            if search id was passed.
     * @param {Array}
     *            arrSearchColumn - array of nlobjSearchColumn objects. The
     *            columns to be returned or will be added to the saved search if
     *            search id was passed.
     * @returns {Array} - an array of nlobjSearchResult objects
     * @author memeremilla - initial version
     * @author gmanarang - used concat when combining the search result
     */
    search: function(stRecordType, stSearchId, arrSearchFilter,
                     arrSearchColumn) {
        var arrReturnSearchResults = new Array();
        var nlobjSavedSearch;

        if (stSearchId != null) {
            nlobjSavedSearch = nlapiLoadSearch((stRecordType) ? stRecordType :
                null, stSearchId);

            // add search filter if one is passed
            if (arrSearchFilter != null) {
                nlobjSavedSearch.addFilters(arrSearchFilter);
            }

            // add search column if one is passed
            if (arrSearchColumn != null) {
                nlobjSavedSearch.addColumns(arrSearchColumn);
            }
        } else {
            nlobjSavedSearch = nlapiCreateSearch((stRecordType) ? stRecordType :
                null, arrSearchFilter, arrSearchColumn);
        }

        var nlobjResultset = nlobjSavedSearch.runSearch();
        var intSearchIndex = 0;
        var nlobjResultSlice = null;
        do {

            nlobjResultSlice = nlobjResultset.getResults(intSearchIndex,
                intSearchIndex + 1000);
            if (!(nlobjResultSlice)) {
                break;
            }

            arrReturnSearchResults = arrReturnSearchResults
                .concat(nlobjResultSlice);
            intSearchIndex = arrReturnSearchResults.length;
        }

        while (nlobjResultSlice.length >= 1000);

        return arrReturnSearchResults;
    },
    /**
     * Get value of a saved search column using a label(formula numeric fileds
     * on the saved search result).
     *
     * @param {nlobjSearchResultSet}
     *            result [required] - A single record from the result set.
     * @param {String}
     *            label [required] - The custom label from the saved search
     *            column.
     * @returns {String} sValue - The value for the saved search column.
     */
    getValueByLabel: function(result, label) {
        var sValue = '';
        var columns = result.getAllColumns();
        // NSUtils.logMessage('intializeSearch', 'columns - ' + columns);
        var columnLen = columns.length;
        var column;
        for (i = 0; i < columnLen; i++) {
            column = columns[i];
            if (column.getLabel() == label) {
                sValue = result.getValue(column);
                break;
            }
        }
        return sValue;
    }

}
