/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record'],
    /**
 * @param{record} record
 */
    (record) => {

        const afterSubmit = (scriptContext) => {
            log.debug('scriptContext.type', scriptContext.type)
            if (scriptContext.type === scriptContext.UserEventType.CREATE) {
                let arrData = []
                const newRecord = scriptContext.newRecord
                const objCurrentRecord = record.load({
                    type: newRecord.type,
                    id: newRecord.id,
                    isDynamic: true
                })
                if(objCurrentRecord){
                    let lineCount = objCurrentRecord.getLineCount({ sublistId: 'item' });
                    if(lineCount > 0){
                        for (let i = 0; i < lineCount; i++) {
                            let arrLinkedId = objCurrentRecord.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'linkedorder',
                                line: i
                            });
                            log.debug('afterSubmit arrLinkedId', arrLinkedId)
                            if (arrLinkedId.length > 0) {
                                arrLinkedId.forEach(id => {
                                    if (!arrData.includes(id)) {
                                        arrData.push(id);
                                    }
                                });
                            }
                        }
                        if(arrData.length > 0){
                            updateRequisition(arrData)
                        }
                    }
                }
            }
        }

        // Private Function

        const updateRequisition = (arrData) => {
            arrData.forEach(id => {
                const objCurrentRecord = record.load({
                    type: 'purchaserequisition',
                    id: id,
                    isDynamic: true
                })
                if(objCurrentRecord){
                    let lineCount = objCurrentRecord.getLineCount({ sublistId: 'item' });
                    if(lineCount > 0){
                        for (let i = 0; i < lineCount; i++) {
                            let arrLinkedId = objCurrentRecord.getSublistText({
                                sublistId: 'item',
                                fieldId: 'linkedorder',
                                line: i
                            });
                            log.debug('afterSubmit arrLinkedId', arrLinkedId)
                            if(arrLinkedId.length > 0){
                                objCurrentRecord.selectLine({
                                    sublistId: 'item',
                                    line: i
                                });
                                let resultsString = arrLinkedId.join(", ");
                                objCurrentRecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_ai_linked_order',
                                    value: resultsString,
                                    line: i
                                });
                                objCurrentRecord.commitLine({ sublistId: 'item' });
                            }
                        }
                        let recId = objCurrentRecord.save({
                            enableSourcing: true,
                            ignoreMandatoryFields: true
                        })
                        log.debug('afterSubmit recordId', recId);
                    }
                }
            });
            
        }

        return {afterSubmit}

    });
