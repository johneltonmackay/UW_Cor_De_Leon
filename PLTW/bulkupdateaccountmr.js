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
            let arrActiveAccounts = [];
            try {
                let objAccountSearch = search.create({
                    type: 'customer',
                    filters: [
                        [
                          ['address.isdefaultshipping', 'is', 'T'],
                          'AND',
                          ['address.internalid', 'noneof', '@NONE@'],
                        ],
                        'AND',
                        ['isinactive', 'is', 'F'],
                        // 'AND',
                        // ['internalid', 'anyof', '1317144', '1884496', '1972344', '1474728'],
                      ],
                    columns: [
                        search.createColumn({name: 'internalid'}),
                        search.createColumn({name: 'addressinternalid', join: 'Address'}),
                        search.createColumn({name: 'custentity_useentitycodes'}),
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
                                arrActiveAccounts.push({
                                    customerId: pageData[pageResultIndex].getValue({name: 'internalid'}),
                                    addressId: pageData[pageResultIndex].getValue({
                                        name: 'addressinternalid',
                                        join: 'Address'
                                    }),
                                    entityUseCodeId: pageData[pageResultIndex].getValue({name: 'custentity_useentitycodes'}),
                                });
                            }
                        }
                    }
                }
            } catch (err) {
                log.error('searchRecord', err);
            }
            log.debug("getInputData: arrActiveAccounts", arrActiveAccounts)
            return arrActiveAccounts;

        }

        const map = (mapContext) => {
            log.debug('map : mapContext', mapContext);
            let objMapValue = JSON.parse(mapContext.value)
            let intAddressId = objMapValue.addressId
            let intCustomerId = objMapValue.customerId
            let intEntityUseCodeId = objMapValue.entityUseCodeId
            log.debug('intAddressId', intAddressId)
            log.debug('intEntityUseCodeId', intEntityUseCodeId)
            if (intEntityUseCodeId) {
                if (intAddressId){
                    let arrAvaInternalId = searchAVAENTITYUSEMAPPING(intAddressId)
                    if (arrAvaInternalId.length > 0) {
                        let intAvaId = arrAvaInternalId[0].avaInternalId
                        log.debug("intAvaId", intAvaId)
                        loadEntityMapping(intAvaId, intEntityUseCodeId)
                    } else {
                        var rec = record.create({
                            type: 'customrecord_avaentityusemapping_new',
                            isDynamic: true
                        });
    
                        rec.setValue({
                            fieldId: 'custrecord_ava_customerid_new',
                            value: intCustomerId
                        });
    
                        rec.setValue({
                            fieldId: 'custrecord_ava_addressid_new',
                            value: intAddressId
                        });
    
                        rec.setValue({
                            fieldId: 'custrecord_ava_custinternalid',
                            value: intCustomerId
                        });
    
                        rec.setValue({
                            fieldId: 'custrecord_ava_entityusemap_new',
                            value: intEntityUseCodeId
                        });
                        let newEntityMappingId = rec.save();
                        log.debug("newEntityMappingId", newEntityMappingId)
                    }
                }
            }
        }

        const reduce = (reduceContext) => {

        }

        const summarize = (summaryContext) => {

        }

        //PRIVATE FUNCTION

        function searchAVAENTITYUSEMAPPING(intAddressId) {
            let arrAvaInternalId = [];
            try {
                let objAVASearch = search.create({
                    type: 'customrecord_avaentityusemapping_new',
                    filters: [
                        ['custrecord_ava_addressid_new', 'is', intAddressId],
                    ],
                    columns: [
                        search.createColumn({name: 'internalid'}),
                    ],
                });
                var searchResultCount = objAVASearch.runPaged().count;
                if (searchResultCount != 0) {
                    var pagedData = objAVASearch.runPaged({pageSize: 1000});
                    for (var i = 0; i < pagedData.pageRanges.length; i++) {
                        var currentPage = pagedData.fetch(i);
                        var pageData = currentPage.data;
                        if (pageData.length > 0) {
                            for (var pageResultIndex = 0; pageResultIndex < pageData.length; pageResultIndex++) {
                                arrAvaInternalId.push({
                                    avaInternalId: pageData[pageResultIndex].getValue({name: 'internalid'}),
                                });
                            }
                        }
                    }
                }
            } catch (err) {
                log.error('searchRecord', err);
            }
            log.debug("searchAVAENTITYUSEMAPPING: arrAvaInternalId", arrAvaInternalId)
            return arrAvaInternalId;
        }

        function loadEntityMapping(intAvaId, intEntityUseCodeId) {
            log.debug("loadEntityMapping: intAvaId", intAvaId)
            log.debug("loadEntityMapping: intEntityUseCodeId", intEntityUseCodeId)
            if (intAvaId){
                let cusAvaMapRec = record.load({
                    type: 'customrecord_avaentityusemapping_new',
                    id: intAvaId,
                    isDynamic: true,
                });
                if (cusAvaMapRec){
                    cusAvaMapRec.setValue({
                        fieldId: 'custrecord_ava_entityusemap_new',
                        value: intEntityUseCodeId
                    });
                    let avaEntityMapId = cusAvaMapRec.save();
                    log.debug("customAvaEntityRecId updated: " + avaEntityMapId, intEntityUseCodeId)
                    
                }
            }
        }

        return {getInputData, map, reduce, summarize}

    });
