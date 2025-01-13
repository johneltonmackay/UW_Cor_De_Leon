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

                const getInputData = (inputContext) => {
                    log.debug('GET INPUT STAGE', 'GETTING INPUT VALUES');
                    var scriptObj = runtime.getCurrentScript();
                    var paramObjData = scriptObj.getParameter({name: 'custscript_objdata'});
                    log.debug('GET INPUT STAGE: paramObjData', paramObjData);
                    return JSON.parse(paramObjData);
                }

                const map = (mapContext) => {
                    let objMapValue = JSON.parse(mapContext.value)
                    let totalCredit
                    let totalDebit
                    let recId = objMapValue.recid
                    let arrlineData = objMapValue.line
                    let objHeaderData = objMapValue.header
                    let counter = 0
                    log.debug('MAP STAGE: arrlineData ', arrlineData);
                    log.debug('MAP STAGE: arrlineData', objHeaderData);
                    let arrICJELineData = buildLineData(arrlineData, objHeaderData)
                    log.debug('MAP STAGE: arrICJELineData.length', arrICJELineData.length);
                    let arrVendorID = getVendorData()
                    let arrCustomerID = getCustomerData()
                    let arrName = [];
                    for (let x = 0; x < arrICJELineData.length; x++) {
                        try {
                            let headEntity = objHeaderData.entity;
                            let intAccountID = arrICJELineData[x].lineData.accountId;
                            let disEntity = arrICJELineData[x].lineData.disEntity;
                            let entityName = ""; // Move the declaration outside the if conditions
                    
                            log.debug('MAP STAGE: intAccountID', intAccountID);
                    
                            if (intAccountID === 727) { // 20020 Accounts Payables: Intercompany Payables
                                arrVendorID.forEach(vendor => {
                                    let intRepresentSub = vendor.representSubsidiary;
                                    let intSub = vendor.subsidiary;
                    
                                    if (intRepresentSub == headEntity && intSub == disEntity) {
                                        entityName = vendor.vendorId ? parseInt(vendor.vendorId) : null;
                                    }
                                });
                            } else if (intAccountID === 687) { // 10235 Accounts Receivables: Intercompany Receivables
                                arrCustomerID.forEach(customer => {
                                    let intCustRepresentSub = customer.representSubsidiary;
                                    let intCustSub = customer.subsidiary;
                    
                                    if (intCustSub == headEntity && intCustRepresentSub == disEntity) {
                                        entityName = customer.customerId ? parseInt(customer.customerId) : null; // Fix the assignment here
                                    }
                                });
                            }
                    
                            // Add entityName to the current object
                            if (entityName){
                                arrICJELineData[x].entityName = entityName;
                            }
                        } catch (error) {
                            log.error('error', error.message);
                        }
                    }
                    log.debug('arrICJELineData', arrICJELineData);
                    
                    try {
                        var icjeObj = record.create({
                            type: record.Type.ADV_INTER_COMPANY_JOURNAL_ENTRY,
                            isDynamic: true,
                            defaultValues: {
                                subsidiary: objHeaderData.entity
                            },
                        });
                        icjeObj.setValue({
                            fieldId: 'customform',
                            value: 130 // CNIB | Intercompany
                        });
                        icjeObj.setValue({
                            fieldId: 'trandate',
                            value: new Date(objHeaderData.trandate),
                        });
                        icjeObj.setValue({
                            fieldId: 'postingperiod',
                            value: objHeaderData.postingperiod
                        });
                        icjeObj.setValue({
                            fieldId: 'memo',
                            value: objHeaderData.memo
                        });
                        icjeObj.setValue({
                            fieldId: 'approvalstatus',
                            value: 2
                        });
                        icjeObj.setValue({
                            fieldId: 'custbody_nsts_vb',
                            value: recId ? parseInt(recId) : null,
                        });
                        
                        let originalArray = arrICJELineData
                          
                        // Create an object to store consolidated data
                        let consolidatedData = {};
                          
                        // Iterate through the original array
                        originalArray.forEach((item) => {
                            let key = JSON.stringify({
                                lineData: {
                                    accountId: item.lineData.accountId,
                                    isDebit: item.lineData.isDebit,
                                    entity: item.lineData.entity,
                                    disEntity: item.lineData.disEntity
                                },
                                fixObj: item.fixObj,
                                segments: item.segments,
                                entityName: item.entityName,
                            });
                          
                            if (consolidatedData[key]) {
                              // If the key already exists, update the values accordingly
                              consolidatedData[key].lineData.amount += item.lineData.amount;
                            } else {
                              // If the key doesn't exist, add a new entry with the current item
                              consolidatedData[key] = { ...item };
                            }
                        });
                          
                        // Convert the object back to an array
                        let consolidatedArray = Object.values(consolidatedData);
                        arrICJELineData = consolidatedArray;
                          
                        log.debug('consolidatedArray', consolidatedArray);
                        log.debug('New arrICJELineData', arrICJELineData);
                          

                        for (let x=0; x < arrICJELineData.length; x++){
                            counter = x
                            log.debug('arrICJELineData', arrICJELineData[x])
                            targetSub = arrICJELineData[x].lineData.disEntity
                            mainSub = objHeaderData.entity
                            icjeObj.selectNewLine({
                                sublistId: 'line'
                            });
                            if (arrICJELineData[x].lineData.amount >= 0.01) {
                                icjeObj.setCurrentSublistValue({
                                    sublistId: 'line',
                                    fieldId: 'linesubsidiary',
                                    value: arrICJELineData[x].lineData.entity
                                });
                                icjeObj.setCurrentSublistValue({
                                    sublistId: 'line',
                                    fieldId: 'account',
                                    value: arrICJELineData[x].lineData.accountId
                                });
                                if (arrICJELineData[x].lineData.isDebit) {
                                    totalDebit += arrICJELineData[x].lineData.amount;
                                    icjeObj.setCurrentSublistValue({
                                        sublistId: 'line',
                                        fieldId: 'debit',
                                        value: arrICJELineData[x].lineData.amount
                                    });
                                } else {
                                    totalCredit += arrICJELineData[x].lineData.amount;
                                    icjeObj.setCurrentSublistValue({
                                        sublistId: 'line',
                                        fieldId: 'credit',
                                        value: arrICJELineData[x].lineData.amount
                                    });
                                }
                                icjeObj.setCurrentSublistValue({
                                    sublistId: 'line',
                                    fieldId: 'department',
                                    value: arrICJELineData[x].fixObj.department
                                });
                                icjeObj.setCurrentSublistValue({
                                    sublistId: 'line',
                                    fieldId: 'location',
                                    value: arrICJELineData[x].fixObj.store
                                });
                                icjeObj.setCurrentSublistValue({
                                    sublistId: 'line',
                                    fieldId: 'cseg_npo_region',
                                    value: arrICJELineData[x].fixObj.location
                                });
                                icjeObj.setCurrentSublistValue({
                                    sublistId: 'line',
                                    fieldId: 'cseg_npo_program',
                                    value: arrICJELineData[x].segments.program
                                });
                                icjeObj.setCurrentSublistValue({
                                    sublistId: 'line',
                                    fieldId: 'cseg_npo_program',
                                    value: arrICJELineData[x].segments.program
                                });
                                icjeObj.setCurrentSublistValue({
                                    sublistId: 'line',
                                    fieldId: 'cseg_npo_exp_type',
                                    value: arrICJELineData[x].segments.functionalExpense
                                });
                                icjeObj.setCurrentSublistValue({
                                    sublistId: 'line',
                                    fieldId: 'cseg_npo_grant',
                                    value: arrICJELineData[x].segments.grant
                                });
                                let blnEliminate = icjeObj.getCurrentSublistValue({
                                    sublistId: 'line',
                                    fieldId: 'eliminate',
                                });
                                if (blnEliminate){
                                    log.debug('arrICJELineData[x].entityName ', arrICJELineData[x].entityName)
                                    icjeObj.setCurrentSublistValue({
                                        sublistId: 'line',
                                        fieldId: 'entity',
                                        value: arrICJELineData[x].entityName,
                                    });
                                }
                                icjeObj.setCurrentSublistValue({
                                    sublistId: 'line',
                                    fieldId: 'custcol_cseg_npo_rev_type',
                                    value: 240 // No Revenue Type
                                });
                            }; 
                            icjeObj.commitLine({
                                sublistId: 'line',
                            });   
                        }
                        let newICJEId = icjeObj.save({
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        });
                        log.debug("newICJEId", newICJEId)
                        mapContext.write({
                            key: newICJEId,
                            value: objMapValue
                        })
                    } catch (error) {
                        log.error('error', error.message)
                    }
                }

                const reduce = (reduceContext) => {
                    log.debug('REDUCE STAGE', 'REDUCING VALUES');
                    var reduceKey = reduceContext.key;
                    var reduceValues = reduceContext.values;
                    log.debug('REDUCE STAGE reduceKey', reduceKey);
                    log.debug('REDUCE STAGE reduceKey', reduceValues);
                    var objData = JSON.parse(reduceContext.values[0]);
                    let recId = objData.recid
                    let relatedICJE = objData.header.icje
                    log.debug('REDUCE STAGE recId', recId);
                    log.debug('REDUCE STAGE relatedICJE', relatedICJE);
                    if (recId){
                        record.submitFields({
                            type: record.Type.VENDOR_BILL,
                            id: recId,
                            values: {
                                custbody_ns_related_icje: reduceKey,
                            }
                        });

                        if (relatedICJE) {
                            log.debug('REDUCE STAGE delete test');
                            try {
                                record.delete({
                                    type: record.Type.ADV_INTER_COMPANY_JOURNAL_ENTRY,
                                    id: relatedICJE,
                                });
                                log.debug('REDUCE STAGE delete success', relatedICJE);
                            } catch (e) {
                                log.error('Error deleting ADV_INTER_COMPANY_JOURNAL_ENTRY', e.message);
                            }
                        }
                    }
                }

                const summarize = (summaryContext) => {
                    
                }

                const buildLineData = (arrlineData, objHeaderData) => {
                    try {
                        let arrAdditionalLines = []
                        arrlineData.forEach(data => {
                            let taxRate1 = data.taxrate1
                            let taxRate2 = data.taxrate2
                            let accountId = data.account
                            let amount = data.amount
                            var headerSegments = {
                                department: objHeaderData.department ? parseInt(objHeaderData.department) : null,
                                location: objHeaderData.location ? parseInt(objHeaderData.location) : null,
                                store: data.store ? parseInt(data.store) : null,
                            }
                            var lineSegments = {
                                department: data.department ? parseInt(data.department) : null,
                                location: data.location ? parseInt(data.location) : null,
                                store: data.store ? parseInt(data.store) : null,
                            }
                            var objSegments = {
                                program: data.program ? parseInt(data.program) : null,
                                functionalExpense: data.funcExp ? parseInt(data.funcExp) : null,
                                grant: data.grant ? parseInt(data.grant) : null,
                            }
                            if (data.distEntity > 0 && data.distEntity != 6){
                                if (taxRate1 == 13 && taxRate2 == 0){
                                    var lineData = {
                                        accountId: accountId, 
                                        isDebit: false,
                                        amount: amount + parseFloat((amount * 0.13 * 0.3031).toFixed(2)),
                                        entity: objHeaderData.entity ? parseInt(objHeaderData.entity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null

                                    };
                                    var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                    var lineData = {
                                        accountId: 687, // 10235 Accounts Receivables : Intercompany Receivables
                                        isDebit: true,
                                        amount: amount + parseFloat((amount * 0.13 * 0.3031).toFixed(2)),
                                        entity: objHeaderData.entity ? parseInt(objHeaderData.entity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: headerSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                    var lineData = {
                                        accountId: accountId, 
                                        isDebit: true,
                                        amount: amount + parseFloat((amount * 0.13 * 0.3031).toFixed(2)),
                                        entity:  data.distEntity ? parseInt(data.distEntity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                    var lineData = {
                                        accountId: 727, // 20020 Accounts Payables : Intercompany Payables
                                        isDebit: false,
                                        amount: amount + parseFloat((amount * 0.13 * 0.3031).toFixed(2)),
                                        entity: data.distEntity ? parseInt(data.distEntity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                } else if (taxRate1 == 5 && taxRate2 == 7) {
                                    var lineData = {
                                        accountId: accountId, 
                                        isDebit: false,
                                        amount: amount + (parseFloat((amount * 0.05 * 0.5).toFixed(2)) + parseFloat((amount * 0.07 * 1.0).toFixed(2))),
                                        entity: objHeaderData.entity ? parseInt(objHeaderData.entity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                    var lineData = {
                                        accountId: accountId,
                                        isDebit: true,
                                        amount: amount + (parseFloat((amount * 0.05 * 0.5).toFixed(2)) + parseFloat((amount * 0.07 * 1.0).toFixed(2))),
                                        entity: data.distEntity ? parseInt(data.distEntity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                    var lineData = {
                                        accountId: 687, // 10235 Accounts Receivables : Intercompany Receivables, 
                                        isDebit: true,
                                        amount: amount + (parseFloat((amount * 0.05 * 0.5).toFixed(2)) + parseFloat((amount * 0.07 * 1.0).toFixed(2))),
                                        entity: objHeaderData.entity ? parseInt(objHeaderData.entity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: headerSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                    var lineData = {
                                        accountId: 727, // 20020 Accounts Payables : Intercompany Payables
                                        isDebit: false,
                                        amount: amount + (parseFloat((amount * 0.05 * 0.5).toFixed(2)) + parseFloat((amount * 0.07 * 1.0).toFixed(2))),
                                        entity: data.distEntity ? parseInt(data.distEntity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                } else if (taxRate1 == 5 && taxRate2 == 9.975) {
                                    var lineData = {
                                        accountId: accountId, 
                                        isDebit: false,
                                        amount: amount + (parseFloat((amount * 0.05 * 0.5).toFixed(2)) + parseFloat((amount * 0.09975 * 1.0).toFixed(2))),
                                        entity: objHeaderData.entity ? parseInt(objHeaderData.entity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                    var lineData = {
                                        accountId: accountId,
                                        isDebit: true,
                                        amount: amount + (parseFloat((amount * 0.05 * 0.5).toFixed(2)) + parseFloat((amount * 0.09975 * 1.0).toFixed(2))),
                                        entity: data.distEntity ? parseInt(data.distEntity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                    var lineData = {
                                        accountId: 687, // 10235 Accounts Receivables : Intercompany Receivables, 
                                        isDebit: true,
                                        amount: amount + (parseFloat((amount * 0.05 * 0.5).toFixed(2)) + parseFloat((amount * 0.09975 * 1.0).toFixed(2))),
                                        entity:  objHeaderData.entity ? parseInt(objHeaderData.entity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: headerSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                    var lineData = {
                                        accountId: 727, // 20020 Accounts Payables : Intercompany Payables
                                        isDebit: false,
                                        amount: amount + (parseFloat((amount * 0.05 * 0.5).toFixed(2)) + parseFloat((amount * 0.09975 * 1.0).toFixed(2))),
                                        entity: data.distEntity ? parseInt(data.distEntity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                } else if (taxRate1 == 5 && taxRate2 == 6) {
                                    var lineData = {
                                        accountId: accountId, 
                                        isDebit: false,
                                        amount: amount + (parseFloat((amount * 0.05 * 0.5).toFixed(2)) + parseFloat((amount * 0.06 * 1.0).toFixed(2))),
                                        entity: objHeaderData.entity ? parseInt(objHeaderData.entity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                    var lineData = {
                                        accountId: accountId,
                                        isDebit: true,
                                        amount: amount + (parseFloat((amount * 0.05 * 0.5).toFixed(2)) + parseFloat((amount * 0.06 * 1.0).toFixed(2))),
                                        entity: data.distEntity ? parseInt(data.distEntity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                    var lineData = {
                                        accountId: 687, // 10235 Accounts Receivables : Intercompany Receivables, 
                                        isDebit: true,
                                        amount: amount + (parseFloat((amount * 0.05 * 0.5).toFixed(2)) + parseFloat((amount * 0.06 * 1.0).toFixed(2))),
                                        entity:  objHeaderData.entity ? parseInt(objHeaderData.entity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: headerSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                    var lineData = {
                                        accountId: 727, // 20020 Accounts Payables : Intercompany Payables
                                        isDebit: false,
                                        amount: amount + (parseFloat((amount * 0.05 * 0.5).toFixed(2)) + parseFloat((amount * 0.06 * 1.0).toFixed(2))),
                                        entity: data.distEntity ? parseInt(data.distEntity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                } else if (taxRate1 == 5 && taxRate2 == 0) {
                                    var lineData = {
                                        accountId: accountId, 
                                        isDebit: false,
                                        amount: amount + parseFloat((amount * 0.05 * 0.5).toFixed(2)),
                                        entity: objHeaderData.entity ? parseInt(objHeaderData.entity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                    var lineData = {
                                        accountId: accountId,
                                        isDebit: true,
                                        amount: amount + parseFloat((amount * 0.05 * 0.5).toFixed(2)),
                                        entity: data.distEntity ? parseInt(data.distEntity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                    var lineData = {
                                        accountId: 687, // 10235 Accounts Receivables : Intercompany Receivables
                                        isDebit: true,
                                        amount: amount + parseFloat((amount * 0.05 * 0.5).toFixed(2)),
                                        entity: objHeaderData.entity ? parseInt(objHeaderData.entity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: headerSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                    var lineData = {
                                        accountId: 727, // 20020 Accounts Payables : Intercompany Payables
                                        isDebit: false,
                                        amount: amount + parseFloat((amount * 0.05 * 0.5).toFixed(2)),
                                        entity: data.distEntity ? parseInt(data.distEntity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                } else if (taxRate1 == 15 && taxRate2 == 0) {
                                    var lineData = {
                                        accountId: accountId, 
                                        isDebit: false,
                                        amount: amount + parseFloat((amount * 0.15 * 0.5).toFixed(2)),
                                        entity: objHeaderData.entity ? parseInt(objHeaderData.entity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                    var lineData = {
                                        accountId: accountId,
                                        isDebit: true,
                                        amount: amount + parseFloat((amount * 0.15 * 0.5).toFixed(2)),
                                        entity: data.distEntity ? parseInt(data.distEntity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                    var lineData = {
                                        accountId: 687, // 10235 Accounts Receivables : Intercompany Receivables
                                        isDebit: true,
                                        amount: amount + parseFloat((amount * 0.15 * 0.5).toFixed(2)),
                                        entity: objHeaderData.entity ? parseInt(objHeaderData.entity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: headerSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                    var lineData = {
                                        accountId: 727, // 20020 Accounts Payables : Intercompany Payables
                                        isDebit: false,
                                        amount: amount + parseFloat((amount * 0.15 * 0.5).toFixed(2)),
                                        entity: data.distEntity ? parseInt(data.distEntity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                } else if (taxRate1 == 0 && taxRate2 == 7) {
                                    var lineData = {
                                        accountId: accountId, 
                                        isDebit: false,
                                        amount: amount + parseFloat((amount * 0.07 * 1.0).toFixed(2)),
                                        entity: objHeaderData.entity ? parseInt(objHeaderData.entity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                    var lineData = {
                                        accountId: accountId,
                                        isDebit: true,
                                        amount: amount + parseFloat((amount * 0.07 * 1.0).toFixed(2)),
                                        entity: data.distEntity ? parseInt(data.distEntity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                    var lineData = {
                                        accountId: 687, // 10235 Accounts Receivables : Intercompany Receivables
                                        isDebit: true,
                                        amount: amount + parseFloat((amount * 0.07 * 1.0).toFixed(2)),
                                        entity: objHeaderData.entity ? parseInt(objHeaderData.entity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: headerSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                    var lineData = {
                                        accountId: 727, // 20020 Accounts Payables : Intercompany Payables
                                        isDebit: false,
                                        amount: amount + parseFloat((amount * 0.07 * 1.0).toFixed(2)),
                                        entity: data.distEntity ? parseInt(data.distEntity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                } else if (taxRate1 == 0 && taxRate2 == 6) {
                                    var lineData = {
                                        accountId: accountId, 
                                        isDebit: false,
                                        amount: amount + parseFloat((amount * 0.06 * 1.0).toFixed(2)),
                                        entity: objHeaderData.entity ? parseInt(objHeaderData.entity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                    var lineData = {
                                        accountId: accountId,
                                        isDebit: true,
                                        amount: amount + parseFloat((amount * 0.06 * 1.0).toFixed(2)),
                                        entity: data.distEntity ? parseInt(data.distEntity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                    var lineData = {
                                        accountId: 687, // 10235 Accounts Receivables : Intercompany Receivables
                                        isDebit: true,
                                        amount: amount + parseFloat((amount * 0.06 * 1.0).toFixed(2)),
                                        entity: objHeaderData.entity ? parseInt(objHeaderData.entity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: headerSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                    var lineData = {
                                        accountId: 727, // 20020 Accounts Payables : Intercompany Payables
                                        isDebit: false,
                                        amount: amount + parseFloat((amount * 0.06 * 1.0).toFixed(2)),
                                        entity: data.distEntity ? parseInt(data.distEntity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                } else if (taxRate1 == 0 && taxRate2 == 9.975) {
                                    var lineData = {
                                        accountId: accountId, 
                                        isDebit: false,
                                        amount: amount + parseFloat((amount * 0.09975 * 1.0).toFixed(2)),
                                        entity: objHeaderData.entity ? parseInt(objHeaderData.entity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                    var lineData = {
                                        accountId: accountId,
                                        isDebit: true,
                                        amount: amount + parseFloat((amount * 0.09975 * 1.0).toFixed(2)),
                                        entity: data.distEntity ? parseInt(data.distEntity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                    var lineData = {
                                        accountId: 687, // 10235 Accounts Receivables : Intercompany Receivables
                                        isDebit: true,
                                        amount: amount + parseFloat((amount * 0.09975 * 1.0).toFixed(2)),
                                        entity: objHeaderData.entity ? parseInt(objHeaderData.entity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: headerSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                    var lineData = {
                                        accountId: 727, // 20020 Accounts Payables : Intercompany Payables
                                        isDebit: false,
                                        amount: amount + parseFloat((amount * 0.09975 * 1.0).toFixed(2)),
                                        entity: data.distEntity ? parseInt(data.distEntity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                } else if (taxRate1 == 0 && taxRate2 == 0) {
                                    var lineData = {
                                        accountId: accountId, 
                                        isDebit: false,
                                        amount: amount,
                                        entity: objHeaderData.entity ? parseInt(objHeaderData.entity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                    var lineData = {
                                        accountId: accountId,
                                        isDebit: true,
                                        amount: amount,
                                        entity: data.distEntity ? parseInt(data.distEntity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                    var lineData = {
                                        accountId: 687, // 10235 Accounts Receivables : Intercompany Receivables
                                        isDebit: true,
                                        amount: amount,
                                        entity: objHeaderData.entity ? parseInt(objHeaderData.entity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: headerSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                    var lineData = {
                                        accountId: 727, // 20020 Accounts Payables : Intercompany Payables
                                        isDebit: false,
                                        amount: amount,
                                        entity: data.distEntity ? parseInt(data.distEntity) : null,
                                        disEntity: data.distEntity ? parseInt(data.distEntity) : null
                                    };
                                    var mergedObject = { lineData: lineData, fixObj: lineSegments, segments:  objSegments};
                                    arrAdditionalLines.push(mergedObject)
                                } else {
                                    let additionalLines = 0;
                                }
                            }
                        });
                        log.debug('buildLineData: arrAdditionalLines', arrAdditionalLines)
                        return arrAdditionalLines
                    } catch (error) {
                        log.error('error', error.message)
                    }
                }

                const getVendorData = (arrlineData, objHeaderData) => {
                    let arrVendorrData = [];
                    try {
                        let objAccountSearch = search.create({
                            type: 'customer',
                            filters: [
                                ['representingsubsidiary', 'noneof', '@NONE@'],
                                'AND',
                                ['subsidiary', 'noneof', '@NONE@'],
                            ],
                            columns: [
                                search.createColumn({name: 'internalid'}),
                                search.createColumn({name: 'representingsubsidiary'}),
                                search.createColumn({name: 'subsidiary'}),
                                
                            ],
        
                        });
                        var searchResultCount = objAccountSearch.runPaged().count;
                        if (searchResultCount != 0) {
                            var pagedData = objAccountSearch.runPaged({pageSize: 1000});
                            for (var i = 0; i < pagedData.pageRanges.length; i++) {
                                var currentPage = pagedData.fetch(i);
                                var pageData = currentPage.data;
                                if (pageData.length > 0) {
                                    for (var pageResultIndex = 0; pageResultIndex < pageData.length; pageResultIndex++) {
                                        arrVendorrData.push({
                                            vendorId: pageData[pageResultIndex].getValue({name: 'internalid'}),
                                            representSubsidiary: pageData[pageResultIndex].getValue({name: 'representingsubsidiary'}),
                                            subsidiary: pageData[pageResultIndex].getValue({name: 'subsidiary'}),
                                        });
                                    }
                                }
                            }
                        }
                        log.debug("getVendorData: arrVendorrData", arrVendorrData)
                        return arrVendorrData;
                    } catch (err) {
                        log.error('searchRecord', err.message);
                    }
                }

                const getCustomerData = (arrlineData, objHeaderData) => {
                    let arrCustomerData = [];
                    try {
                        let objAccountSearch = search.create({
                            type: 'customer',
                            filters: [
                                ['representingsubsidiary', 'noneof', '@NONE@'],
                                'AND',
                                ['subsidiary', 'noneof', '@NONE@'],
                            ],
                            columns: [
                                search.createColumn({name: 'internalid'}),
                                search.createColumn({name: 'representingsubsidiary'}),
                                search.createColumn({name: 'subsidiary'}),
                            ],
        
                        });
                        var searchResultCount = objAccountSearch.runPaged().count;
                        if (searchResultCount != 0) {
                            var pagedData = objAccountSearch.runPaged({pageSize: 1000});
                            for (var i = 0; i < pagedData.pageRanges.length; i++) {
                                var currentPage = pagedData.fetch(i);
                                var pageData = currentPage.data;
                                if (pageData.length > 0) {
                                    for (var pageResultIndex = 0; pageResultIndex < pageData.length; pageResultIndex++) {
                                        arrCustomerData.push({
                                            customerId: pageData[pageResultIndex].getValue({name: 'internalid'}),
                                            representSubsidiary: pageData[pageResultIndex].getValue({name: 'representingsubsidiary'}),
                                            subsidiary: pageData[pageResultIndex].getValue({name: 'subsidiary'}),
                                        });
                                    }
                                }
                            }
                        }
                        log.debug("getCustomerData: arrCustomerData", arrCustomerData)
                        return arrCustomerData;
                    } catch (err) {
                        log.error('searchRecord', err.message);
                    }
                } 

                return {getInputData, map, reduce, summarize}

            });
