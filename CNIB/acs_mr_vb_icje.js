/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/error', 'N/record', 'N/runtime', 'N/search'],
    /**
 * @param{error} error
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 */
    (error, record, runtime, search) => {


        /**
         * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
         * @param {Object} inputContext
         * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Object} inputContext.ObjectRef - Object that references the input data
         * @typedef {Object} ObjectRef
         * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
         * @property {string} ObjectRef.type - Type of the record instance that contains the input data
         * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
         * @since 2015.2
         */

        const getInputData = (inputContext) => {
            log.audit('GET INPUT STAGE', 'GETTING INPUT VALUES');

            var scriptObj = runtime.getCurrentScript();
            var vendorBillId = scriptObj.getParameter({name: 'custscript_vbicje_vbid'});
            var advICJEId = scriptObj.getParameter({name: 'custscript_vbicje_icjeid'});
            var dueToDefaultAccount = scriptObj.getParameter({name: 'custscript_vbicje_mr_duetoaccount'});
            var dueFromDefaultAccount = scriptObj.getParameter({name: 'custscript_vbicje_mr_duefromaccount'});
            var interCompanyLines = scriptObj.getParameter({name: 'custscript_vbicje_mr_iclines'});

            log.audit('SCRIPT PARAMETERS', {
                vendorBillId: vendorBillId,
                advICJEId: advICJEId,
                dueToDefaultAccount: dueToDefaultAccount,
                dueFromDefaultAccount: dueFromDefaultAccount,
            });
            return JSON.parse(interCompanyLines);
        }

        /**
         * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
         * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
         * context.
         * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
         *     is provided automatically based on the results of the getInputData stage.
         * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
         *     function on the current key-value pair
         * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
         *     pair
         * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} mapContext.key - Key to be processed during the map stage
         * @param {string} mapContext.value - Value to be processed during the map stage
         * @since 2015.2
         */

        const map = (mapContext) => {
            log.audit('MAP STAGE', 'MAPPING VALUES');
            log.audit('map: contextkey', mapContext.key);
            log.audit('map: contextvalues', mapContext.value);
            
            mapContext.write({
                key: JSON.parse(mapContext.value).lineIndex,
                value: JSON.parse(mapContext.value)
            });
        }

        /**
         * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
         * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
         * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
         *     provided automatically based on the results of the map stage.
         * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
         *     reduce function on the current group
         * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
         * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} reduceContext.key - Key to be processed during the reduce stage
         * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
         *     for processing
         * @since 2015.2
         */
        const reduce = (reduceContext) => {
            log.audit('REDUCE STAGE', 'REDUCING VALUES');
            log.audit('reduce: contextkey', reduceContext.key);
            log.audit('reduce: contextvalues', reduceContext.values);

            var interCompanyLine = JSON.parse(reduceContext.values[0]);
            
            var scriptObj = runtime.getCurrentScript();
            var vendorBillId = scriptObj.getParameter({name: 'custscript_vbicje_vbid'});
            var advICJEId = scriptObj.getParameter({name: 'custscript_vbicje_icjeid'});
            var dueToDefaultAccount = scriptObj.getParameter({name: 'custscript_vbicje_mr_duetoaccount'});
            var dueFromDefaultAccount = scriptObj.getParameter({name: 'custscript_vbicje_mr_duefromaccount'});
            var strTaxJurisdictionIds = scriptObj.getParameter({name: 'custscript_vbicje_mr_taxjuris'});
            var taxJurisdictionIds = JSON.parse(strTaxJurisdictionIds);
            log.audit('taxJurisdictionIds', taxJurisdictionIds);

            var vendorBillObj = record.load({
                type: record.Type.VENDOR_BILL,
                id: vendorBillId
            });

            var icjeObj = record.load({
                type: record.Type.ADV_INTER_COMPANY_JOURNAL_ENTRY,
                id: advICJEId,
                isDynamic: true
            });

            log.audit('ICJE CREATION', 'Loading ICJE... Adding New Lines.');
            
            // create 4 lines for each line on the source transacion. 
            var srcLineParams = interCompanyLine;
            var sourceSubsidiary = interCompanyLine.headerSub;
            var lineSub = interCompanyLine.distEntity;
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
                createICJELines(icjeObj, indexIdentifier, mainSub, otherSub, dueToDefaultAccount, dueFromDefaultAccount, vendorBillObj, srcLineParams, taxJurisdictionIds);
            }
            
            var icjeLineCount = icjeObj.getLineCount('line');
            log.audit('ICJE CREATION', 'Lines generated: ' + icjeLineCount);
            if (icjeLineCount > 4) { // 4 = initially created lines
                icjeObj.save({
                    ignoreMandatoryFields: true
                });
                log.audit('ADV ICJE UPDATED', 'RECORD ID: ' + advICJEId);
            } else {
                log.audit('ICJE CREATION', 'Advanced ICJE was not completely processed. Please double check your source transaction');
            }
        }

        /**
         * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
         * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
         * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
         * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
         *     script
         * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
         * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
         * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
         * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
         *     script
         * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
         * @param {Object} summaryContext.inputSummary - Statistics about the input stage
         * @param {Object} summaryContext.mapSummary - Statistics about the map stage
         * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
         * @since 2015.2
         */
        const summarize = (summaryContext) => {
            log.audit('SUMMARIZE STAGE', 'SUMMARIZE RESULT');

            summaryContext.mapSummary.errors.iterator().each(function(key, error, executionNo) {
                log.audit({
                    title: 'Map Error for key: ' + key + ' and execution number: ' + executionNo,
                    details: error
                })
                return true;
            })
            
            summaryContext.reduceSummary.errors.iterator().each(function (key, error, executionNo){
                log.audit({
                       title: 'Reduce error for key: ' + key + ', execution no. ' + executionNo,
                       details: error
                });
                return true;
            });
            
            var scriptObj = runtime.getCurrentScript();
            var advICJEId = scriptObj.getParameter({name: 'custscript_vbicje_icjeid'});
            record.submitFields({
                type: record.Type.ADV_INTER_COMPANY_JOURNAL_ENTRY,
                id: advICJEId,
                values: { 
                    custbody_acs_vbicje_taskid : ''
                }
            });
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

        return {getInputData, map, reduce, summarize}

    });
