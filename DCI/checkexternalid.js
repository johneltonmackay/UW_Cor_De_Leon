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
                        ['type', 'anyof', 'SalesOrd'],
                        'AND',
                        ['systemnotes.field', 'anyof', 'CUSTBODY_CC_EXTERNAL_ID'],
                        'AND',
                        ['systemnotes.name', 'noneof', '@NONE@'],
                      ],
                    columns: [
                        search.createColumn({name: 'internalid'}),
                        search.createColumn({ name: 'recordtype' }),
                        search.createColumn({ name: 'entity' }),
                        search.createColumn({ name: 'context', join: 'systemnotes' }),
                        search.createColumn({ name: 'oldvalue', join: 'systemnotes' }),
                        search.createColumn({ name: 'newvalue', join: 'systemnotes' }),
                        search.createColumn({ name: 'field', join: 'systemnotes' }),
                        search.createColumn({ name: 'name', join: 'systemnotes' }),
                        search.createColumn({ name: 'type', join: 'systemnotes' })
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
                                var recType = pageData[pageResultIndex].getValue({ name: 'recordtype'});
                                var recEntity = pageData[pageResultIndex].getValue({ name: 'entity' });
                                var recContext = pageData[pageResultIndex].getValue({ name: 'context', join: 'systemnotes' });
                                var recOldvalue = pageData[pageResultIndex].getValue({ name: 'oldvalue', join: 'systemnotes' });
                                var recNewvalue = pageData[pageResultIndex].getValue({ name: 'newvalue', join: 'systemnotes' });
                                var recField = pageData[pageResultIndex].getValue({ name: 'field', join: 'systemnotes' });
                                var recName = pageData[pageResultIndex].getValue({ name: 'name', join: 'systemnotes' });
                                var noteType = pageData[pageResultIndex].getValue({ name: 'type', join: 'systemnotes' });
                                var objHistory = {
                                    contextValue: recContext,
                                    oldValue: recOldvalue,
                                    newValue: recNewvalue,
                                    noteField: recField,
                                    noteName: recName,
                                    noteType: noteType,
                                }
                                // Check if recIFId already exists in arrTransaction
                                var existingIndex = arrTransaction.findIndex(item => item.recEntity === recEntity);
                                if (existingIndex == -1) {
                                    // If it doesn't exist, create a new record
                                    arrTransaction.push({
                                        recType: recType,
                                        recEntity: recEntity,
                                        data: [{recId: recId, recType: recType, notes: objHistory}],
                                    });
                                } else {
                                    // If it exists, push new data
                                    arrTransaction[existingIndex].data.push({recId: recId, recType: recType, notes: objHistory});
                                }
                            }
                            log.audit(`getInputData: arrTransaction ${Object.keys(arrTransaction).length}`, arrTransaction);
                        }
                    }
                }
                log.audit(`getInputData: arrTransaction ${Object.keys(arrTransaction).length}`, arrTransaction);
                return arrTransaction;
            } catch (err) {
                log.error('getInputData error', err.message);
            }
        }

        const map = (mapContext) => {
           
        }

        const reduce = (reduceContext) => {
            
        }

        const summarize = (summaryContext) => {

        }

        return {getInputData, map, reduce, summarize}

    });
