/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/search'],
    /**
     * @param{record} record
     * @param{search} search
     */
    (record, search) => {
        const getInputData = (inputContext) => {
            let arrTransaction = [];
            try {
                let objTransactionSearch = search.create({
                    type: 'itemfulfillment',
                    filters: [
                        ['item', 'anyof', '4402', '4414', '4412', '4415'],
                        'AND',
                        ['type', 'anyof', 'ItemShip'],
                        'AND',
                        ['mainline', 'is', 'F'],
                        'AND',
                        ['department', 'anyof', '@NONE@'],
                        'AND',
                        ['custcol_cseg_npo_program', 'anyof', '24'],
                        'AND',
                        ['trandate', 'within', '1/1/2024'],
                        'AND',
                        ['createdfrom', 'noneof', '@NONE@'],
                        // 'AND',
                        // ['internalid', 'anyof', '12525583', '12526424', '12529315', '12561608'],
                      ],
                    columns: [
                        search.createColumn({name: 'internalid'}),
                        search.createColumn({ name: 'internalid', join: 'createdfrom' }),
                        search.createColumn({ name: 'recordtype' }),
                        search.createColumn({ name: 'recordtype', join: 'createdfrom' })
                    ],

                });
                var searchResultCount = objTransactionSearch.runPaged().count;
                if (searchResultCount != 0) {
                    var pagedData = objTransactionSearch.runPaged({pageSize: 1000});
                    for (var i = 0; i < pagedData.pageRanges.length; i++) {
                        var currentPage = pagedData.fetch(i);
                        var pageData = currentPage.data;
                        if (pageData.length > 0) {
                            for (var pageResultIndex = 0; pageResultIndex < pageData.length; pageResultIndex++) {
                                var recIFId = pageData[pageResultIndex].getValue({name: 'internalid'});
                                var createdFromId = pageData[pageResultIndex].getValue({ name: 'internalid', join: 'createdfrom' });
                                var recIFType = pageData[pageResultIndex].getValue({ name: 'recordtype'});
                                var recCreatedFromType = pageData[pageResultIndex].getValue({ name: 'recordtype', join: 'createdfrom' });
                                
                                // Check if recIFId already exists in arrTransaction
                                var existingIndex = arrTransaction.findIndex(item => item.recIFId === recIFId);
                                if (existingIndex == -1) {
                                    // If doesn't exist, create a new record
                                    arrTransaction.push({
                                        recIFId: recIFId,
                                        recIFType: recIFType,
                                        createdFromId: createdFromId,
                                        recCreatedFromType: recCreatedFromType,
                                    });
                                }
                            }
                        }
                    }
                }
                log.debug(`getInputData: arrTransaction ${Object.keys(arrTransaction).length}`, arrTransaction);
                return arrTransaction;
            } catch (err) {
                log.error('getInputData error', err.message);
            }
        }

        const map = (mapContext) => {
            try {
                // log.debug('map : mapContext', mapContext)
                let objMapValue = JSON.parse(mapContext.value)   
                log.debug('map : objMapValue', objMapValue)
                
                var recordId = record.submitFields({
                    type: objMapValue.recCreatedFromType,
                    id: objMapValue.createdFromId,
                    values: {
                        custbody_ava_disable_tax_calculation: true
                    },
                })
                log.debug("map updated recordId " + objMapValue.recCreatedFromType, recordId)

                mapContext.write({
                    key: objMapValue.recIFId,
                    value: objMapValue
                })
            } catch (err) {
                log.error('map error', err.message);
            }
        }

        const reduce = (reduceContext) => {
            try {
                let arrItems = ['4402', '4414', '4412', '4415']
                // log.debug('reduce : reduceContext', reduceContext);
                let objReduceValues = JSON.parse(reduceContext.values)
                log.debug("reduce objReduceValues", objReduceValues)
                var intIFId = reduceContext.key;
                let objRecord = record.load({
                    type: objReduceValues.recIFType,
                    id: intIFId,
                    isDynamic: true,
                });
                log.debug("reduce objRecord", objRecord)
                if (objRecord){
                    var numLines = objRecord.getLineCount({
                        sublistId: 'item'
                    });
                    log.debug("reduce numLines", numLines)
                    if (numLines > 0) {
                        for (var i = 0;  i < numLines; i++) {
                            objRecord.selectLine({
                                sublistId: 'item',
                                line: i
                            });
                            let intItem = objRecord.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'item',
                                line: i
                            })
                            let strProgram = objRecord.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_cseg_npo_program',
                                line: i
                            })
                            let strDepartment = objRecord.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'department',
                                line: i
                            })
                            log.debug("reduce intItem", intItem)
                            log.debug("reduce strProgram", strProgram)
                            log.debug("reduce strDepartment", strDepartment)
                            if(arrItems.includes(intItem)){
                                if(strProgram == 24){ // Parish Book Program
                                    if (!strDepartment){
                                        objRecord.setCurrentSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'custcol_cseg_npo_program',
                                            value: 109 // Eucharistic Consecration
                                        });
                                    }
                                }
                            }
                            objRecord.commitLine({
                                sublistId: 'item'
                            });
                        }         
                        let recordId = objRecord.save()
                        log.debug('reduce IF recordId Updated', recordId)
                    }
                }
            } catch (err) {
                log.error('reduce error', err.message);
            }
        }

        const summarize = (summaryContext) => {

        }

        return {getInputData, map, reduce, summarize}

    });
