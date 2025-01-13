/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search'],
    
    (record, search) => {
        const afterSubmit = (scriptContext) => {
            log.debug("CONTEXT: ", scriptContext.type);
            try {
                if (scriptContext.type === scriptContext.UserEventType.CREATE) {
                    let newRecord = scriptContext.newRecord
                    let recType = newRecord.type
                    let intId = newRecord.id
                    let arrItems = []
                    let sublistName = 'item'
                    let intBillFrequency
                    let objRecord = record.load({
                        type: recType,
                        id: intId,
                        isDynamic: true,
                    });
                    log.debug("objRecord", objRecord)
                    if (objRecord){
                        let intStoreNumId = objRecord.getValue({
                            fieldId: 'custbody_adm_store_num',
                        });
                        let dtStart = objRecord.getValue({
                            fieldId: 'startdate',
                        });
                        let dtEnd = objRecord.getValue({
                            fieldId: 'enddate',
                        });
                        let intEntity = objRecord.getValue({
                            fieldId: 'entity',
                        });
                        if (intStoreNumId){
                            var numLines = objRecord.getLineCount({
                                sublistId: sublistName
                            });
                            for (var i = 0;  i < numLines; i++) {
                                let intItem = objRecord.getSublistValue({
                                    sublistId: sublistName,
                                    fieldId: 'item',
                                    line: i
                                })
                                let intPriceLevel = objRecord.getSublistText({
                                    sublistId: sublistName,
                                    fieldId: 'price_display',
                                    line: i
                                })
                                let intBillSched = objRecord.getSublistValue({
                                    sublistId: sublistName,
                                    fieldId: 'billingschedule',
                                    line: i
                                })
                          
                                let intLineKey = objRecord.getSublistValue({
                                    sublistId: sublistName,
                                    fieldId: 'lineuniquekey',
                                    line: i
                                })
                                if (intBillSched){
                                    try {
                                        fieldLookUp = search.lookupFields({
                                            type: 'billingschedule',
                                            id: intBillSched,
                                            columns: 'frequency'
                                        });
                                        // log.debug("fieldLookUp",fieldLookUp)
                                        if (fieldLookUp){
                                            intBillFrequency = fieldLookUp.frequency[0].text;
                                            arrItems.push({
                                                billSched: intBillFrequency,
                                                priceLevel: intPriceLevel,
                                                item: intItem,
                                                lineKey: intLineKey,
                                                storeNumId: intStoreNumId,
                                                entity: intEntity,
                                                date_start: dtStart,
                                                date_end: dtEnd,
                                                recordid: intId,
                                                recordtype: recType
                                            });
                                        }
                                    } catch (e) {
                                        log.debug(e.message)
                                    }
                                }
                            }   
                        }
                        log.debug("arrItems", arrItems)
                        createRBItems(arrItems)
                    }
                }
                
            } catch (err) {
                log.error('afterSubmit', err.message);
            }
        }
        // Private Function
        const createRBItems = (arrItems) => {
            if (arrItems.length > 0 && arrItems){
                arrItems.forEach(data => {
                    if (data.storeNumId && data.billSched){
                        var objRecord = record.create({
                            type: 'customrecord_str_recurringbill_item',
                            isDynamic: true,
                        });
                        if (objRecord){
                            objRecord.setValue({
                                fieldId: 'custrecord_str_recurrbill_storenumber',
                                value: data.storeNumId
                            });
                            objRecord.setValue({
                                fieldId: 'custrecord_str_recurrbill_item',
                                value: data.item
                            });
                            objRecord.setText({
                                fieldId: 'custrecord_str_recurrbill_pricelevel',
                                text: data.priceLevel
                            });
                            objRecord.setValue({
                                fieldId: 'custrecord_str_recurrbill_customer',
                                value: data.entity
                            });
                            objRecord.setText({
                                fieldId: 'custrecord_str_recurrbill_frequency',
                                text: data.billSched
                            });
                            objRecord.setValue({
                                fieldId: 'custrecord_str_recurrbill_startdate',
                                value: data.date_start
                            });
                            objRecord.setValue({
                                fieldId: 'custrecord_str_recurrbill_enddate',
                                value: data.date_end
                            });
                            objRecord.setValue({
                                fieldId: 'custrecord_str_recurrbill_contractend',
                                value: data.date_end
                            });
                            let recordId = objRecord.save()
                            log.debug("createRBItems recordId", recordId)
                        }
                    }          
                });    
            }
        }
        return {afterSubmit}

    });