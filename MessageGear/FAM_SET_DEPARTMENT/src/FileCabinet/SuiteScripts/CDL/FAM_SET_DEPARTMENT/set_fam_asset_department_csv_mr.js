/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/file', 'N/record', 'N/search', 'N/runtime', 'N/format', 'N/url', 'N/https', 'N/redirect'],
    /**
 * @param{file} file
 * @param{record} record
 * @param{search} search
 */
    (file, record, search, runtime, format, url, https, redirect) => {
  
        const getInputData = (inputContext) => {
            let arrTransaction = [];
            try {
                let objTransactionSearch = search.create({
                    type: 'customrecord_ncfar_asset',
                    filters: [],
                    columns: [
                        search.createColumn({name: 'internalid'}),
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
                                arrTransaction.push({
                                    recId: recId,
                                });
                            }
                        }
                    }
                }
                log.debug(`getInputData: arrTransaction ${Object.keys(arrTransaction).length}`, arrTransaction);
                return arrTransaction;
            } catch (error) {
                log.error('getInputData error', error.message)
            }      
        }
        

        const map = (mapContext) => {
            try {
                log.debug('map : mapContext', mapContext);
                let objMapValue = JSON.parse(mapContext.value)

                let intId = objMapValue.recId

                try {
                    // Load a FAM Asset record
                    var famAsset = record.load({
                        type: 'customrecord_ncfar_asset',
                        id: intId,
                        isDynamic: true
                    });

                    // 110 - General & Admin (GA)
                    famAsset.setValue({ fieldId: 'custrecord_assetdepartment', value: 5 });
                    
                    // Save the record
                    var famAssetId = famAsset.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    });

                    log.debug('FAM ASSET update', 'FAM ASSET ID: ' + famAssetId);
                    return famAssetId;
                } catch (e) {
                    log.error('Error updating AM ASSET', e);
                }


            } catch (error) {
                log.error('map error', error.message)
            }
        }

        const reduce = (reduceContext) => {

        }

        const summarize = (summaryContext) => {
          
        }

        return {getInputData, map, reduce, summarize}

    });




