/**
 * Tax Rebates Custom GL Plugin
 *
 * @author ACS
 * @version 1.0
 */
var contextObj = nlapiGetContext();

function customizeGlImpact(transactionRecord, standardLines, customLines, book) {
    nlapiLogExecution('AUDIT', 'customizeGlImpact', 'START');
    var context = nlapiGetContext().getExecutionContext();
    var isCalculateTaxRebates = transactionRecord.getFieldValue('custbody_nfp_cdn_rebate_gl');
    nlapiLogExecution('AUDIT', 'customizeGlImpact', 'context - ' + context);
    nlapiLogExecution('AUDIT', 'customizeGlImpact', 'isCalculateTaxRebates - ' + isCalculateTaxRebates);
    var remainingUsage = contextObj.getRemainingUsage();
    nlapiLogExecution('AUDIT', 'customizeGlImpact', 'remainingUsage BEFORE - ' + remainingUsage);

    if (isCalculateTaxRebates == 'T') {
        var arrStandardLines = [];
        var arrExpenseLines = [];
        var arrCustomLines = [];
        var ACCT1320_TAXRECEIVABLES_GSTHSTPURCHASES = 109;
        // disabled for pst, pst is now source from the standard lines
        // var ACCT89510_PST_EXPENSES_MB = 1251;
        var ACCT10315_HSTREBATE_RECEIVABLES_50 = 1128;

        //gets all the information from the standard gl lines
        for (var x = 1; x < standardLines.getCount(); x++) {
            var currentStandardLine = standardLines.getLine(x);

            var stdDebitAmount = currentStandardLine.getDebitAmount();
            var stdCreditAmount = currentStandardLine.getCreditAmount();
            var stdAccountId = currentStandardLine.getAccountId();
            var stdEntityId = currentStandardLine.getEntityId();
            var stdDepartmentId = currentStandardLine.getDepartmentId();
            arrStandardLines.push({
                stdDebitAmount: stdDebitAmount,
                stdCreditAmount: stdCreditAmount,
                stdAccountId: !isEmpty(stdAccountId) ? parseInt(stdAccountId) : null,
                stdEntityId: !isEmpty(stdEntityId) ? parseInt(stdEntityId) : null,
                stdDepartmentId: !isEmpty(stdDepartmentId) ? parseInt(stdDepartmentId) : null
            });
        }
        nlapiLogExecution('AUDIT', 'arrStandardLines', JSON.stringify(arrStandardLines));
        
        var mainLocationId = transactionRecord.getFieldValue('cseg_npo_region');
        mainLocationId = !isEmpty(mainLocationId) ? parseInt(mainLocationId) : null;
        var mainDepartmentId = transactionRecord.getFieldValue('department');
        mainDepartmentId = !isEmpty(mainDepartmentId) ? parseInt(mainDepartmentId) : null;
        var mainEntityId = transactionRecord.getFieldValue('subsidiary');
        mainEntityId = !isEmpty(mainEntityId) ? parseInt(mainEntityId) : null;

        // gets all the information from the expense lines
        var expenselineCount = transactionRecord.getLineItemCount('expense');
        nlapiLogExecution('AUDIT', 'expenselineCount', expenselineCount);
        for (var x = 1; x <= expenselineCount; x++) {
            var explTaxRate1 = transactionRecord.getLineItemValue('expense', 'taxrate1', x);
            var explTaxRate2 = transactionRecord.getLineItemValue('expense', 'taxrate2', x);
            var explAmount = transactionRecord.getLineItemValue('expense', 'amount', x);
            var explAccountId = transactionRecord.getLineItemValue('expense', 'account', x);
            var explLocationId = transactionRecord.getLineItemValue('expense', 'cseg_npo_region', x);
            var explDepartmentId = transactionRecord.getLineItemValue('expense', 'department', x);
            var explEntitytId = transactionRecord.getLineItemValue('expense', 'custcol_ns_dist_subsidiary', x);
            var explProgram = transactionRecord.getLineItemValue('expense', 'cseg_npo_program', x);

            arrExpenseLines.push({
                explTaxRate1: !isEmpty(explTaxRate1) ? (parseFloat(explTaxRate1) / 100.0) : 0.0,
                explTaxRate2: !isEmpty(explTaxRate2) ? (parseFloat(explTaxRate2) / 100.0) : 0.0,
                explAmount: !isEmpty(explAmount) ? parseFloat(explAmount) : 0.0,
                explAccountId: !isEmpty(explAccountId) ? parseInt(explAccountId) : null,
                explLocationId: !isEmpty(explLocationId) ? parseInt(explLocationId) : null,
                explDepartmentId: !isEmpty(explDepartmentId) ? parseInt(explDepartmentId) : null,
                explEntitytId: !isEmpty(explEntitytId) ? parseInt(explEntitytId) : null,
                explProgram: !isEmpty(explProgram) ?  parseInt(explProgram) : null
            });
        }
        nlapiLogExecution('AUDIT', 'arrExpenseLines', JSON.stringify(arrExpenseLines));

        // CALCULATE REBATES
        for (var x = 0; x < arrExpenseLines.length; x++) {
            var taxAmount = 0;
            var taxRebate = 0;
            var nonRebateAmount = 0;
            var amount = arrExpenseLines[x].explAmount;
            // for GST/HST
            if (amount > 0 && arrExpenseLines[x].explTaxRate1 > 0) {
                var taxRate = arrExpenseLines[x].explTaxRate1;
                taxAmount = amount * taxRate;
                var rebatePercentage = 0;
                
                if (taxRate == 0.05) {
                    // GST
                    rebatePercentage = 0.5; // 50%
                }else if (taxRate == 0.15) {
                    // HST
                    rebatePercentage = 0.5; // 50%
                } else if (taxRate == 0.13) {
                    // HST
                    rebatePercentage = 0.6969; // 69.69%
                }
                taxRebate = taxAmount * rebatePercentage;
                nonRebateAmount = taxAmount - taxRebate;

                // Counter GL
                arrCustomLines.push({
                    accountId: ACCT1320_TAXRECEIVABLES_GSTHSTPURCHASES,
                    amount: taxAmount,
                    isDebit: false,
                    locationId: mainLocationId,
                    departmentId: mainDepartmentId,
                    entityId: mainEntityId,
                    program: arrExpenseLines[x].explProgram,
                });

                // Rebate GL
                arrCustomLines.push({
                    accountId: ACCT10315_HSTREBATE_RECEIVABLES_50,
                    amount: taxRebate,
                    isDebit: true,
                    locationId: mainLocationId,
                    departmentId: mainDepartmentId,
                    entityId: mainEntityId,
                    program: arrExpenseLines[x].explProgram,
                });

                // Non-Rebate GL - remaing amount after rebate has been added.
                arrCustomLines.push({
                    accountId: arrExpenseLines[x].explAccountId,
                    amount: nonRebateAmount,
                    isDebit: true,
                    locationId: arrExpenseLines[x].explLocationId,
                    departmentId: arrExpenseLines[x].explDepartmentId,
                    entityId: arrExpenseLines[x].explEntitytId,
                    program: arrExpenseLines[x].explProgram,
                });
            }
            // for PST
            if (amount > 0 && arrExpenseLines[x].explTaxRate2 > 0) {
                // get the tax rate from the expense line
                var taxRate = arrExpenseLines[x].explTaxRate2;
                taxAmount = amount * taxRate;
                var accountId = getAccountId(arrStandardLines, taxAmount);
                nlapiLogExecution('AUDIT', 'accountId', 'accountId ' + accountId + ' taxAmount ' + taxAmount + ' taxRate ' + taxRate);
                // Credit
                arrCustomLines.push({
                    accountId: accountId,
                    amount: taxAmount,
                    isDebit: false,
                    locationId: mainLocationId,
                    departmentId: mainDepartmentId,
                    entityId: mainEntityId,
                    program: arrExpenseLines[x].explProgram,
                });
                // Debit
                arrCustomLines.push({
                    accountId: arrExpenseLines[x].explAccountId,
                    amount: taxAmount,
                    isDebit: true,
                    locationId: arrExpenseLines[x].explLocationId,
                    departmentId: arrExpenseLines[x].explDepartmentId,
                    entityId: arrExpenseLines[x].explEntitytId,
                    program: arrExpenseLines[x].explProgram,
                });
            }
        }
        nlapiLogExecution('AUDIT', 'arrCustomLines', JSON.stringify(arrCustomLines));

        // ADD CUSTOM GL LINES
        for (var x = 0; x < arrCustomLines.length; x++) {

            var accountId = arrCustomLines[x].accountId;
            var amount = arrCustomLines[x].amount;
            var isDebit = arrCustomLines[x].isDebit;
            var locationId = arrCustomLines[x].locationId;
            var program = arrCustomLines[x].program;
            var departmentId = arrCustomLines[x].departmentId;
            var entityId = arrCustomLines[x].entityId;

            nlapiLogExecution('AUDIT', 'ADDING CUSTOM LINES', 'accountId: ' + accountId 
                                                                + '\n,amount: ' + amount
                                                                + '\n,isDebit: ' + isDebit
                                                                + '\n,locationId: ' + locationId
                                                                + '\n,departmentId: ' + departmentId
                                                                + '\n,program: ' + program
                                                                + '\n,entityId: ' + entityId);


            var customLine = customLines.addNewLine();
            if (!isEmpty(accountId)) customLine.setAccountId(accountId);
            if (isDebit == true) {
                customLine.setDebitAmount(amount.toString());
            } else {
                customLine.setCreditAmount(amount.toString());
            }
            // if (!isEmpty(locationId)) customLine.setLocationId(locationId);
            if (!isEmpty(departmentId)) customLine.setDepartmentId(departmentId);
            // if (!isEmpty(entityId)) customLine.setEntityId(entityId);
            if (!isEmpty(locationId)) customLine.setSegmentValueId('cseg_npo_region', locationId);
            if (!isEmpty(program)) customLine.setSegmentValueId('cseg_npo_program', program);
            customLine.setMemo('Tax Rebates Custom GL');
        }
    }

    var remainingUsage = contextObj.getRemainingUsage();
    nlapiLogExecution('AUDIT', 'customizeGlImpact', 'remainingUsage AFTER - ' + remainingUsage);
}

function isEmpty(value) {
    return ((value === 'none' || value === '' || value == null || value == undefined) || (value.constructor === Array && value.length == 0) ||
        (value.constructor === Object && (function (v) { for (var k in v) return false; return true; })(value)));
}

function fixedDecimalPlaces(amount) {
    return (Math.round(amount * 100) / 100).toFixed(2);
}

function getAccountId(arrStandardLines, taxAmount) {
    taxAmount = fixedDecimalPlaces(taxAmount);
    //gets all the information from the standard lines
    for (var x = 1; x < arrStandardLines.length; x++) {
        var currentStandardLine = arrStandardLines[x];

        var stdDebitAmount = fixedDecimalPlaces(currentStandardLine.stdDebitAmount);
        var stdAccountId = currentStandardLine.stdAccountId;

        if (!isEmpty(stdAccountId)) {
            if (stdDebitAmount == taxAmount) {
                nlapiLogExecution('AUDIT', 'getAccountId', 'stdAccountId ' + stdAccountId + ' stdDebitAmount ' + stdDebitAmount + ' taxAmount ' + taxAmount + ' result: ' + (stdDebitAmount == taxAmount));
                return stdAccountId;
            }
        }
    }
}