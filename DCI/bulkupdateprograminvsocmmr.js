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
                    type: 'transaction',
                    filters: [
                        ['item', 'anyof', '4402', '4414', '4412', '4415'],
                        'AND',
                        ['type', 'anyof', 'CustInvc', 'CustCred', 'SalesOrd'],
                        'AND',
                        ['mainline', 'is', 'F'],
                        'AND',
                        ['department', 'anyof', '@NONE@'],
                        'AND',
                        ['custcol_cseg_npo_program', 'anyof', '24'],
                        'AND',
                        ['trandate', 'within', '1/1/2024'],
                        // 'AND',
                        // ['internalid', 'anyof', '12895577', '12895578', '12895589', '12895593'],
                      ],
                    columns: [
                        search.createColumn({name: 'internalid'}),
                        search.createColumn({ name: 'internalid', join: 'createdfrom' }),
                        search.createColumn({ name: 'recordtype' }),
                        search.createColumn({ name: 'recordtype', join: 'createdfrom' }),
                        search.createColumn({ name: 'lineuniquekey' })
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
                                var recId = pageData[pageResultIndex].getValue({name: 'internalid'});
                                var createdFromId = pageData[pageResultIndex].getValue({ name: 'internalid', join: 'createdfrom' });
                                var recType = pageData[pageResultIndex].getValue({ name: 'recordtype'});
                                var recCreatedFromType = pageData[pageResultIndex].getValue({ name: 'recordtype', join: 'createdfrom' });
                                var recLineUniqueKey = pageData[pageResultIndex].getValue({ name: 'lineuniquekey' });
                                
                                // Check if recIFId already exists in arrTransaction
                                var existingIndex = arrTransaction.findIndex(item => item.recId === recId);
                                if (existingIndex == -1) {
                                    // If doesn't exist, create a new record
                                    arrTransaction.push({
                                        recId: recId,
                                        recType: recType,
                                        createdFromId: createdFromId,
                                        recCreatedFromType: recCreatedFromType,
                                        recLineUniqueKey: [recLineUniqueKey]
                                    });
                                } else {
                                    arrTransaction[existingIndex].recLineUniqueKey.push(recLineUniqueKey);
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
                log.debug('map : mapContext', mapContext)
                let objMapValue = JSON.parse(mapContext.value)   
                log.debug('map : objMapValue', objMapValue)

                let intCreatedFromId = objMapValue.createdFromId

                if (intCreatedFromId){
                    var recordCreatedFromId = record.submitFields({
                        type: objMapValue.recCreatedFromType,
                        id: intCreatedFromId,
                        values: {
                            custbody_ava_disable_tax_calculation: true
                        },
                    })
                    log.debug("map updated recordCreatedFromId " + objMapValue.recCreatedFromType, recordCreatedFromId)
                }
                
                mapContext.write({
                    key: objMapValue.recId,
                    value: objMapValue
                })
            } catch (err) {
                log.error('map error', err.message);
            }
        }

        const reduce = (reduceContext) => {
            try {
                log.debug('reduce : reduceContext', reduceContext);
                let objReduceValues = JSON.parse(reduceContext.values)
                log.debug("reduce objReduceValues", objReduceValues)

                var arrRecLines = objReduceValues.recLineUniqueKey;
                var intRecId = reduceContext.key;
                let objRecord = record.load({
                    type: objReduceValues.recType,
                    id: intRecId,
                    isDynamic: true,
                });
                log.debug("reduce objRecord", objRecord)
                if (objRecord){

                    objRecord.setValue({fieldId:'custbody_ava_disable_tax_calculation', value:true})

                    arrRecLines.forEach(function (recLineData) {
                        var intLineRec = objRecord.findSublistLineWithValue({
                            sublistId:'item',
                            fieldId:'lineuniquekey',
                            value:recLineData
                        })
                        log.debug('reduce: intLineRec', intLineRec)
                        if(intLineRec != -1){
                            objRecord.selectLine({
                                sublistId:'item',
                                line:intLineRec
                            });
                            objRecord.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_cseg_npo_program',
                                value: 109 // Eucharistic Consecration
                            });
                            objRecord.commitLine({sublistId:'item'})
                        }
                    });
                    let recordId = objRecord.save()
                    log.debug('reduce recordId Updated', recordId) 
                }
            } catch (err) {
                log.error('reduce error', err.message);
            }
        }

        const summarize = (summaryContext) => {

        }

        return {getInputData, map, reduce, summarize}

    });
