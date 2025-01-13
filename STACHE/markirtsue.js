/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search'],
    
    (record, search) => {
        
        const afterSubmit = (scriptContext) => {
            log.debug("afterSubmit CONTEXT: ", scriptContext.type);
            try {
                if (scriptContext.type === scriptContext.UserEventType.CREATE || scriptContext.type === scriptContext.UserEventType.EDIT) {
                    let newRecord = scriptContext.newRecord;
                    let recType = newRecord.type
                    let intId = newRecord.id
                    let counter = 0
                    let sublistName = 'item'
                    let blnConCus = true
                    if (newRecord){
                        let intCreatedFromId = newRecord.getValue({
                            fieldId: 'createdfrom',
                        });
                        log.debug("intCreatedFromId", intCreatedFromId)
                        let intEntityId = newRecord.getValue({
                            fieldId: 'entity',
                        });
                        log.debug("intEntityId", intEntityId)
                        if (intCreatedFromId && intEntityId){
                            let objRecord = record.load({
                                type: 'salesorder',
                                id: intCreatedFromId,
                                isDynamic: true,
                            });
                            log.debug("objRecord", objRecord)
                            if (objRecord){
                                try {
                                    fieldLookUp = search.lookupFields({
                                        type: search.Type.ENTITY,
                                        id: intEntityId,
                                        columns: 'custentity_con_inv'
                                    });
                                    log.debug("fieldLookUp",fieldLookUp)
                                    if (fieldLookUp){
                                        blnConCus = fieldLookUp.custentity_con_inv;
                                    }
                                    log.debug("blnConCus", blnConCus)
                                } catch (e) {
                                    log.debug(e.message)
                                }
                                if (!blnConCus){
                                    var numLines = objRecord.getLineCount({
                                        sublistId: sublistName
                                    });
                                    for (var i = 0;  i < numLines; i++) {
                                        let strBillSched = objRecord.getSublistValue({
                                            sublistId: sublistName,
                                            fieldId: 'billingschedule',
                                            line: i
                                        })
                                        log.debug("strBillSched" + i, strBillSched)
                                        if (strBillSched){
                                            counter++
                                        }
                                    }
                                    if (counter > 0){
                                        var recordId = record.submitFields({
                                            type: record.Type.INVOICE,
                                            id: intId,
                                            values: {
                                                custbody6: true // INVOICE READY TO SEND
                                            },
                                        })
                                        log.debug("recordId" + recType, recordId)
                                    }
                                }
                            }
                        }
                    }
                }
                
            } catch (err) {
                log.error('afterSubmit', err.message);
            }
        }

        return {afterSubmit}

    });