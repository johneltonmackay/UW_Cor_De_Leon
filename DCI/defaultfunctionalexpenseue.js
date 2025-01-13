/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search'],
    
    (record, search) => {
        const afterSubmit = (scriptContext) => {
            log.debug("CONTEXT: ", scriptContext.type);
            try {
                if (scriptContext.type === scriptContext.UserEventType.CREATE || scriptContext.type === scriptContext.UserEventType.EDIT) {
                    let newRecord = scriptContext.newRecord;
                    let recType = newRecord.type
                    let strId = newRecord.id
                    let objRecord = record.load({
                            type: recType,
                            id: strId,
                            isDynamic: true,
                        });
                    log.debug("objRecord", objRecord)
                    if (objRecord){
                        if (recType == "journalentry"){
                            sublistName = "line"
                        } else {
                            sublistName = "expense"
                        }
                        var numLines = objRecord.getLineCount({
                            sublistId: sublistName
                        });
                        for (var i = 0;  i < numLines; i++) {
                            objRecord.selectLine({
                                sublistId: sublistName,
                                line: i
                            });
                            setData(objRecord, i, search, sublistName);
                            objRecord.commitLine({
                                sublistId: sublistName
                            });
                        }
                        var recordId = objRecord.save({
                            enableSourcing: true,
                            ignoreMandatoryFields: true
                        });
                        log.debug("recordId" + recType, recordId)
                    }
                }
                
            } catch (err) {
                log.error('afterSubmit', err.message);
            }
        }

        // Private Function

        function setData(objRecord, i, search , sublistName){
            try {
                let blnChecker;
                let arrSegmentCode;
                let recType = objRecord.type
                log.debug("sublistName", sublistName)
                let fieldLookUp
                let strAccountType
                log.debug("recType", recType)
                if (recType == 'expensereport'){
                    account = "expenseaccount"
                } else {
                    account = "account"
                }
                let intAccount = objRecord.getSublistValue({
                    sublistId: sublistName,
                    fieldId: account,
                    line: i
                })
                log.debug("intAccount", intAccount)
                if (intAccount){
                    log.debug("test")
                    try {
                        fieldLookUp = search.lookupFields({
                            type: search.Type.ACCOUNT,
                            id: intAccount,
                            columns: 'type'
                        });
                        log.debug("fieldLookUp",fieldLookUp)
                        if (fieldLookUp){
                        strAccountType = fieldLookUp.type[0].value;
                        }
                    } catch (e) {
                        log.debug(e.message)
                    }
                }
                log.debug("strAccountType", strAccountType)
                if (strAccountType == 'Expense' || strAccountType == 'OthExpense'){
                    let intDepartment = objRecord.getSublistValue({
                        sublistId: sublistName,
                        fieldId: 'department',
                        line: i
                    })
                    let intProgram = objRecord.getSublistValue({
                        sublistId: sublistName,
                        fieldId: 'custcol_cseg_npo_program',
                        line: i
                    })
                    let intSuiteKey = objRecord.getSublistValue({
                        sublistId: sublistName,
                        fieldId: 'custcol_npo_suitekey',
                        line: i
                    })
                    log.debug("intDepartment", intDepartment)
                    log.debug("intProgram", intProgram)
                    log.debug("intSuiteKey", intSuiteKey)
                
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
                    if (arrSegmentCode) {
                        if (arrSegmentCode.length > 0) {
                            log.debug("i", i)
     
                            objRecord.setCurrentSublistValue({
                                sublistId: sublistName,
                                fieldId: 'custcol_npo_suitekey',
                                value: arrSegmentCode[0].name,
                                ignoreFieldChange: true,
                                fireSlavingSync: true
                            });
                            objRecord.setCurrentSublistValue({
                                sublistId: sublistName,
                                fieldId: 'department',
                                value: arrSegmentCode[0].department,
                                ignoreFieldChange: true,
                                fireSlavingSync: true
                            });
                            objRecord.setCurrentSublistValue({
                                sublistId: sublistName,
                                fieldId: 'custcol_cseg_npo_program',
                                value: arrSegmentCode[0].program,
                                ignoreFieldChange: true,
                                fireSlavingSync: true
                            });
                            objRecord.setCurrentSublistValue({
                                sublistId: sublistName,
                                fieldId: 'custcol_cseg_npo_exp_type',
                                value: arrSegmentCode[0].functionalExpenses,
                                ignoreFieldChange: true,
                                fireSlavingSync: true
                            });
                        }
                    }  
                }
            } catch (err) {
                log.error('setData', err.message);
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
                  log.error('searchSegmentData', err.message);
              }
              log.debug("searchSegmentData", arrSegmentCode)
              return arrSegmentCode;
          }

        return {afterSubmit}

    });