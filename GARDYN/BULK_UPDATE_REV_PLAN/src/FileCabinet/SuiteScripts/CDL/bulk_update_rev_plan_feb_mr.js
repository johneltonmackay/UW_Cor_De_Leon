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
                    type: 'revenueplan',
                    filters: [
                        ['revenueelement.elementdate', 'within', '2024-02-01', '2024-02-29'],
                        'AND',
                        ['plannedperiod', 'anyof', '56', '58', '59', '60'],
                        'AND',
                        ['amount', 'notequalto', '0.00'],
                        'AND',
                        ['revenuerecognitionrule', 'anyof', '12', '2', '1'],
                      ],
                    columns: [
                        search.createColumn({name: 'internalid'}),
                        search.createColumn({ name: 'elementdate', join: 'revenueelement' }),
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
                                var recDate = pageData[pageResultIndex].getValue({ name: 'elementdate', join: 'revenueelement' });
                                
                                // Check if recIFId already exists in arrTransaction
                                var existingIndex = arrTransaction.findIndex(item => item.recId === recId);
                                if (existingIndex == -1) {
                                    // If doesn't exist, create a new record
                                    arrTransaction.push({
                                        recId: recId,
                                        recType: 'revenueplan',
                                        recDate: recDate,
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
                log.debug('map : mapContext', mapContext)
                let objMapValue = JSON.parse(mapContext.value)   
                // log.debug('map : objMapValue', objMapValue)

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
                // log.debug("reduce objReduceValues", objReduceValues)

                var date = new Date(objReduceValues.recDate);
                var month = date.getMonth() + 1;
                var day = date.getDate() + 1;
                var year = date.getFullYear();
                
                var formattedDate = month + '/' + day + '/' + year;
                log.debug("reduce formattedDate", formattedDate)

                var recordId = record.submitFields({
                    type: objReduceValues.recType,
                    id: objReduceValues.recId,
                    values: {
                        revrecstartdate: new Date (formattedDate),
                        revrecenddate: new Date (formattedDate)
                    },
                })
                log.debug("reduce updated recordId ", recordId)
                
    
            } catch (err) {
                log.error('reduce error', err.message);
            }
        }

        const summarize = (summaryContext) => {

        }

        return {getInputData, map, reduce, summarize}

    });
