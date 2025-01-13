/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * 
 * ACS @ 12/16/2022 - Rewritten from NSTS | UE | Autocreate ICJE due to messy script
 */
define(['N/error', 'N/record', 'N/runtime', 'N/search', 'N/task', 'N/ui/message'],
    /**
 * @param{error} error
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 * @param{task} task
 */
    (error, record, runtime, search, task, message) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {
            var logTitle = 'beforeLoad: ';
            var currentRecord = scriptContext.newRecord;

            if (currentRecord.type == 'vendorbill') {
                //set Intercompany JE field to null on create and on copy
                if (runtime.executionContext === runtime.ContextType.USER_INTERFACE && (scriptContext.type === scriptContext.UserEventType.CREATE || scriptContext.type === scriptContext.UserEventType.COPY)) {
                    currentRecord.setValue({
                        fieldId: 'custbody_ns_related_icje',
                        value: null
                    });
                    log.audit(logTitle, "Values set.");
                }
            } else {
                if (scriptContext.type === scriptContext.UserEventType.VIEW) {
                    var form = scriptContext.form;
                    var taskId = currentRecord.getValue({fieldId:'custbody_acs_vbicje_taskid'});
                    if (!isEmpty(taskId)) {
                        var myTaskStatus = task.checkStatus({
                            taskId: taskId
                        });
                        var pending = myTaskStatus.getPendingMapCount();
                        var total = myTaskStatus.getTotalMapCount();
                        var stage = myTaskStatus.stage;
                        var status = myTaskStatus.status
                        log.debug('stage',stage);
                        log.debug('pending',pending);
                        log.debug('total',total);
                        log.debug('status',status);
                        var processed = total-pending;
    
                        if (status == 'PENDING' || stage == 'GET_INPUT') {
                            form.addPageInitMessage({
                                type: message.Type.INFORMATION,
                                title: 'Generating Intercompany Lines',
                                message: 'Asynchronous back-end process running.<br />Status: ' + status + '<br />Click <a href="javascript:window.location.href=window.location.href">refresh</a> to check status.'
                            });
                        } else if(stage == 'MAP' && pending > 0) {
                            form.addPageInitMessage({
                                type: message.Type.INFORMATION,
                                title: 'Generating Intercompany Lines',
                                message: 'Asynchronous back-end process running.<br />Status: ' + processed + ' of ' + total + ' item(s) completed.<br />Click <a href="javascript:window.location.href=window.location.href">refresh</a> to check status.'
                            });
                        } else if(status == 'PROCESSING') {
                            form.addPageInitMessage({
                                type: message.Type.INFORMATION,
                                title: 'Generating Intercompany Lines',
                                message: 'Asynchronous back-end process running.<br />Status: Processing' + '<br />Click <a href="javascript:window.location.href=window.location.href">refresh</a> to check status.'
                            });
                        } else if(stage == 'SUMMARIZE') {
                            form.addPageInitMessage({
                                type: message.Type.INFORMATION,
                                title: 'Generating Intercompany Lines',
                                message: 'Asynchronous back-end process running.<br />Status: Finishing-up' + '<br />Click <a href="javascript:window.location.href=window.location.href">refresh</a> to check status.'
                            });
                        } else {
                            form.addPageInitMessage({
                                type: message.Type.CONFIRMATION,
                                title: 'Generating Intercompany Lines',
                                message: 'Asynchronous back-end process successfully completed.'
                            });
                        }
                    }
                }
            }
        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
            var logTitle = 'beforeSubmit: ';
            var currentRecord = scriptContext.newRecord;
            if (currentRecord.type == 'vendorbill') {
                // if vendor bill is deleted, delete associated ICJE
                if (scriptContext.type === scriptContext.UserEventType.DELETE) {
                    var icjeId = currentRecord.getValue({
                        fieldId: 'custbody_ns_related_icje',
                    });
                    log.audit(logTitle + 'Associated ICJE ID', icjeId);
                    if (!isEmpty(icjeId)) {
                        record.delete({
                            type: record.Type.ADV_INTER_COMPANY_JOURNAL_ENTRY,
                            id: icjeId
                        });
                        log.audit(logTitle + 'DELETE', "Associated ICJE Record has been deleted.");
                    }
                }
            } else {
                log.debug(logTitle + 'runtime.executionContext', runtime.executionContext);
                if (runtime.executionContext !== runtime.ContextType.MAP_REDUCE) {
                    var currentRecord = scriptContext.newRecord;
                    var taskId = currentRecord.getValue({fieldId:'custbody_acs_vbicje_taskid'});
                    if (!isEmpty(taskId)) {
                        var myTaskStatus = task.checkStatus({
                            taskId: taskId
                        });
                        var pending = myTaskStatus.getPendingMapCount();
                        var total = myTaskStatus.getTotalMapCount();
                        var stage = myTaskStatus.stage;
                        var status = myTaskStatus.status
                        log.debug('stage',stage);
                        log.debug('pending',pending);
                        log.debug('total',total);
                        log.debug('status',status);
                        var processed = total-pending;
                        var message = '';
        
                        if (status == 'PENDING' || stage == 'GET_INPUT') {
                            message = ' Asynchronous back-end process running.<br />Status: ' + status + '<br />Click <a href="javascript:window.location.href=window.location.href">refresh</a> to check status.';
                            throw message;
                        } else if(stage == 'MAP' && pending > 0) {
                            message = ' Asynchronous back-end process running.<br />Status: ' + processed + ' of ' + total + ' item(s) completed.<br />Click <a href="javascript:window.location.href=window.location.href">refresh</a> to check status.';
                            throw message;
                        } else if(status == 'PROCESSING') {
                            message = ' Asynchronous back-end process running.<br />Status: Processing' + '<br />Click <a href="javascript:window.location.href=window.location.href">refresh</a> to check status.';
                            throw message;
                        } else if(stage == 'SUMMARIZE') {
                            message = ' Asynchronous back-end process running.<br />Status: Finishing-up' + '<br />Click <a href="javascript:window.location.href=window.location.href">refresh</a> to check status.';
                            throw message;
                        }
                    }
                }
            }
        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {
            var logTitle = 'afterSubmit: ';
            var newRecord = scriptContext.newRecord;
            if (newRecord.type == 'vendorbill') {
                if (scriptContext.type === scriptContext.UserEventType.CREATE || scriptContext.type === scriptContext.UserEventType.EDIT) {
                    var currentRecord = record.load({
                        type: 'vendorbill',
                        id: newRecord.id
                    });
    
                    var approvalStatus = currentRecord.getValue('approvalstatus');
                    var subsidiaryId = currentRecord.getValue('subsidiary');
                    var tranDate = currentRecord.getValue('trandate');
                    var postingPeriod = currentRecord.getValue('postingperiod');
                    var memo = currentRecord.getValue('memo');
                    var departmentId = currentRecord.getValue('department');
                    var locationId = currentRecord.getValue('custbody_cseg_npo_region');
                    var lineCount = currentRecord.getLineCount('expense');
    
                    var headerParams = {
                        subsidiaryId: subsidiaryId,
                        tranDate: tranDate,
                        postingPeriod: postingPeriod,
                        memo: memo
                    };
    
                    // vendor bill must be approved 
                    log.audit(logTitle + 'approval status [If VAL is 2 == APPROVED]', approvalStatus);
                    if (approvalStatus !== '2') {
                        log.audit(logTitle + 'status check', 'Record must be approved');
                        return;
                    }
    
                    if (lineCount > 0) {
                        // get distribution entities and tax jurisdictions
                        var interCompanyLines = [];
                        var taxJurisdictionIds = [];
    
                        for (var x = 0; x < lineCount; x++) {
                            var distEntity = currentRecord.getSublistValue({
                                sublistId: 'expense',
                                fieldId: 'custcol_ns_dist_subsidiary',
                                line: x
                            });
                            var taxJurisdiction = currentRecord.getSublistValue({
                                sublistId: 'expense',
                                fieldId: 'custcol_tc_jurisdiction',
                                line: x
                            });
                            var expenseAccount = currentRecord.getSublistValue({
                                sublistId: 'expense',
                                fieldId: 'account',
                                line: x
                            });
                            var expenseAmount = currentRecord.getSublistValue({
                                sublistId: 'expense',
                                fieldId: 'amount',
                                line: x
                            });
                            var taxRate1 = currentRecord.getSublistValue({
                                sublistId: 'expense',
                                fieldId: 'taxrate1',
                                line: x
                            });
                            var taxRate2 = currentRecord.getSublistValue({
                                sublistId: 'expense',
                                fieldId: 'taxrate2',
                                line: x
                            });
                            var taxCode = currentRecord.getSublistValue({
                                sublistId: 'expense',
                                fieldId: 'taxcode',
                                line: x
                            });
                            var lineDepartmentId = currentRecord.getSublistValue({
                                sublistId: 'expense',
                                fieldId: 'department',
                                line: x
                            });
                            var lineMemo = currentRecord.getSublistValue({
                                sublistId: 'expense',
                                fieldId: 'memo',
                                line: x
                            });
                            if (!isEmpty(distEntity) && distEntity != subsidiaryId) {
                                interCompanyLines.push({
                                    distEntity: distEntity,
                                    taxJurisdiction: taxJurisdiction,
                                    expenseAccount: expenseAccount,
                                    expenseAmount: expenseAmount,
                                    taxRate1: taxRate1,
                                    taxRate2: taxRate2,
                                    taxCode: taxCode,
                                    department: lineDepartmentId,
                                    memo: lineMemo,
                                    headerDept: departmentId,
                                    headerLoc: locationId,
                                    headerSub: subsidiaryId,
                                    lineIndex: x
                                });
                            }
                            if (!isEmpty(taxJurisdiction)) {
                                taxJurisdictionIds.push(taxJurisdiction);
                            }
                        }
    
                        // if intercompany lines is empty, dont create icje
                        if (interCompanyLines.length == 0) {
                            log.audit(logTitle + 'intercompany lines check', 'No intercompany line available.');
                            return;
                        }
                        
                        // delete old icje and generate new one.
                        var relatedIcjeId = currentRecord.getValue('custbody_ns_related_icje');
                        if (!isEmpty(relatedIcjeId)) {
                            log.audit(logTitle, 'DELETING OLD AICJE...');
                            record.delete({
                                type: record.Type.ADV_INTER_COMPANY_JOURNAL_ENTRY,
                                id: relatedIcjeId
                            });
                        }
    
                        var scriptObj = runtime.getCurrentScript();
                        var defaultIcjeForm = scriptObj.getParameter({name: 'custscript_vbicje_defaultform'});
                        var dueToDefaultAccount = scriptObj.getParameter({name: 'custscript_vbicje_duetoaccount'});
                        var dueFromDefaultAccount = scriptObj.getParameter({name: 'custscript_vbicje_duefromaccount'});
    
                        var advICJEId = createICJE(currentRecord, defaultIcjeForm, dueToDefaultAccount, dueFromDefaultAccount, headerParams, interCompanyLines, taxJurisdictionIds);
                        if (!isEmpty(advICJEId)) {
                            if (interCompanyLines.length > 1) {
                                interCompanyLines = interCompanyLines.slice(1);
                                var MapReduceTask = task.create({
                                    taskType: task.TaskType.MAP_REDUCE,
                                    scriptId: 'customscript_acs_mr_vb_icje',
                                    params: {
                                        custscript_vbicje_vbid: currentRecord.id,
                                        custscript_vbicje_icjeid: advICJEId,
                                        custscript_vbicje_mr_duetoaccount: dueToDefaultAccount,
                                        custscript_vbicje_mr_duefromaccount: dueFromDefaultAccount,
                                        custscript_vbicje_mr_iclines: JSON.stringify(interCompanyLines),
                                        custscript_vbicje_mr_taxjuris: JSON.stringify(taxJurisdictionIds),
                                    }
                                });
                                var taskId = MapReduceTask.submit();
                                record.submitFields({
                                    type: record.Type.ADV_INTER_COMPANY_JOURNAL_ENTRY,
                                    id: advICJEId,
                                    values: { 
                                        custbody_acs_vbicje_taskid : taskId
                                    }
                                });
                                log.audit("TASK ID: ", taskId)
                            }
    
                            currentRecord.setValue({
                                fieldId: "custbody_ns_related_icje",
                                value: advICJEId
                            });
                            currentRecord.save({
                                ignoreMandatoryFields: true
                            });
                        }
                    }
                }
            }
        }

        function createICJE(sourceTransaction, defaultForm, dueToDefaultAccount, dueFromDefaultAccount, headerParams, interCompanyLines, taxJurisdictionIds) {
            log.audit('ICJE CREATION', 'CREATING NEW ICJE...');

            var sourceSubsidiary = headerParams.subsidiaryId;
            var sourceTranDate = headerParams.tranDate;
            var sourcePostingPeriod = headerParams.postingPeriod;
            var sourceMemo = headerParams.memo;

            var icjeObj = record.create({
                type: record.Type.ADV_INTER_COMPANY_JOURNAL_ENTRY,
                isDynamic: true
            });

            // -------- SET HEADER FIELDS -------- 
            icjeObj.setValue({
                fieldId: 'customform',
                value: defaultForm
            });

            // set source transaction values
            icjeObj.setValue({
                fieldId: 'subsidiary',
                value: sourceSubsidiary
            });
            icjeObj.setValue({
                fieldId: 'trandate',
                value: sourceTranDate
            });
            icjeObj.setValue({
                fieldId: 'postingperiod',
                value: sourcePostingPeriod
            });
            icjeObj.setValue({
                fieldId: 'memo',
                value: sourceMemo
            });

            // auto approve generated ICJE
            icjeObj.setValue({
                fieldId: 'approvalstatus',
                value: 2
            });

            log.audit('ICJE CREATION', 'Header values have been set. Creating ICJE lines...');
            // create 4 lines for each line on the source transacion. 
            // Create JE with the first Line of Bill then pass the work to Map Reduce
            var srcLineParams = interCompanyLines[0];
            var lineSub = interCompanyLines[0].distEntity;
            var mainSub = null;
            var otherSub = null;

            // used to identify which sub will be set on icje line.
            for (indexIdentifier = 1; indexIdentifier < 5; indexIdentifier++) {
                if (indexIdentifier === 1 || indexIdentifier === 4) {
                    mainSub = sourceSubsidiary;
                    otherSub = lineSub;
                    log.audit('mainSub/otherSub', mainSub + ' / ' + otherSub);
                } else {
                    mainSub = lineSub;
                    otherSub = sourceSubsidiary;
                    log.audit('mainSub/otherSub', mainSub + ' / ' + otherSub);
                }
                createICJELines(icjeObj, indexIdentifier, mainSub, otherSub, dueToDefaultAccount, dueFromDefaultAccount, sourceTransaction, srcLineParams, taxJurisdictionIds);
            }
            
            var icjeLineCount = icjeObj.getLineCount('line');
            log.audit('ICJE CREATION', 'Lines generated: ' + icjeLineCount);
            var advICJEId = null;
            if (icjeLineCount > 0) {
                icjeObj.setValue({
                    fieldId: 'custbody_nsts_vb',
                    value: sourceTransaction.id
                });
                advICJEId = icjeObj.save({
                    ignoreMandatoryFields: true
                });
                log.audit('ICJE CREATION', 'RECORD ID: ' + advICJEId);
            } else {
                log.audit('ICJE CREATION', 'Advanced ICJE was not created. Please double check your source transaction');
            }
            return advICJEId;
        }
        
        function createICJELines(icjeObj, indexIdentifier, mainSub, targetSub, dueToDefaultAccount, dueFromDefaultAccount, sourceTransaction, srcLineParams, taxJurisdictionIds) {
            
            var tranAcct = null;
            var debitcredit = null;
            var eliminate = null;
            var dueTFSub = null;
            var vendorId = null;

            var sourceSub = srcLineParams.headerSub;
            var sourceDept = srcLineParams.headerDept;
            var sourceLoc = srcLineParams.headerLoc;
            var sourceLine = srcLineParams.lineIndex;
            var taxJurisdiction = srcLineParams.taxJurisdiction;
            var expenseAccount = srcLineParams.expenseAccount;
            var expenseAmount = srcLineParams.expenseAmount;
            var taxRate1 = srcLineParams.taxRate1;
            var taxRate2 = srcLineParams.taxRate2;
            var taxCode = srcLineParams.taxCode;
            var department = srcLineParams.department;
            var memo = srcLineParams.memo;

            log.audit('Source Line Params', {
                sourceSub: sourceSub,
                sourceDept: sourceDept,
                sourceLoc: sourceLoc,
                sourceLine: sourceLine,
                taxJurisdiction: taxJurisdiction,
                expenseAccount: expenseAccount,
                expenseAmount: expenseAmount,
                taxRate1: taxRate1,
                taxRate2: taxRate2,
                taxCode: taxCode,
                department: department,
                memo: memo,
            });
            
            icjeObj.selectNewLine({
                sublistId: "line"
            });

            log.audit('indexIdentifier', indexIdentifier);
            switch (indexIdentifier) {
                //header sub & VB acct
                case 1:
                    tranAcct = expenseAccount;
                    debitcredit = 'credit';
                    eliminate = false;
                    break;
                //Distr sub & VB acct
                case 2:
                    tranAcct = expenseAccount;
                    debitcredit = 'debit';
                    eliminate = false;
                    break;
                //Header sub and Due To Acct
                //Vendor
                case 3:
                    tranAcct = dueToDefaultAccount;
                    dueTFSub = targetSub;
                    var vendorSearch = search.create({
                        type: search.Type.VENDOR,
                        columns: ['internalid'],
                        filters: [['representingsubsidiary', 'is', targetSub], 'and', ['subsidiary', 'is', mainSub]]
                    });
                    var vendorResult = vendorSearch.run().getRange({
                        start: 0,
                        end: 10
                    });
                    if (!isEmpty(vendorResult[0])) {
                         vendorId = vendorResult[0].getValue({
                            name: 'internalid'
                        });
                    }
                    debitcredit = 'credit';
                    eliminate = true;
                    break;
                //Distr sub and Due From Acct
                //Customer
                case 4:
                    tranAcct = dueFromDefaultAccount;
                    debitcredit = 'debit';
                    dueTFSub = targetSub;
                    var vendorSearch = search.create({
                        type: search.Type.CUSTOMER,
                        columns: ['internalid'],
                        filters: [['representingsubsidiary', 'is', targetSub], 'and', ['subsidiary', 'is', mainSub]]
                    });
                    var vendorResult = vendorSearch.run().getRange({
                        start: 0,
                        end: 10
                    });
                    if (!isEmpty(vendorResult[0])) {
                        vendorId = vendorResult[0].getValue({
                            name: 'internalid'
                        });
                    }
                    eliminate = true;
                    break;
            }
            log.audit('vendorId: ', vendorId);

            icjeObj.setCurrentSublistValue({
                sublistId: "line",
                fieldId: "linesubsidiary",
                value: mainSub
            });
            var nsLineSub =  icjeObj.getCurrentSublistValue({
                sublistId: "line",
                fieldId: "linesubsidiary"
            });
            log.debug('line subsidiary set', nsLineSub);
        
            icjeObj.setCurrentSublistValue({
                sublistId: "line",
                fieldId: "account",
                value: tranAcct
            });
        
            var rebateAmt = getRebateAmount(taxJurisdiction, taxJurisdictionIds, expenseAccount, taxCode, expenseAmount, taxRate1, taxRate2);
            var lineamount = parseFloat(expenseAmount) + parseFloat(rebateAmt);
            log.debug('expenseAmount', expenseAmount);
            //set amt
            icjeObj.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: debitcredit,
                value: lineamount
            });
        
            if (!isEmpty(dueTFSub)) {
                icjeObj.setCurrentSublistValue({
                    sublistId: 'line',
                    fieldId: 'duetofromsubsidiary',
                    value: dueTFSub
                });
            }
        
            icjeObj.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'eliminate',
                value: eliminate
            });
        
            if (!isEmpty(vendorId)) {
                icjeObj.setCurrentSublistValue({
                    sublistId: "line",
                    fieldId: "entity",
                    value: vendorId
                });
            }
        
            icjeObj.setCurrentSublistValue({
                sublistId: "line",
                fieldId: "department",
                value: department
            });
            icjeObj.setCurrentSublistValue({
                sublistId: "line",
                fieldId: "memo",
                value: memo
            });
        
            //get custom segments dynamically (comes from CN tax bundle)
            var arrCustomSegmentIds = getCustomSegments();
            var objCustSegmentData = {};
            var stSublistId = 'expense';
        
            for (var idx = 0; idx < arrCustomSegmentIds.length; idx++) {
                var stFldId = arrCustomSegmentIds[idx];
                objCustSegmentData[stFldId] = sourceTransaction.getSublistValue(stSublistId, stFldId, sourceLine);
                if (isEmpty(objCustSegmentData[stFldId])) {
                    stFldId = 'custcol_' + stFldId;
                    objCustSegmentData[stFldId] = sourceTransaction.getSublistValue(stSublistId, stFldId, sourceLine);
                }
                if (!isEmpty(objCustSegmentData[stFldId])) {
                    //removed parse int for value
                    icjeObj.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: stFldId,
                        value: objCustSegmentData[stFldId]
                    });
                }
            }

            icjeObj.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'custcol_cseg_npo_rev_type',
                value: 240
            });

            if (nsLineSub == sourceSub) {
                if(tranAcct == 687){
                    icjeObj.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'custcol_cseg_npo_region',
                        value: sourceLoc
                    });
                    icjeObj.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'department',
                        value: sourceDept
                    });
                    icjeObj.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'cseg_npo_program',
                        value: '366'  
                    });
                }
            }

            icjeObj.commitLine({
                sublistId: "line"
            });
        }

        
        function getCustomSegments() {
            var stLogTitle = 'getCustomSegments';
            var arrCustomSegmentIds = [];
            var stSearchID = 'customsearch_custom_segment_gl'; //what search
            // log.debug(stLogTitle, 'stSearchID = ' + stSearchID);
            var arrResults = NSUtilSearch(null, stSearchID);
            // log.debug('arrResults', JSON.stringify(arrResults));
            if (!isEmpty(arrResults)) {
                for (var i = 0; i < arrResults.length; i++) {
                    var stCustomSegmentId = arrResults[i].getValue('scriptid');
                    log.debug('stCustomSegmentId', stCustomSegmentId);
                    arrCustomSegmentIds.push(stCustomSegmentId);
                }
            } else {
                log.debug(stLogTitle, 'No Custom Segments found.');
            }
            return arrCustomSegmentIds;
        }

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
        * @author dsika - updated to suitescript 2.0
        */
        function NSUtilSearch(stRecordType, stSearchId, arrSearchFilter, arrSearchColumn) {
            var arrReturnSearchResults = new Array();
            var nlobjSavedSearch;
        
            if (stSearchId != null) {
                nlobjSavedSearch = search.load(stSearchId, (stRecordType) ? stRecordType : null);
            } else {
                nlobjSavedSearch = search.create((stRecordType) ? stRecordType : null, arrSearchFilter, arrSearchColumn);
            }
        
            var nlobjResultset = nlobjSavedSearch.run();
            var intSearchIndex = 0;
            var nlobjResultSlice = null;
            do {
                nlobjResultSlice = nlobjResultset.getRange(intSearchIndex, intSearchIndex + 1000);
                if (!(nlobjResultSlice)) {
                    break;
                }
        
                arrReturnSearchResults = arrReturnSearchResults.concat(nlobjResultSlice);
                intSearchIndex = arrReturnSearchResults.length;
            }
            while (nlobjResultSlice.length >= 1000);
            return arrReturnSearchResults;
        }

        function getRebateAmount(currentTaxJurisdiction, taxJurisdictionIds, expenseAccount, taxCode, amount, taxRate1, taxRate2) {
            amount = parseFloat(amount);
            taxRate1 = parseFloat(taxRate1) / 100;
            taxRate2 = parseFloat(taxRate2) / 100;
            var totalRebateAmount = 0;
            var arrayOutput = [];
            var arrSearchColumns = [];
            var arrSearchFilters = [];
            var stRecordType = 'customrecord_nfp_cdn_tax_rebate';
            var stSearchID = 'customsearch_nfp_rebate_rec_detail_se'; // what search

            taxJurisdictionIds.sort();
            log.debug('taxJurisdictionIds after sort', 'taxJurisdictionIds - ' + taxJurisdictionIds);

            // is this???
            // log.debug('searchRebateAccount', 'arrUniqueJurisIds - ' + taxJurisdiction);
            // search filters
            var rebateSearch = search.load({
                id: stSearchID, 
                type: stRecordType
            });

            var filters = rebateSearch.filters; 
            filters.push(search.createFilter({ 
                    name: 'custrecord_nfp_cdn_tax_jurisdiction',
                    operator: 'anyof',
                    values: taxJurisdictionIds
                }));

            var objRebateRecResultSet = rebateSearch.run().each(myIterator);

            function myIterator(resultObj){

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
                // log.debug('mapRebateRec',"idRebateAcc"+ idRebateAcc+
                //     "idGSTRebateAcc"+ idGSTRebateAcc+
                //     "idHSTRebateAcc"+ idHSTRebateAcc+
                //     "idGSTRebateFactor"+ idGSTRebateFactor+
                //     "idHSTRebateFactor"+ idHSTRebateFactor+
                //     "idJurisdiction"+ idJurisdiction+
                //     "idGSTHSTRate"+ idGSTHSTRate+
                //     "idGSTOffsetAcc"+ idGSTOffsetAcc+
                //     "idHSTOffsetAcc"+ idHSTOffsetAcc+
                //     "idPSTOffsetAcc"+ idPSTOffsetAcc+
                //     "idPSTRate"+ idPSTRate+
                //     "idPSTRebateFactor"+ idPSTRebateFactor+
                //     "idPSTRebateAcc"+ idPSTRebateAcc);

                // log.debug('mapRebateRec - ' + i, mapRebateRec);
                arrayOutput.push(mapRebateRec);
                return true;
                
            }

            log.debug('arrayOutput', arrayOutput);

            if (taxCode != '') {
                var idRebateRecDetails = arrayOutput[0].idJurisdiction;
                log.debug('customizeGlImpact', 'idRebateRecDetails - ' + idRebateRecDetails);
                var gstRebateFactor = parseFloat(arrayOutput[0].idGSTRebateFactor);
                var hstRebateFactor = parseFloat(arrayOutput[0].idHSTRebateFactor);
                var gstRebateAcc = arrayOutput[0].idGSTRebateAcc;
                var hstRebateAcc = arrayOutput[0].idHSTRebateAcc;

                //regina - 3/18 - add gst/hst offset
                var idGSTOffsetAcc = arrayOutput[0].idGSTOffsetAcc;
                var idHSTOffsetAcc = arrayOutput[0].idHSTOffsetAcc;

                //1.7 ahmed - if no offset use expense account.
                var idPSTOffsetAcc = arrayOutput[0].idPSTOffsetAcc;
                idPSTOffsetAcc = (idPSTOffsetAcc == 0) ? expenseAccount : idPSTOffsetAcc;

                //regina - 5/11 - if blank then use expense account
                idGSTOffsetAcc = (idGSTOffsetAcc == 0) ? expenseAccount : idGSTOffsetAcc;
                idHSTOffsetAcc = (idHSTOffsetAcc == 0) ? expenseAccount : idHSTOffsetAcc;

                //mbolf - 1/16/2019 - add PST Rebate Factor, Rebate Acc, Offset Acc, Rate
                var pstRebateFactor = parseFloat(arrayOutput[0].idPSTRebateFactor);
                var pstRebateAcc = arrayOutput[0].idPSTRebateAcc;
                //var idPSTOffsetAcc = arrRebateAccSrchResults[i].idPSTOffsetAcc;
                var pstRate = arrayOutput[0].idpSTRate;
                log.debug('customizeGlImpact', 'gstRebateAcc - ' + gstRebateAcc +
                    ', hstRebateAcc - ' + hstRebateAcc +
                    ', idGSTOffsetAcc - ' + idGSTOffsetAcc +
                    ', idHSTOffsetAcc - ' + idHSTOffsetAcc +
                    ', idPSTOffsetAcc - ' + idPSTOffsetAcc +
                    ', pstRebateAcc - ' + pstRebateAcc
                );


                if (idRebateRecDetails == currentTaxJurisdiction) {

                    var expRebate = 0;
                    var taxRebate = 0;

                    if (pstRebateFactor > 0) {
                        var idStdEntity = '';
                        var idStdEntityExp = '';
                        var pstRebate = 0;

                        //regina - 6/28
                        var expRebate = 0;
                        var taxRebate = 0;

                        if (amount > 0) {
                            //gstRebate = gstRebateFactor * fExpAmount * gstHstRate;
                            ////danielle - change flTaxRate to flTaxRate2
                            pstRebate = pstRebateFactor * amount * taxRate2;
                            pstRebate = roundDecimalAmount(pstRebate, 2);
                            log.debug('customizeGlImpact',
                                'pstRebateFactor =' + pstRebateFactor +
                                ', fExpAmount = ' + amount +
                                ', flTaxRebate2 = ' + taxRate2);
                        }

                        //regina - 6/28 - calculate correct rebate amounts
                        ////danielle - change flTaxRate to flTaxRate2
                        expRebate = (amount * taxRate2) - pstRebate;
                        expRebate = roundDecimalAmount(expRebate, 2);
                        totalRebateAmount += parseFloat(expRebate);

                        taxRebate = pstRebate + expRebate;
                        taxRebate = roundDecimalAmount(taxRebate, 2);

                        log.debug('customizeGlImpact',
                            'pstRebate =' + pstRebate +
                            ', expRebate = ' + expRebate +
                            ', taxRebate = ' + taxRebate);
                    } else if (pstRebateFactor == 0) {
                        pstRebate = 0;
                        expRebate = amount * taxRate2;
                        expRebate = roundDecimalAmount(expRebate, 2);
                        taxRebate = expRebate;
                        totalRebateAmount += parseFloat(expRebate);
                    }
                }

                //BC, Manitoba, Saskatchewan
                if(currentTaxJurisdiction == 102 || currentTaxJurisdiction == 103 || currentTaxJurisdiction == 112){
                    var pstValue = amount * taxRate2;
                    log.debug('pstValue', pstValue);
                    totalRebateAmount += parseFloat(pstValue);
                }

                //Added
                //Quebec PST Rebate
                if(currentTaxJurisdiction == 111){
                    for(var a = 0; a < arrayOutput.length; a++){
                        if(arrayOutput[a].idJurisdiction == 111){
                            var quebecRebate = 0;
                            var expRebate = 0;
                            var taxRebate = 0;

                            var quebecPstRebateFactor = parseFloat(arrayOutput[a].idPSTRebateFactor);
                            log.debug('quebecPstRebateFactor', quebecPstRebateFactor);

                            var quebecPstRebateAcc = arrayOutput[a].idPSTRebateAcc;
                            log.debug('quebecPstRebateAcc', quebecPstRebateAcc);

                            if(quebecPstRebateFactor > 0){

                                if(amount != ''){

                                    quebecRebate = quebecPstRebateFactor * amount * taxRate2;
                                    quebecRebate = roundDecimalAmount(quebecRebate, 2);

                                    expRebate = (amount * taxRate2) - quebecRebate;
                                    expRebate = roundDecimalAmount(expRebate, 2);
                                    totalRebateAmount += parseFloat(expRebate);

                                    taxRebate = quebecRebate + expRebate;
                                    taxRebate = roundDecimalAmount(taxRebate, 2);

                                    log.debug('customizeGlImpact', 'quebecRebate =' + quebecRebate + ', expRebate = ' + expRebate + ', taxRebate = ' + taxRebate);
                                }
                            }
                            log.debug('customizeGlImpact','end of quebecRebate');
                        }
                    }
                }
                //Added
                var expRebate = 0;
                var taxRebate = 0;
                
                if (gstRebateFactor > 0) {
                    var idStdEntity = '';
                    var idStdEntityExp = '';
                    var gstRebate = 0;

                    var expRebate = 0;
                    var taxRebate = 0;

                    if (amount > 0) {
                        //gstRebate = gstRebateFactor * fExpAmount * gstHstRate;
                        gstRebate = gstRebateFactor * amount * taxRate1;
                        gstRebate = roundDecimalAmount(gstRebate, 2);
                        log.debug('customizeGlImpact',
                            'gstRebate =' + gstRebate +
                            ', amount = ' + amount +
                            ', taxRate1 = ' + taxRate1);

                        //regina - 6/28 - calculate correct rebate amounts
                        expRebate = (amount * taxRate1) - gstRebate;
                        expRebate = roundDecimalAmount(expRebate, 2);
                        totalRebateAmount += parseFloat(expRebate);

                        taxRebate = gstRebate + expRebate;
                        taxRebate = roundDecimalAmount(taxRebate, 2);
                        log.debug('customizeGlImpact',
                            'gstRebate =' + gstRebate +
                            ', expRebate = ' + expRebate +
                            ', taxRebate = ' + taxRebate);
                    }
                } else if (gstRebateFactor == 0){
                    gstRebate = 0;
                    expRebate = amount * taxRate1;
                    expRebate = roundDecimalAmount(expRebate, 2);
                    taxRebate = expRebate;
                    totalRebateAmount += parseFloat(expRebate);
                }
                log.debug('customizeGlImpact', 'end of gstRebate');

                if (hstRebateFactor > 0) {
                    var hstRebate = 0;
                    if (amount > 0) {
                        hstRebate = hstRebateFactor * amount *
                            taxRate1;

                        log.debug('customizeGlImpact',
                            'hstRebate =' + hstRebate +
                            ', hstRebateFactor = ' + hstRebateFactor +
                            ', flTaxRate = ' + taxRate1);

                        hstRebate = roundDecimalAmount(hstRebate, 2);

                        //regina - 6/28 - calculate correct rebate amounts
                        expRebate = (amount * taxRate1) - hstRebate;
                        expRebate = roundDecimalAmount(expRebate, 2);
                        totalRebateAmount += parseFloat(expRebate);

                        taxRebate = parseFloat(hstRebate) + parseFloat(expRebate);
                        taxRebate = roundDecimalAmount(taxRebate, 2);

                        log.debug('customizeGlImpact',
                            'hstRebate =' + hstRebate +
                            ', expRebate = ' + expRebate +
                            ', taxRebate = ' + taxRebate);

                    }
                    log.debug('customizeGlImpact','end of hstRebate');
                }
                totalRebateAmount = (Math.floor(totalRebateAmount * 100) / 100).toFixed(2);
            }

            log.debug('totalRebateAmount', totalRebateAmount);
            return totalRebateAmount;

        }

        function roundDecimalAmount (flDecimalNumber, intDecimalPlace) {
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
        }

        function isEmpty(value) {
            return ((value === 'none' || value === '' || value == null || value == undefined) || (value.constructor === Array && value.length == 0) ||
                (value.constructor === Object && (function (v) { for (var k in v) return false; return true; })(value)));
        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
