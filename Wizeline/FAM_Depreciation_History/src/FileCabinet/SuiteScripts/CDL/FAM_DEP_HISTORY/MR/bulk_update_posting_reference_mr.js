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
            try {
                let arrFAMDepHistoryRecords = searchFAMDepHistoryRecords();
                let arrSummaryRecords = searchBGSummaryRecords();
                let arrMapResults = mapFAMRecords(arrFAMDepHistoryRecords, arrSummaryRecords)

                return arrMapResults;
            } catch (error) {
                log.error('getInputData', error.message);
            } 
        }

        const map = (mapContext) => {
            try {
                log.debug('map : mapContext', mapContext);
                let objMapValue = JSON.parse(mapContext.value)
                mapContext.write({
                    key: objMapValue.intFAMDepHistoryId,
                    value: objMapValue.intJEId
                }) 
            } catch (error) {
                log.error('map', error.message);
            }
        }

        const reduce = (reduceContext) => {
            try {
                log.debug('reduce : reduceContext', reduceContext);
                let objReduceValue = JSON.parse(reduceContext.values)
                log.debug('reduce : objReduceValue', objReduceValue);
                let intFAMDepHistoryId = reduceContext.key;
                let intJEId = objReduceValue;
                log.debug('reduce : intFAMDepHistoryId', intFAMDepHistoryId);
                log.debug('reduce : intJEId', intJEId);
                var recordId = record.submitFields({
                    type: 'customrecord_ncfar_deprhistory',
                    id: intFAMDepHistoryId,
                    values: {
                        custrecord_deprhistjournal: intJEId
                    },
                })
                log.debug("reduce: FAM Depreciation History updated: recordId ", recordId)
            } catch (error) {
                log.error('reduce', error.message);
            }

        }

        const summarize = (summaryContext) => {

        }

        // private function
        const mapFAMRecords = (arrFAMDepHistoryRecords, arrSummaryRecords) => {
            let arrMapResults = [];
            try {
                for (let i = 0; i < arrFAMDepHistoryRecords.length; i++) {
                    let objFAMDepHistoryRecord = arrFAMDepHistoryRecords[i];
                    for (let j = 0; j < arrSummaryRecords.length; j++) {
                        let objSummaryRecord = arrSummaryRecords[j];
                        if (objFAMDepHistoryRecord.recName.includes(objSummaryRecord.recName)) {
                            arrMapResults.push({
                                intFAMDepHistoryId: objFAMDepHistoryRecord.recId,
                                intJEId: objSummaryRecord.recJEId,
                            });
                        }
                    }
                }
                log.debug(`mapFAMRecords: arrMapResults ${Object.keys(arrMapResults).length}`, arrMapResults);
                return arrMapResults;
            } catch (error) {
                log.error('mapFAMRecords', error.message);
            }
        }

        const searchFAMDepHistoryRecords = () => {
            let arrFAMDepHistoryRecords = [];
            try {
                let objDepHistorySearch = search.create({
                    type: 'customrecord_ncfar_deprhistory',
                    filters: [
                        ['custrecord_deprhistaccountingbook', 'anyof', '1', '2'],
                        'AND',
                        ['custrecord_deprhistjournal', 'anyof', '@NONE@'],
                        'AND',
                        ['custrecord_deprhistdate', 'within', 'thisyear'],
                        'AND',
                        ['name', 'contains', '|'],
                        
                      ],
                    columns: [
                        search.createColumn({name: 'internalid'}),
                        search.createColumn({ name: 'name'}),
                    ],

                });
                var searchResultCount = objDepHistorySearch.runPaged().count;
                if (searchResultCount != 0) {
                    var pagedData = objDepHistorySearch.runPaged({pageSize: 1000});
                    for (var i = 0; i < pagedData.pageRanges.length; i++) {
                        var currentPage = pagedData.fetch(i);
                        var pageData = currentPage.data;
                        if (pageData.length > 0) {
                            for (var pageResultIndex = 0; pageResultIndex < pageData.length; pageResultIndex++) {
                                var intDepHistoryId = pageData[pageResultIndex].getValue({name: 'internalid'});
                                var strDepHistoryName = pageData[pageResultIndex].getValue({ name: 'name'});
                                
                                // Check if intSummaryId already exists in arrFAMDepHistoryRecords
                                var existingIndex = arrFAMDepHistoryRecords.findIndex(item => item.recId === intDepHistoryId);
                                if (existingIndex == -1) {
                                    // If doesn't exist, create a new record
                                    arrFAMDepHistoryRecords.push({
                                        recId: intDepHistoryId,
                                        recName: strDepHistoryName,
                                    });
                                }
                            }
                        }
                    }
                }
                log.debug(`searchFAMDepHistoryRecords: arrFAMDepHistoryRecords ${Object.keys(arrFAMDepHistoryRecords).length}`, arrFAMDepHistoryRecords);
                return arrFAMDepHistoryRecords;
            } catch (err) {
                log.error('searchFAMDepHistoryRecords error', err.message);
            }
        }

        const searchBGSummaryRecords = () => { 
            let arrSummaryRecords = [];
            try {
                let objSummarySearch = search.create({
                    type: 'customrecord_bg_summaryrecord',
                    filters: [
                        ['name', 'contains', '|'],
                        'AND',
                        ['custrecord_summary_histjournal', 'noneof', '@NONE@'],
                      ],
                    columns: [
                        search.createColumn({name: 'internalid'}),
                        search.createColumn({ name: 'name'}),
                        search.createColumn({ name: 'custrecord_summary_histjournal' }),
                    ],

                });
                var searchResultCount = objSummarySearch.runPaged().count;
                if (searchResultCount != 0) {
                    var pagedData = objSummarySearch.runPaged({pageSize: 1000});
                    for (var i = 0; i < pagedData.pageRanges.length; i++) {
                        var currentPage = pagedData.fetch(i);
                        var pageData = currentPage.data;
                        if (pageData.length > 0) {
                            for (var pageResultIndex = 0; pageResultIndex < pageData.length; pageResultIndex++) {
                                var intSummaryId = pageData[pageResultIndex].getValue({name: 'internalid'});
                                var strSummaryName = pageData[pageResultIndex].getValue({ name: 'name'});
                                var intJournalEntry = pageData[pageResultIndex].getValue({ name: 'custrecord_summary_histjournal'});
                                
                                // Check if intSummaryId already exists in arrSummaryRecords
                                var existingIndex = arrSummaryRecords.findIndex(item => item.recId === intSummaryId);
                                if (existingIndex == -1) {
                                    // If doesn't exist, create a new record
                                    arrSummaryRecords.push({
                                        recId: intSummaryId,
                                        recName: strSummaryName,
                                        recJEId: intJournalEntry,
                                    });
                                }
                            }
                        }
                    }
                }
                log.debug(`searchBGSummaryRecords: arrSummaryRecords ${Object.keys(arrSummaryRecords).length}`, arrSummaryRecords);
                return arrSummaryRecords;
            } catch (err) {
                log.error('searchBGSummaryRecords error', err.message);
            }
        }
        return {getInputData, map, reduce, summarize}

    });
