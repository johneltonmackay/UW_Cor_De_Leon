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

                    let arrItemPrices = getItemPricing();

                    let numLines = objRecord.getLineCount({
                        sublistId: 'item'
                    });
                    log.debug("afterSubmit numLines", numLines)
                    if (numLines > 0) {
                        for (let i = 0;  i < numLines; i++) {
                            let intRetailPrice = null

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

                            const arrFilteredByID = arrItemPrices.filter(item => parseInt(item.internalId) === parseInt(intItem));

                            log.debug("afterSubmit arrFilteredByID", arrFilteredByID)

                            if (arrFilteredByID.length == 1) {
                                intRetailPrice = arrFilteredByID[0].unitPrice
                            }

                            objRecord.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_retail_price',
                                value: intRetailPrice,
                                line: i
                            });

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

        const getItemPricing = () => {
            let arrItemPrices = [];
            try {
                let objItemSearch = search.create({
                    type: 'item',
                    filters: [
                        // ['internalid', 'anyof', '1042', '4102'],
                        // 'AND',
                        ['pricing.pricelevel', 'anyof', '1'],
                    ],
                    columns: [
                        search.createColumn({ name: 'internalid' }),
                        search.createColumn({ name: 'quantityrange', join: 'pricing' }),
                        search.createColumn({ name: 'unitprice', join: 'pricing' }),
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
                                let qtyRange = pageData[pageResultIndex].getValue({ name: 'quantityrange', join: 'pricing' })
                                if (qtyRange == "1-5"){
                                    arrItemPrices.push({
                                        internalId: pageData[pageResultIndex].getValue({name: 'internalid'}),
                                        unitPrice: pageData[pageResultIndex].getValue({ name: 'unitprice', join: 'pricing' }),
                                    });
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                log.error('getItemPricing', err.message);
            }
            log.debug("getItemPricing", arrItemPrices)

            return arrItemPrices;
        };
        
        return {afterSubmit}

    });
