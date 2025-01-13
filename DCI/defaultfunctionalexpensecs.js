/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/currentRecord'],
    /**
     * @param{record} record
     * @param{search} search
     * @param{currentRecord} currentRecord
     */
    function (record, search, currentRecord) {

        function pageInit(scriptContext) {
            console.log("pageInit", "TEST1")
        }

        function fieldChanged(scriptContext) {

        }

        function validateLine(scriptContext) {
            let strFieldChanging = scriptContext.sublistId;   
            console.log(strFieldChanging)
            if (strFieldChanging === 'line' || strFieldChanging === 'expense') {
                setData(scriptContext, search);
                return true
            }
            // if (strFieldChanging === 'line') {
            //     setData(scriptContext);
            // }
            // if (strFieldChanging === 'line') {
            //     setData(scriptContext);
            // }
        }


        // PRIVATE FUNCTION

        function setData(scriptContext, search){
            try {
                let blnChecker;
                let arrSegmentCode;
                let account;
                let objCurrentRecord = scriptContext.currentRecord;
                let sublistName = scriptContext.sublistId;
                let recType = objCurrentRecord.type
                let fieldLookUp
                let strAccountType
                console.log("recType", recType)
                if (recType == 'expensereport'){
                    account = "expenseaccount"
                } else {
                    account = "account"
                }
                let intAccount = objCurrentRecord.getCurrentSublistValue({
                    sublistId: sublistName,
                    fieldId: account
                })
                console.log("intAccount", intAccount)
                if (intAccount){
                    console.log("test")
                    try {
                        fieldLookUp = search.lookupFields({
                            type: search.Type.ACCOUNT,
                            id: intAccount,
                            columns: 'type'
                        });
                        console.log("fieldLookUp",fieldLookUp)
                        if (fieldLookUp){
                        strAccountType = fieldLookUp.type[0].value;
                        }
                    } catch (e) {
                        console.log(e.message)
                    }
                }
                console.log("strAccountType", strAccountType)
                if (strAccountType == 'Expense' || strAccountType == 'OthExpense'){
                    let intDepartment = objCurrentRecord.getCurrentSublistValue({
                        sublistId: sublistName,
                        fieldId: 'department'
                    })
                    let intProgram = objCurrentRecord.getCurrentSublistValue({
                        sublistId: sublistName,
                        fieldId: 'custcol_cseg_npo_program'
                    })
                    let intSuiteKey = objCurrentRecord.getCurrentSublistValue({
                        sublistId: sublistName,
                        fieldId: 'custcol_npo_suitekey'
                    })
                    console.log("intDepartment", intDepartment)
                    console.log("intProgram", intProgram)
                    console.log("intSuiteKey", intSuiteKey)
                
                    if (intDepartment){
                        blnChecker = 'department'
                        intFilterData = intDepartment
                    } else if (intProgram) {
                        blnChecker = 'program'
                        intFilterData = intProgram
                    } else if (intSuiteKey){
                        blnChecker = 'suitekey'
                        intFilterData = intSuiteKey
                    } else {
                        blnChecker = null
                    }
                    if (blnChecker){
                        arrSegmentCode = searchSegmentData(intFilterData, blnChecker)
                    }
                    if (arrSegmentCode.length > 0){
                        objCurrentRecord.setCurrentSublistValue({
                            sublistId: sublistName,
                            fieldId: 'custcol_npo_suitekey',
                            value: arrSegmentCode[0].name,
                            ignoreFieldChange: true,
                            fireSlavingSync: true
                        });
                        objCurrentRecord.setCurrentSublistValue({
                            sublistId: sublistName,
                            fieldId: 'department',
                            value: arrSegmentCode[0].department,
                            ignoreFieldChange: true,
                            fireSlavingSync: true
                        });
                        objCurrentRecord.setCurrentSublistValue({
                            sublistId: sublistName,
                            fieldId: 'custcol_cseg_npo_program',
                            value: arrSegmentCode[0].program,
                            ignoreFieldChange: true,
                            fireSlavingSync: true
                        });
                        objCurrentRecord.setCurrentSublistValue({
                            sublistId: sublistName,
                            fieldId: 'custcol_cseg_npo_exp_type',
                            value: arrSegmentCode[0].functionalExpenses,
                            ignoreFieldChange: true,
                            fireSlavingSync: true
                        });
                    }
                }
            } catch (err) {
                log.error('searchRecord', err.message);
            }
        }

        function searchSegmentData(intFilterData, blnChecker){
          let arrSegmentCode = [];
            try {
                let objSegmentSearch = search.create({
                    type: 'customrecord_npo_segment_code',
                    filters: (blnChecker === 'department') ? [
                        ['custrecord_sgdepartment.internalid', 'anyof', intFilterData]
                    ] : (blnChecker === 'program') ? [
                        ['custrecord_41_cseg_npo_program.internalid', 'anyof', intFilterData]
                    ] : [
                        ['internalidnumber', 'equalto', intFilterData]
                    ],
                    columns: [
                        search.createColumn({ name: 'internalid' }),
                        search.createColumn({ name: 'custrecord_41_cseg_npo_program' }),
                        search.createColumn({ name: 'custrecord_sgdepartment' }),
                        search.createColumn({ name: 'custrecord_41_cseg_npo_exp_type' }),
                        search.createColumn({ name: 'custrecord_41_cseg_npo_grant' })
                    ]
                });
                
                var searchResultCount = objSegmentSearch.runPaged().count;
                if (searchResultCount != 0) {
                    var pagedData = objSegmentSearch.runPaged({pageSize: 1000});
                    for (var i = 0; i < pagedData.pageRanges.length; i++) {
                        var currentPage = pagedData.fetch(i);
                        var pageData = currentPage.data;
                        if (pageData.length > 0) {
                            for (var pageResultIndex = 0; pageResultIndex < pageData.length; pageResultIndex++) {
                                arrSegmentCode.push({
                                    name: pageData[pageResultIndex].getValue({name: 'internalid'}),
                                    department: pageData[pageResultIndex].getValue({name: 'custrecord_sgdepartment'}),
                                    program: pageData[pageResultIndex].getValue({name: 'custrecord_41_cseg_npo_program'}),
                                    functionalExpenses: pageData[pageResultIndex].getValue({name: 'custrecord_41_cseg_npo_exp_type'}),
                                });
                            }
                        }
                    }
                }
            } catch (err) {
                log.error('searchRecord', err.message);
            }
            console.log("searchSegmentData", arrSegmentCode)
            log.debug("searchSegmentData", arrSegmentCode)
            return arrSegmentCode;
        }
        return {
            pageInit: pageInit,
            validateLine: validateLine,
            fieldChanged: fieldChanged
        };

    });    