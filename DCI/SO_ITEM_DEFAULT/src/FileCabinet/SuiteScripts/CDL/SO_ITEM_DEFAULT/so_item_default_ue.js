/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/runtime'],
    /**
 * @param{record} record
 * @param{search} search
 */
    (record, search, runtime) => {

        const afterSubmit = (scriptContext) => {
            if (runtime.executionContext !== runtime.ContextType.USER_INTERFACE) {
                let newRecord = scriptContext.newRecord;
                let recType = newRecord.type
                let strId = newRecord.id

                let objRecord = record.load({
                    type: recType,
                    id: strId,
                    isDynamic: true,
                });
    
                if (objRecord){

                    let arrItemData = getItemData();

                    let numLines = objRecord.getLineCount({
                        sublistId: 'item'
                    });
                    log.debug("afterSubmit numLines", numLines)
                    if (numLines > 0) {
                        for (let i = 0;  i < numLines; i++) {
                            objRecord.selectLine({
                                sublistId: 'item',
                                line: i
                            });

                            let intItem = objRecord.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'item',
                                line: i
                            })  

                            log.debug("afterSubmit intItem", intItem)

                            const arrFilteredByID = arrItemData.filter(item => parseInt(item.internalid) === parseInt(intItem));

                            log.debug("afterSubmit arrFilteredByID", arrFilteredByID)

                            if (arrFilteredByID.length == 1) {
                                arrFilteredByID.forEach((data) => {
                                    for (const key in data) {
                                        let fldValue= data[key];
                                        log.debug("afterSubmit fldValue", fldValue)
                                        if (fldValue !== undefined && fldValue !== null && fldValue !== "") {
                                            objRecord.setCurrentSublistValue({
                                                sublistId: 'item',
                                                fieldId: key,
                                                value: fldValue,
                                                line: i
                                            });
                                        }
                                    }
                                });
                            }

                            objRecord.commitLine({
                                sublistId: 'item'
                            });
                        }

                        var recordId = objRecord.save({
                            enableSourcing: true,
                            ignoreMandatoryFields: true
                        });
                        log.debug("afterSubmit recordId" + recType, recordId)
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
        

        return {afterSubmit}

    });
