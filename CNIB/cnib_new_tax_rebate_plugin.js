   /**
     * Tax Rebates Custom GL Plugin
     *
     * @author CDL
     * @version 1.0
     */


   function customizeGlImpact(transactionRecord, standardLines, customLines, book) {
    nlapiLogExecution('AUDIT', 'customizeGlImpact', 'START');
    var arrAdditionalLines = []
    var additionalLines
    var isCalculateTaxRebates = transactionRecord.getFieldValue('custbody_nfp_cdn_rebate_gl');
    if (isCalculateTaxRebates){
        nlapiLogExecution('AUDIT', 'isCalculateTaxRebates', isCalculateTaxRebates);
        var arrStdLineDet = [];

        //gets all the information from the standard lines
        for (var k = 1; k < standardLines.getCount(); k++) {
            var currStdLine = standardLines.getLine(k);
            var debitAmount = currStdLine.getDebitAmount();
            var creditAmount = currStdLine.getCreditAmount();
            var idStdAccount = currStdLine.getAccountId();
            var idStdEntity = currStdLine.getEntityId();
            var idStdLocation = currStdLine.getLocationId();
            var idProj = transactionRecord.getLineItemValue('expense', 'custcol_cseg_npo_grant', k);
            //var idFunder = currStdLine.getClassId();
            var department = currStdLine.getDepartmentId();
            if ((debitAmount != 0 || creditAmount != 0) && idStdAccount != null) {
                var stdmap = {
                    "idStdAccount": idStdAccount,
                    "idStdEntity": idStdEntity,
                    "debitAmount": debitAmount ? parseFloat(debitAmount).toFixed(2) : null,
                    "creditAmount": creditAmount,
                    "idProj": idProj,
                    "department": department,
                    "location": idStdLocation
                }
            //adds information from each standard line to an array
            arrStdLineDet.push(stdmap);
            }
        }
        nlapiLogExecution('AUDIT', 'standardLines', JSON.stringify(arrStdLineDet));
        var iSubLstCntExpense = transactionRecord.getLineItemCount('expense');
        var arrTaxCodeGrps = [];
        for (var t = 1; t <= iSubLstCntExpense; t++) {
            //idTaxcode = tax group
            var idTaxcode = transactionRecord.getLineItemValue('expense', 'taxcode', t);
            NSUtils.logMessage('customizeGlImpact', 'idTaxcode - ' + idTaxcode);
            if (!NSUtils.isEmpty(idTaxcode)) {
                //regina - added to get the tax code
                //this makes sure each tax group in array is unique
                if (!NSUtils.inArray(idTaxcode, arrTaxCodeGrps)) {
                    arrTaxCodeGrps.push(idTaxcode);
                }
            }
        }
        var objTaxAccounts = getTaxAccounts(arrTaxCodeGrps)
        var objPstTaxAccounts = objTaxAccounts[2];
        

        var expenselineCount = transactionRecord.getLineItemCount('expense');
        nlapiLogExecution('AUDIT', 'expenselineCount', expenselineCount);
        for (var x = 1; x <= expenselineCount; x++) {
            var idTaxcode = transactionRecord.getLineItemValue('expense', 'taxcode', x);
            var memo = transactionRecord.getLineItemValue('expense', 'memo', x);
            nlapiLogExecution('AUDIT', 'memo 4 each line', memo);
            var explTaxRate1 = transactionRecord.getLineItemValue('expense', 'taxrate1', x);
            var explTaxRate2 = transactionRecord.getLineItemValue('expense', 'taxrate2', x);
            var explAmount = transactionRecord.getLineItemValue('expense', 'amount', x);
            var explAccountId = transactionRecord.getLineItemValue('expense', 'account', x);
            var explLocationId = transactionRecord.getLineItemValue('expense', 'cseg_npo_region', x);
            var explProgramId = transactionRecord.getLineItemValue('expense', 'cseg_npo_program', x);
            var explGrantId = transactionRecord.getLineItemValue('expense', 'custcol_cseg_npo_grant', x);
            var explFuncId = transactionRecord.getLineItemValue('expense', 'custcol_cseg_npo_exp_type', x);
            var explDepartmentId = transactionRecord.getLineItemValue('expense', 'department', x);
            var explDistriEntityId = transactionRecord.getLineItemValue('expense', 'custcol_ns_dist_subsidiary', x);
            var explClassId = transactionRecord.getLineItemValue('expense', 'class', x);
            var bodyEntity = transactionRecord.getFieldValue('subsidiary');
            var bodyDepartment = transactionRecord.getFieldValue('department');
            var bodyClass = transactionRecord.getFieldValue('class');
            var bodyLocation = transactionRecord.getFieldValue('cseg_npo_region');
            var taxRate = explTaxRate2 ? parseFloat(explTaxRate2) : null;
            var amt = explAmount ? parseFloat(explAmount) : null;
            var taxAmount = parseFloat(Math.ceil(amt * taxRate) / 100);
            taxAmount.toFixed(2);
            var headerSegments = {
                entity: null,
                department: bodyDepartment ? parseInt(bodyDepartment) : null,
                class: bodyClass ? parseInt(bodyEbodyClassntity) : null,
                location: bodyLocation ? parseInt(bodyLocation) : null,
            }
            var lineSegments = {
                entity: null,
                department: explDepartmentId ? parseInt(explDepartmentId) : null,
                class: explClassId ? parseInt(explClassId) : null,
                location: explLocationId ? parseInt(explLocationId) : null,
            }
            var objSegments = {
                program: explProgramId ? parseInt(explProgramId) : null,
                functionalExpense: explFuncId ? parseInt(explFuncId) : null,
                memo: memo,
                grant: explGrantId ? parseInt(explGrantId) : null,
            }
            if (explTaxRate1 == "13.0%" && explTaxRate2 == "0.0%") {
                additionalLines = 3;
                var lineData = {
                    accountId: 1128, // 10315 HST Rebate Receivables @50 %
                    isDebit: true,
                    amount: parseFloat((explAmount * 0.13 * 0.6969).toFixed(2)), // Calculate 13% of explAmount and then 69.69% of that result
                    
                };
                var mergedObject = { lineData: lineData, fixObj: headerSegments, segments:  objSegments};
                if (mergedObject.lineData.amount !== 0) {
                    arrAdditionalLines.push(mergedObject);
                }
                var lineData = {
                    accountId: explAccountId ? parseInt(explAccountId) : null, // Expense Line Account (Source)
                    isDebit: true,
                    amount: parseFloat((explAmount * 0.13 * 0.3031).toFixed(2)),
                    
                }
                var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments };
                if (mergedObject.lineData.amount !== 0) {
                    arrAdditionalLines.push(mergedObject);
                }
                var lineData = {
                    accountId: 109, // 10320 GST & HST on Purchases
                    isDebit: false,
                    amount: parseFloat((explAmount * 0.13 *  1.0).toFixed(2)),
                    
                }
                var mergedObject = { lineData: lineData, fixObj: headerSegments, segments:  objSegments };
                if (mergedObject.lineData.amount !== 0) {
                    arrAdditionalLines.push(mergedObject);
                }
            } else if (explTaxRate1 == "5.0%" && explTaxRate2 == "0.0%") {
                additionalLines = 3;
                var lineData = {
                    accountId: 1128, // 10315 HST Rebate Receivables @50 %
                    isDebit: true,
                    amount: parseFloat((explAmount * 0.05 * 0.50).toFixed(2)),
                    
                };
                var mergedObject = { lineData: lineData, fixObj: headerSegments, segments:  objSegments };
                if (mergedObject.lineData.amount !== 0) {
                    arrAdditionalLines.push(mergedObject);
                }
                var lineData = {
                    accountId: explAccountId ? parseInt(explAccountId) : null, // Expense Line Account (Source)
                    isDebit: true,
                    amount: parseFloat((explAmount * 0.05 * 0.50).toFixed(2)), 
                    
                };
                var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments };
                if (mergedObject.lineData.amount !== 0) {
                    arrAdditionalLines.push(mergedObject);
                }
                var lineData = {
                    accountId: 109, // 10320 GST & HST on Purchases
                    isDebit: false,
                    amount: parseFloat((explAmount * 0.05 * 1.0).toFixed(2)),
                    
                }
                var mergedObject = { lineData: lineData, fixObj: headerSegments, segments:  objSegments };
                if (mergedObject.lineData.amount !== 0) {
                    arrAdditionalLines.push(mergedObject);
                }
            } else if (explTaxRate1 == "15.0%" && explTaxRate2 == "0.0%") {
                additionalLines = 3;
                var lineData = {
                    accountId: 1128, // 10315 HST Rebate Receivables @50 %
                    isDebit: true,
                    amount: parseFloat((explAmount * 0.15 * 0.50).toFixed(2)), 
                    
                };
                var mergedObject = { lineData: lineData, fixObj: headerSegments, segments:  objSegments };
                if (mergedObject.lineData.amount !== 0) {
                    arrAdditionalLines.push(mergedObject);
                }
                var lineData = {
                    accountId: explAccountId ? parseInt(explAccountId) : null, // Expense Line Account (Source)
                    isDebit: true,
                    amount: parseFloat((explAmount * 0.15 * 0.50).toFixed(2)), 
                    
                };
                var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments };
                if (mergedObject.lineData.amount !== 0) {
                    arrAdditionalLines.push(mergedObject);
                }
                var lineData = {
                    accountId: 109, // 10320 GST & HST on Purchases
                    isDebit: false,
                    amount: parseFloat((explAmount * 0.15 * 1.0).toFixed(2)),
                    
                }
                var mergedObject = { lineData: lineData, fixObj: headerSegments, segments:  objSegments };
                if (mergedObject.lineData.amount !== 0) {
                    arrAdditionalLines.push(mergedObject);
                }
            } else if (explTaxRate1 == "5.0%" && explTaxRate2 == "7.0%") {
                additionalLines = 5;
                var lineData = {
                    accountId: 1128, // 10315 HST Rebate Receivables @50 %
                    isDebit: true,
                    amount: parseFloat((explAmount * 0.05 * 0.50).toFixed(2)), 
                    
                };
                var mergedObject = { lineData: lineData, fixObj: headerSegments, segments:  objSegments };
                if (mergedObject.lineData.amount !== 0) {
                    arrAdditionalLines.push(mergedObject);
                }
                var lineData = {
                    accountId: explAccountId ? parseInt(explAccountId) : null, // Expense Line Account (Source)
                    isDebit: true,
                    amount: parseFloat((explAmount * 0.05 * 0.50).toFixed(2)), 
                    
                };
                var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments };
                if (mergedObject.lineData.amount !== 0) {
                    arrAdditionalLines.push(mergedObject);
                }
                var lineData = {
                    accountId: 109, // 10320 GST & HST on Purchases
                    isDebit: false,
                    amount: parseFloat((explAmount * 0.05 * 1.0).toFixed(2)),
                    
                }
                var mergedObject = { lineData: lineData, fixObj: headerSegments, segments:  objSegments };
                if (mergedObject.lineData.amount !== 0) {
                    arrAdditionalLines.push(mergedObject);
                }
                var lineData = {
                    accountId: explAccountId ? parseInt(explAccountId) : null, // Expense Line Account (Source)
                    isDebit: true,
                    amount:parseFloat((explAmount * 0.07 * 1.0).toFixed(2)), 
                    
                };
                var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments };
                if (mergedObject.lineData.amount !== 0) {
                    arrAdditionalLines.push(mergedObject);
                }
                var acctId = parseInt(objPstTaxAccounts[idTaxcode]) || 0;
                var lineData = {
                    accountId: acctId, // 89505 PST Expenses BC 1246
                    isDebit: false,
                    amount: parseFloat((explAmount * 0.07 * 1.0).toFixed(2)),
                    
                }
                var mergedObject = { lineData: lineData, fixObj: headerSegments, segments:  objSegments };
                if (mergedObject.lineData.amount !== 0) {
                    arrAdditionalLines.push(mergedObject);
                }
            } else if (explTaxRate1 == "0.0%" && explTaxRate2 == "7.0%") {
                additionalLines = 2;
                var lineData = {
                    accountId: explAccountId ? parseInt(explAccountId) : null, // Expense Line Account (Source)
                    isDebit: true,
                    amount: parseFloat((explAmount * 0.07 * 1.0).toFixed(2)), 
                   
                };
                var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments };
                if (mergedObject.lineData.amount !== 0) {
                    arrAdditionalLines.push(mergedObject);
                }
                var acctId = parseInt(objPstTaxAccounts[idTaxcode]) || 0;
                var lineData = {
                    accountId: acctId, // 89505 PST Expenses BC 1246
                    isDebit: false,
                    amount: parseFloat((explAmount * 0.07 * 1.0).toFixed(2)),
                      
                };
                var mergedObject = { lineData: lineData, fixObj: headerSegments, segments:  objSegments };
                if (mergedObject.lineData.amount !== 0) {
                    arrAdditionalLines.push(mergedObject);
                }
            } else if (explTaxRate1 == "5.0%" && explTaxRate2 == "9.975%") {
                additionalLines = 5;
                var lineData = {
                    accountId: 1128, // 10315 HST Rebate Receivables @50 %
                    isDebit: true,
                    amount: parseFloat((explAmount * 0.05 * 0.50).toFixed(2)), 
                    
                };
                var mergedObject = { lineData: lineData, fixObj: headerSegments, segments:  objSegments };
                if (mergedObject.lineData.amount !== 0) {
                    arrAdditionalLines.push(mergedObject);
                }
                var lineData = {
                    accountId: explAccountId ? parseInt(explAccountId) : null, // Expense Line Account (Source)
                    isDebit: true,
                    amount: parseFloat((explAmount * 0.05 * 0.50).toFixed(2)), 
                    
                };
                var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments };
                if (mergedObject.lineData.amount !== 0) {
                    arrAdditionalLines.push(mergedObject);
                }
                var lineData = {
                    accountId: 109, // 10320 GST & HST on Purchases
                    isDebit: false,
                    amount: parseFloat((explAmount * 0.05 * 1.0).toFixed(2)),
                    
                }
                var mergedObject = { lineData: lineData, fixObj: headerSegments, segments:  objSegments};
                if (mergedObject.lineData.amount !== 0) {
                    arrAdditionalLines.push(mergedObject);
                }
                var lineData = {
                    accountId: explAccountId ? parseInt(explAccountId) : null, // Expense Line Account (Source)
                    isDebit: true,
                    amount: parseFloat((explAmount * 0.09975 * 1.0).toFixed(2)),
                    
                };
                var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments };
                if (mergedObject.lineData.amount !== 0) {
                    arrAdditionalLines.push(mergedObject);
                }
                var acctId = parseInt(objPstTaxAccounts[idTaxcode]) || 0;
                var lineData = {
                    accountId: acctId, // 89505 PST Expenses BC 1246
                    isDebit: false,
                    amount: parseFloat((explAmount * 0.09975 * 1.0).toFixed(2)),
                    
                }
                var mergedObject = { lineData: lineData, fixObj: headerSegments, segments:  objSegments };
                if (mergedObject.lineData.amount !== 0) {
                    arrAdditionalLines.push(mergedObject);
                }
            } else if (explTaxRate1 == "5.0%" && explTaxRate2 == "6.0%") {
                additionalLines = 5;
                var lineData = {
                    accountId: 1128, // 10315 HST Rebate Receivables @50 %
                    isDebit: true,
                    amount: parseFloat((explAmount * 0.05 * 0.50).toFixed(2)), 
                };
                var mergedObject = { lineData: lineData, fixObj: headerSegments, segments:  objSegments };
                if (mergedObject.lineData.amount !== 0) {
                    arrAdditionalLines.push(mergedObject);
                }
                var lineData = {
                    accountId: explAccountId ? parseInt(explAccountId) : null, // Expense Line Account (Source)
                    isDebit: true,
                    amount: parseFloat((explAmount * 0.05 * 0.50).toFixed(2)), 
                };
                var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments };
                if (mergedObject.lineData.amount !== 0) {
                    arrAdditionalLines.push(mergedObject);
                }
                var lineData = {
                    accountId: 109, // 10320 GST & HST on Purchases
                    isDebit: false,
                    amount: parseFloat((explAmount * 0.05 * 1.0).toFixed(2)),
                }
                var mergedObject = { lineData: lineData, fixObj: headerSegments, segments:  objSegments };
                if (mergedObject.lineData.amount !== 0) {
                    arrAdditionalLines.push(mergedObject);
                }
                var lineData = {
                    accountId: explAccountId ? parseInt(explAccountId) : null, // Expense Line Account (Source)
                    isDebit: true,
                    amount: explAmount * 0.06 * 1.0, 
                };
                var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments };
                if (mergedObject.lineData.amount !== 0) {
                    arrAdditionalLines.push(mergedObject);
                }
                var acctId = parseInt(objPstTaxAccounts[idTaxcode]) || 0;
                var lineData = {
                    accountId: acctId, // 89505 PST Expenses BC 1246
                    isDebit: false,
                    amount: parseFloat((explAmount * 0.06 * 1.0).toFixed(2)),
                   
                }
                var mergedObject = { lineData: lineData, fixObj: headerSegments, segments:  objSegments };
                if (mergedObject.lineData.amount !== 0) {
                    arrAdditionalLines.push(mergedObject);
                }
            } else if (explTaxRate1 == "0.0%" && explTaxRate2 == "6.0%") {
                additionalLines = 2;
                var lineData = {
                    accountId: explAccountId ? parseInt(explAccountId) : null, // Expense Line Account (Source)
                    isDebit: true,
                    amount: parseFloat((explAmount * 0.06 * 1.0).toFixed(2)), 
                    
                };
                var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments };
                if (mergedObject.lineData.amount !== 0) {
                    arrAdditionalLines.push(mergedObject);
                }
                var lineData = {
                    accountId: 1246, // 89505 PST Expenses BC
                    isDebit: false,
                    amount: parseFloat((explAmount * 0.06 * 1.0).toFixed(2)), 
                    
                };
                var mergedObject = { lineData: lineData, fixObj: headerSegments, segments:  objSegments };
                if (mergedObject.lineData.amount !== 0) {
                    arrAdditionalLines.push(mergedObject);
                }
            } else if (explTaxRate1 == "0.0%" && explTaxRate2 == "9.975%") {
                additionalLines = 2;
                var lineData = {
                    accountId: explAccountId ? parseInt(explAccountId) : null, // Expense Line Account (Source)
                    isDebit: true,
                    amount: parseFloat((explAmount * 0.09975 * 1.0).toFixed(2)), 
                    
                };
                var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments };
                if (mergedObject.lineData.amount !== 0) {
                    arrAdditionalLines.push(mergedObject);
                }
                var acctId = parseInt(objPstTaxAccounts[idTaxcode]) || 0;
                var lineData = {
                    accountId: acctId, // 89505 PST Expenses BC 1246
                    isDebit: false,
                    amount: parseFloat((explAmount * 0.09975 * 1.0).toFixed(2)), 
                    
                };
                var mergedObject = { lineData: lineData, fixObj: headerSegments, segments:  objSegments };
                if (mergedObject.lineData.amount !== 0) {
                    arrAdditionalLines.push(mergedObject);
                }
            } else {
                additionalLines = 0;
            }
        }
        nlapiLogExecution('AUDIT', 'arrAdditionalLines', JSON.stringify(arrAdditionalLines));

        var arrInvalidAmount = [];
        var threshold = 0.0001;
        var accountId;
        var isDebit;
        var amount;
        var totalDebit = 0;
        var totalCredit = 0;
        var totalInvalidAmount = 0;
        
        for (var x = 0; x < arrAdditionalLines.length; x++) {
            var program = arrAdditionalLines[x].segments.program;
            var grant = arrAdditionalLines[x].segments.grant;
            var functionalExpense = arrAdditionalLines[x].segments.functionalExpense;
            var intClass = arrAdditionalLines[x].fixObj.class;
            var intDepartment = arrAdditionalLines[x].fixObj.department;
            var intLocation = arrAdditionalLines[x].fixObj.location;
            var memo = arrAdditionalLines[x].segments.memo;
            var accountId = arrAdditionalLines[x].lineData.accountId;
            var intEntity = getEntityId(arrStdLineDet, accountId);
            var isDebit = arrAdditionalLines[x].lineData.isDebit;
            var amountBefore = arrAdditionalLines[x].lineData.amount;
            nlapiLogExecution('AUDIT', 'arrAdditionalLines', JSON.stringify(arrAdditionalLines[x]));
        
            // Ensure the amount is positive or very close to zero
            var amount = NSUtils.roundDecimalAmount(parseFloat(amountBefore), 2);
            // nlapiLogExecution('AUDIT', 'amount before', amountBefore);
            // nlapiLogExecution('AUDIT', 'amount after', amount);
        
            if (amount >= threshold && amount != 0) {
                var customLine = customLines.addNewLine();
                customLine.setAccountId(accountId);
                if (isDebit) {
                    totalDebit += amount;
                    customLine.setDebitAmount(amount);
                } else {
                    totalCredit += amount;
                    customLine.setCreditAmount(Math.abs(amount));
                }
                // Set other customLine properties...
                customLine.setMemo(memo);
                customLine.setEntityId(intEntity);
                customLine.setDepartmentId(intDepartment);
                customLine.setClassId(intClass);
                customLine.setSegmentValueId('cseg_npo_program', program);
                customLine.setSegmentValueId('cseg_npo_grant', grant);
                customLine.setSegmentValueId('cseg_npo_exp_type', functionalExpense);
                customLine.setSegmentValueId('cseg_npo_region', intLocation);
            } else {
                if (amount != 0){
                    arrInvalidAmount.push({ invalidAmount: amountBefore });
                } 
            }
        }
        
        nlapiLogExecution('AUDIT', 'arrInvalidAmount', JSON.stringify(arrInvalidAmount));
        nlapiLogExecution('AUDIT', 'totalDebit', totalDebit.toFixed(2));
        nlapiLogExecution('AUDIT', 'totalCredit', totalCredit.toFixed(2));

        if (Number(totalDebit.toFixed(2)) !== Number(totalCredit.toFixed(2))) {
            if (arrInvalidAmount.length > 0 && arrInvalidAmount){
                additionalAmount(totalDebit, totalCredit, customLines)
            } else {
                nlapiLogExecution('AUDIT', 'amounts', totalDebit + ' | ' + totalCredit);
                additionalAmount(totalDebit, totalCredit, customLines)
            }
        }
    }
}

function additionalAmount(totalDebit, totalCredit, customLines) {
    var intExcess = 0;
    var clearAccountId = 2184;
    if (totalDebit > totalCredit){
        intExcess = totalDebit - totalCredit;
        var customLine = customLines.addNewLine();
        customLine.setAccountId(clearAccountId);
        customLine.setCreditAmount(Math.abs(intExcess));
        customLine.setMemo('Clearing Account');
    } else if (totalDebit < totalCredit) {
        intExcess = totalCredit - totalDebit; 
        var customLine = customLines.addNewLine();
        customLine.setAccountId(clearAccountId);
        customLine.setDebitAmount(intExcess);
        customLine.setMemo('Clearing Account');
    }
}

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

        for (var i = 0; i < iRecCounts; i++) {
            var result = arrResults[i];
            //stTaxGrpId - tax group id
            var stTaxGrpId = result.getId();
            //stTaxCodeId - purchase tax acct for taxitem1
            var stTaxCodeId = result.getValue('taxitem1');
            //pstTaxCodeId - purchase tax acct for taxitem2
            var pstTaxCodeId = result.getValue('taxitem2');


            if (!NSUtils.isEmpty(stTaxCodeId)) {
                objTaxCodeByGrp[stTaxGrpId] = stTaxCodeId;                    //get unique tax codes
                if (!NSUtils.inArray(stTaxCodeId, arrTaxCodes)) {
                    arrTaxCodes.push(stTaxCodeId);    
                }
            }
            if (!NSUtils.isEmpty(pstTaxCodeId)) {
                objPstTaxCodeByGrp[stTaxGrpId] = pstTaxCodeId;
                //get unique tax codes
                if (!NSUtils.inArray(pstTaxCodeId, arrPstTaxCodes)) {
                    arrPstTaxCodes.push(pstTaxCodeId);    
                }
            }
        }
    }
    nlapiLogExecution('AUDIT', 'arrPstTaxCodes', JSON.stringify(arrPstTaxCodes));
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
        for (var i = 0; i < iRecCounts; i++) {
            var result = arrResults[i];
            var stTaxCodeId = result.getId();
            var stTaxAccountId = result.getValue('purchaseaccount');
            objTaxAccountByCode[stTaxCodeId] = stTaxAccountId;

        }
    }

    //get the tax account from the GST/HST tax codes
    var objPstTaxAccountByCode = {};

    var arrPstResults = NSUtils.search('salestaxitem', null,
        [new nlobjSearchFilter('internalid', null, 'anyof', arrPstTaxCodes)],
        [new nlobjSearchColumn('purchaseaccount')]);

    if (!NSUtils.isEmpty(arrPstResults)) {
        var iRecCounts = arrPstResults.length;    
        for (var i = 0; i < iRecCounts; i++) {
            var result = arrPstResults[i];
            var pstTaxCodeId = result.getId();
            var pstTaxAccountId = result.getValue('purchaseaccount');
            objTaxAccountByCode[pstTaxCodeId] = pstTaxAccountId;

        }
    }

    //get the tax account for the given tax group
    //for each tax group get the tax account
    for (var i = 0; i < arrTaxCodeGrps.length; i++) {
        //stTaxGrpId - tax group internal ID
        var stTaxGrpId = arrTaxCodeGrps[i];
        //stTaxCodeId - tax code of tax group in dictionary
        var stTaxCodeId = objTaxCodeByGrp[stTaxGrpId] || '';
        //stTaxAccountId - internal ID of account to use for GST/HST
        var stTaxAccountId = objTaxAccountByCode[stTaxCodeId] || '';
        //add internal ID of account for GST/HST to the objTaxAccounts dictionary
        objTaxAccounts[stTaxGrpId] = stTaxAccountId;

        //again, pstTaxGrpId is the internal ID of the tax group
        var pstTaxGrpId = arrTaxCodeGrps[i];
        // pstTaxCodeId - supposed to be the internal ID of the PST tax code but currently not finding anything
        var pstTaxCodeId = objPstTaxCodeByGrp[pstTaxGrpId] || '';

        var pstTaxAccountId = objTaxAccountByCode[pstTaxCodeId] || '';

        objPstTaxAccounts[pstTaxGrpId] = pstTaxAccountId;
    }

    objAllTaxAccounts[1] = objTaxAccounts;
    objAllTaxAccounts[2] = objPstTaxAccounts;

    return objAllTaxAccounts
}

function getEntityId(arrStdLineDet, accountId) {
    var retId = null;
    accountId = accountId;
    //gets all the information from the standard lines
    for (var x = 0; x < arrStdLineDet.length; x++) {
        var currentStandardLine = arrStdLineDet[x];
        var stdAccountId = currentStandardLine.idStdAccount;
        var stdEntityId = currentStandardLine.idStdEntity;
        if (stdAccountId == accountId) {
            retId = stdEntityId;
        }   
    }
    return retId
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