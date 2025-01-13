/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search'],

    function (record, search) {
        function pageInit(scriptContext) {
            console.log('TEST by JOHN')
        }

        function postSourcing(scriptContext) {
            let arrItemData = []
            var objRecord = scriptContext.currentRecord;
            var sublistId = scriptContext.sublistId;

            if (sublistId == 'item') {
                var itemId = objRecord.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item'
                });

                if (itemId) {
                    arrItemData = getItemData();

                    const arrFilteredByID = arrItemData.filter(item => parseInt(item.internalid) === parseInt(itemId));

                    console.log("postSourcing arrFilteredByID", arrFilteredByID)

                    if (arrFilteredByID.length == 1) {
                        arrFilteredByID.forEach((data) => {
                            for (const key in data) {
                                let fldValue= data[key];
                                console.log("postSourcing fldValue", fldValue)

                                if (fldValue !== undefined && fldValue !== null && fldValue !== "") {
                                    objRecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: key,
                                        value: fldValue,
                                    });
                                }
                            }
                        });
                    }
                }
            }

        }

        const getItemData = () => {
            let arrItemData = [];
            try {
                let objItemSearch = search.create({
                    type: 'item',
                    filters: [],
                    columns: [
                        search.createColumn({ name: 'internalid' }),
                        search.createColumn({ name: 'department'}),
                        search.createColumn({ name: 'custitem_cc_default_revenue_subtype'}),
                        search.createColumn({ name: 'custitem_cseg_npo_program'}),
                    ]
                });
                
                var searchResultCount = objItemSearch.runPaged().count;
                if (searchResultCount != 0) {
                    var pagedData = objItemSearch.runPaged({pageSize: 1000});
                    for (var i = 0; i < pagedData.pageRanges.length; i++) {
                        var currentPage = pagedData.fetch(i);
                        var pageData = currentPage.data;
                        if (pageData.length > 0) {
                            for (var pageResultIndex = 0; pageResultIndex < pageData.length; pageResultIndex++) {
                                arrItemData.push({
                                    internalid: pageData[pageResultIndex].getValue({name: 'internalid'}),
                                    department: pageData[pageResultIndex].getValue({ name: 'department'}),
                                    custcol_cseg_npo_sub_rev: pageData[pageResultIndex].getValue({ name: 'custitem_cc_default_revenue_subtype'}),
                                    custcol_cseg_npo_program: pageData[pageResultIndex].getValue({ name: 'custitem_cseg_npo_program'}),
                                });
                            }
                        }
                    }
                }
            } catch (err) {
                log.error('getItemData', err.message);
            }
            log.debug("getItemData", arrItemData)

            return arrItemData;
        };

        return {
            postSourcing: postSourcing,
            pageInit: pageInit
        };

    });
